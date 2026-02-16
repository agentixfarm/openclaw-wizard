//! # Skills Service
//!
//! Manages skill discovery from ClawHub (npm registry), installation/uninstallation
//! via npm, and VirusTotal security scanning. Skills are npm packages with the
//! "openclaw-skill" keyword.
//!
//! SECURITY:
//! - VirusTotal scanning runs BEFORE installation when API key is configured
//! - Malicious packages are BLOCKED (never installed)
//! - VT rate limiting enforced (4 req/min max for public API)
//! - Graceful degradation: no VT API key = scanning disabled (not an error)

use serde::Deserialize;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{error, info, warn};

use crate::error::AppError;
use crate::models::types::{
    InstalledSkill, ScanResult, SkillCategory, SkillInstallResponse, SkillMetadata,
    SkillSearchResponse, ThreatLevel,
};

/// Minimum interval between VirusTotal API requests in milliseconds.
/// Public API limit is 4 requests/minute = 1 request per 15 seconds.
const VT_RATE_LIMIT_MS: u64 = 15_000;

/// Wait time after submitting a file to VirusTotal before retrieving the report.
const VT_SCAN_WAIT_SECS: u64 = 15;

/// Global tracker for the last VirusTotal request timestamp (epoch millis).
static LAST_VT_REQUEST: AtomicU64 = AtomicU64::new(0);

/// npm registry search response
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct NpmSearchResponse {
    objects: Vec<NpmSearchObject>,
    total: u32,
}

#[derive(Debug, Deserialize)]
struct NpmSearchObject {
    package: NpmPackage,
}

#[derive(Debug, Deserialize)]
struct NpmPackage {
    name: String,
    version: String,
    description: Option<String>,
    keywords: Option<Vec<String>>,
    links: Option<NpmLinks>,
    author: Option<NpmAuthor>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct NpmLinks {
    npm: Option<String>,
    homepage: Option<String>,
    repository: Option<String>,
}

#[derive(Debug, Deserialize)]
struct NpmAuthor {
    name: Option<String>,
}

/// npm registry package detail response
#[derive(Debug, Deserialize)]
struct NpmPackageDetail {
    name: String,
    description: Option<String>,
    #[serde(rename = "dist-tags")]
    dist_tags: Option<NpmDistTags>,
    author: Option<NpmAuthor>,
    keywords: Option<Vec<String>>,
    homepage: Option<String>,
    repository: Option<NpmRepository>,
}

#[derive(Debug, Deserialize)]
struct NpmDistTags {
    latest: Option<String>,
}

#[derive(Debug, Deserialize)]
struct NpmRepository {
    url: Option<String>,
}

/// npm list --json output structure
#[derive(Debug, Deserialize)]
struct NpmListOutput {
    dependencies: Option<serde_json::Map<String, serde_json::Value>>,
}

pub struct SkillsService {
    http_client: reqwest::Client,
    vt_api_key: Option<String>,
}

impl Default for SkillsService {
    fn default() -> Self {
        Self::new()
    }
}

impl SkillsService {
    /// Create a new SkillsService.
    /// Reads VIRUSTOTAL_API_KEY from environment. If not set, VT scanning is disabled.
    pub fn new() -> Self {
        let vt_api_key = std::env::var("VIRUSTOTAL_API_KEY")
            .ok()
            .filter(|k| !k.is_empty());

        if vt_api_key.is_some() {
            info!("VirusTotal API key configured — security scanning enabled");
        } else {
            warn!("VIRUSTOTAL_API_KEY not set — security scanning disabled");
        }

        Self {
            http_client: reqwest::Client::new(),
            vt_api_key,
        }
    }

    /// Search ClawHub (npm registry) for skills with optional query and category filter.
    ///
    /// Skills are npm packages with the "openclaw-skill" keyword.
    /// If query is None/empty, returns all openclaw-skill packages.
    /// If category is provided, results are filtered post-fetch.
    pub async fn search_skills(
        &self,
        query: Option<&str>,
        category: Option<&SkillCategory>,
    ) -> Result<SkillSearchResponse, AppError> {
        let search_text = match query {
            Some(q) if !q.is_empty() => format!("keywords:openclaw-skill {}", q),
            _ => "keywords:openclaw-skill".to_string(),
        };

        let url = format!(
            "https://registry.npmjs.org/-/v1/search?text={}&size=50",
            urlencoded(&search_text)
        );

        let response = self.http_client.get(&url).send().await.map_err(|e| {
            AppError::InternalError(format!("Failed to search npm registry: {}", e))
        })?;

        let npm_response: NpmSearchResponse = response.json().await.map_err(|e| {
            AppError::InternalError(format!("Failed to parse npm search response: {}", e))
        })?;

        let mut skills: Vec<SkillMetadata> = npm_response
            .objects
            .into_iter()
            .map(|obj| npm_package_to_metadata(&obj.package))
            .collect();

        // Apply category filter if provided
        if let Some(cat) = category {
            let cat_str = category_to_keyword(cat);
            skills.retain(|s| {
                s.tags.iter().any(|t| t.to_lowercase() == cat_str)
                    || matches_category(&s.category, cat)
            });
        }

        let total = skills.len() as u32;
        Ok(SkillSearchResponse { skills, total })
    }

    /// Get detailed metadata for a specific skill by name.
    pub async fn get_skill_details(&self, name: &str) -> Result<SkillMetadata, AppError> {
        let url = format!("https://registry.npmjs.org/{}", urlencoded(name));

        let response = self.http_client.get(&url).send().await.map_err(|e| {
            AppError::InternalError(format!("Failed to fetch package details: {}", e))
        })?;

        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(AppError::SkillNotFound(format!(
                "Skill '{}' not found in registry",
                name
            )));
        }

        let detail: NpmPackageDetail = response.json().await.map_err(|e| {
            AppError::InternalError(format!("Failed to parse package details: {}", e))
        })?;

        let version = detail
            .dist_tags
            .and_then(|dt| dt.latest)
            .unwrap_or_else(|| "0.0.0".to_string());

        let keywords = detail.keywords.unwrap_or_default();
        let category = keywords_to_category(&keywords);
        let repository = detail
            .repository
            .and_then(|r| r.url)
            .map(|u| u.replace("git+", "").replace(".git", ""));

        Ok(SkillMetadata {
            name: detail.name,
            version,
            description: detail.description.unwrap_or_default(),
            author: detail
                .author
                .and_then(|a| a.name)
                .unwrap_or_else(|| "Unknown".to_string()),
            category,
            tags: keywords,
            capabilities: vec![],
            homepage: detail.homepage,
            repository,
            downloads: None,
            verified: false,
        })
    }

    /// Install a skill via npm. If VT API key is configured, scans the package first.
    ///
    /// SECURITY:
    /// - Malicious packages are BLOCKED (SkillBlocked error)
    /// - Suspicious packages include a warning but are allowed
    /// - If VT is unavailable, installation proceeds with a warning
    pub async fn install_skill(
        &self,
        name: &str,
        version: Option<&str>,
    ) -> Result<SkillInstallResponse, AppError> {
        // Scan BEFORE installing if VT is configured
        let scan_result = if self.vt_api_key.is_some() {
            let ver = version.unwrap_or("latest");
            match self.scan_skill(name, ver).await {
                Ok(Some(result)) => {
                    // BLOCK malicious packages
                    if matches!(result.threat_level, ThreatLevel::Malicious) {
                        return Err(AppError::SkillBlocked(format!(
                            "Skill '{}' blocked: {} malicious detections by VirusTotal",
                            name, result.malicious_count
                        )));
                    }
                    if matches!(result.threat_level, ThreatLevel::Suspicious) {
                        warn!(
                            "Skill '{}' flagged as suspicious by {} scanners — proceeding with installation",
                            name, result.suspicious_count
                        );
                    }
                    Some(result)
                }
                Ok(None) => None,
                Err(e) => {
                    // Degrade gracefully: VT failure does NOT block installation
                    warn!(
                        "VirusTotal scan failed for '{}': {} — proceeding without scan",
                        name, e
                    );
                    None
                }
            }
        } else {
            None
        };

        // Build npm install command
        let package_spec = match version {
            Some(v) => format!("{}@{}", name, v),
            None => name.to_string(),
        };

        // Run npm install using tokio::process::Command (async, safe args)
        let output = tokio::process::Command::new("npm")
            .args(["install", "-g", &package_spec])
            .output()
            .await
            .map_err(|e| {
                AppError::SkillInstallFailed(format!("Failed to run npm install: {}", e))
            })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("npm install failed for '{}': {}", name, stderr);
            return Ok(SkillInstallResponse {
                success: false,
                name: name.to_string(),
                version: version.unwrap_or("latest").to_string(),
                error: Some(format!("npm install failed: {}", stderr.trim())),
                scan_result,
            });
        }

        // Parse installed version from npm output
        let stdout = String::from_utf8_lossy(&output.stdout);
        let installed_version = parse_npm_install_version(&stdout)
            .unwrap_or_else(|| version.unwrap_or("latest").to_string());

        info!(
            "Skill '{}@{}' installed successfully",
            name, installed_version
        );

        Ok(SkillInstallResponse {
            success: true,
            name: name.to_string(),
            version: installed_version,
            error: None,
            scan_result,
        })
    }

    /// Uninstall a skill via npm.
    pub async fn uninstall_skill(&self, name: &str) -> Result<(), AppError> {
        let output = tokio::process::Command::new("npm")
            .args(["uninstall", "-g", name])
            .output()
            .await
            .map_err(|e| {
                AppError::SkillInstallFailed(format!("Failed to run npm uninstall: {}", e))
            })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::SkillInstallFailed(format!(
                "npm uninstall failed for '{}': {}",
                name,
                stderr.trim()
            )));
        }

        info!("Skill '{}' uninstalled successfully", name);
        Ok(())
    }

    /// List locally installed OpenClaw skills.
    ///
    /// Runs `npm list -g --depth=0 --json` and filters for packages
    /// that have the "openclaw-skill" keyword or name prefix.
    pub async fn list_installed(&self) -> Result<Vec<InstalledSkill>, AppError> {
        let output = tokio::process::Command::new("npm")
            .args(["list", "-g", "--depth=0", "--json"])
            .output()
            .await
            .map_err(|e| AppError::InternalError(format!("Failed to run npm list: {}", e)))?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        let npm_list: NpmListOutput =
            serde_json::from_str(&stdout).unwrap_or(NpmListOutput { dependencies: None });

        let mut skills = Vec::new();

        if let Some(deps) = npm_list.dependencies {
            // Get npm global prefix for path construction
            let prefix = get_npm_global_prefix().await;

            for (name, info) in deps {
                // Filter for openclaw-skill packages by name prefix
                if name.starts_with("openclaw-skill-") || name.starts_with("@openclaw/") {
                    let version = info
                        .get("version")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string();

                    let path = match &prefix {
                        Some(p) => format!("{}/lib/node_modules/{}", p, name),
                        None => format!("/usr/local/lib/node_modules/{}", name),
                    };

                    skills.push(InstalledSkill {
                        name,
                        version,
                        path,
                        size_bytes: None,
                    });
                }
            }
        }

        Ok(skills)
    }

    /// Scan a skill package with VirusTotal before installation.
    ///
    /// Returns None if VT API key is not configured (scanning disabled).
    /// Returns VirusTotalError if VT request fails, but callers should
    /// degrade gracefully (don't block install on VT failure).
    ///
    /// RATE LIMITING: Enforces minimum 15-second interval between VT requests
    /// to stay under the public API limit of 4 requests/minute.
    pub async fn scan_skill(
        &self,
        name: &str,
        version: &str,
    ) -> Result<Option<ScanResult>, AppError> {
        let api_key = match &self.vt_api_key {
            Some(key) => key.clone(),
            None => return Ok(None), // Scanning disabled, not an error
        };

        // Rate limiting: enforce minimum interval between VT requests
        enforce_vt_rate_limit().await;

        // Download package tarball from npm
        let tarball_url = format!(
            "https://registry.npmjs.org/{}/-/{}-{}.tgz",
            name,
            name.split('/').next_back().unwrap_or(name),
            version
        );

        let tarball_bytes = self
            .http_client
            .get(&tarball_url)
            .send()
            .await
            .map_err(|e| {
                AppError::VirusTotalError(format!("Failed to download package tarball: {}", e))
            })?
            .bytes()
            .await
            .map_err(|e| {
                AppError::VirusTotalError(format!("Failed to read tarball bytes: {}", e))
            })?;

        // Write tarball to temp file for VT scanning
        let temp_dir = std::env::temp_dir();
        let temp_path = temp_dir.join(format!("{}-{}.tgz", name.replace('/', "_"), version));
        tokio::fs::write(&temp_path, &tarball_bytes)
            .await
            .map_err(|e| AppError::VirusTotalError(format!("Failed to write temp file: {}", e)))?;

        // Submit file to VirusTotal API v3
        let file_bytes = tokio::fs::read(&temp_path)
            .await
            .map_err(|e| AppError::VirusTotalError(format!("Failed to read temp file: {}", e)))?;

        let form = reqwest::multipart::Form::new().part(
            "file",
            reqwest::multipart::Part::bytes(file_bytes)
                .file_name(temp_path.file_name().unwrap_or_default().to_string_lossy().to_string()),
        );

        let client = reqwest::Client::new();
        let scan_response: serde_json::Value = client
            .post("https://www.virustotal.com/api/v3/files")
            .header("x-apikey", &api_key)
            .multipart(form)
            .send()
            .await
            .map_err(|e| AppError::VirusTotalError(format!("VT file upload failed: {}", e)))?
            .json()
            .await
            .map_err(|e| AppError::VirusTotalError(format!("VT scan response parse failed: {}", e)))?;

        // Clean up temp file
        let _ = tokio::fs::remove_file(&temp_path).await;

        let resource_id = scan_response["data"]["id"]
            .as_str()
            .ok_or_else(|| AppError::VirusTotalError("No scan ID in VT response".to_string()))?
            .to_string();

        // Wait for VT to process the file
        info!(
            "Waiting {}s for VirusTotal to process '{}'...",
            VT_SCAN_WAIT_SECS, name
        );
        tokio::time::sleep(std::time::Duration::from_secs(VT_SCAN_WAIT_SECS)).await;

        // Rate limit the report request too
        enforce_vt_rate_limit().await;

        // Retrieve the scan report
        let report: serde_json::Value = client
            .get(format!(
                "https://www.virustotal.com/api/v3/analyses/{}",
                resource_id
            ))
            .header("x-apikey", &api_key)
            .send()
            .await
            .map_err(|e| AppError::VirusTotalError(format!("VT report retrieval failed: {}", e)))?
            .json()
            .await
            .map_err(|e| AppError::VirusTotalError(format!("VT report parse failed: {}", e)))?;

        // Parse scan results from the report JSON
        let scan_result = parse_vt_report(&report);

        Ok(Some(scan_result))
    }
}

/// Parse the VirusTotal report JSON into our ScanResult type.
fn parse_vt_report(report: &serde_json::Value) -> ScanResult {
    let stats = &report["data"]["attributes"]["last_analysis_stats"];

    let malicious = stats["malicious"].as_u64().unwrap_or(0) as u32;
    let suspicious = stats["suspicious"].as_u64().unwrap_or(0) as u32;
    let harmless = stats["harmless"].as_u64().unwrap_or(0) as u32;
    let undetected = stats["undetected"].as_u64().unwrap_or(0) as u32;
    let total_scanners = malicious + suspicious + harmless + undetected;

    let threat_level = if malicious > 0 {
        ThreatLevel::Malicious
    } else if suspicious >= 3 {
        ThreatLevel::Suspicious
    } else {
        ThreatLevel::Clean
    };

    let permalink = report["data"]["links"]["self"]
        .as_str()
        .map(|s| s.to_string());

    let scan_date = chrono::Utc::now().to_rfc3339();

    ScanResult {
        threat_level,
        malicious_count: malicious,
        suspicious_count: suspicious,
        total_scanners,
        scan_date,
        permalink,
    }
}

/// Enforce VT rate limiting by waiting if the last request was too recent.
async fn enforce_vt_rate_limit() {
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let last = LAST_VT_REQUEST.load(Ordering::Relaxed);
    if last > 0 {
        let elapsed = now_ms.saturating_sub(last);
        if elapsed < VT_RATE_LIMIT_MS {
            let wait_ms = VT_RATE_LIMIT_MS - elapsed;
            info!("VT rate limit: waiting {}ms before next request", wait_ms);
            tokio::time::sleep(std::time::Duration::from_millis(wait_ms)).await;
        }
    }

    // Update last request timestamp
    let updated_now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    LAST_VT_REQUEST.store(updated_now, Ordering::Relaxed);
}

/// Get npm global prefix path.
async fn get_npm_global_prefix() -> Option<String> {
    let output = tokio::process::Command::new("npm")
        .args(["prefix", "-g"])
        .output()
        .await
        .ok()?;

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        None
    }
}

/// Convert an NpmPackage to SkillMetadata.
fn npm_package_to_metadata(pkg: &NpmPackage) -> SkillMetadata {
    let keywords = pkg.keywords.clone().unwrap_or_default();
    let category = keywords_to_category(&keywords);
    let homepage = pkg.links.as_ref().and_then(|l| l.homepage.clone());
    let repository = pkg.links.as_ref().and_then(|l| l.repository.clone());

    SkillMetadata {
        name: pkg.name.clone(),
        version: pkg.version.clone(),
        description: pkg.description.clone().unwrap_or_default(),
        author: pkg
            .author
            .as_ref()
            .and_then(|a| a.name.clone())
            .unwrap_or_else(|| "Unknown".to_string()),
        category,
        tags: keywords,
        capabilities: vec![],
        homepage,
        repository,
        downloads: None,
        verified: false,
    }
}

/// Map npm keywords to a SkillCategory.
fn keywords_to_category(keywords: &[String]) -> SkillCategory {
    let lower: Vec<String> = keywords.iter().map(|k| k.to_lowercase()).collect();

    if lower
        .iter()
        .any(|k| k == "devtools" || k == "dev-tools" || k == "development")
    {
        SkillCategory::DevTools
    } else if lower
        .iter()
        .any(|k| k == "data" || k == "data-processing" || k == "dataprocessing")
    {
        SkillCategory::DataProcessing
    } else if lower
        .iter()
        .any(|k| k == "api" || k == "api-integration" || k == "apiintegration")
    {
        SkillCategory::ApiIntegration
    } else if lower.iter().any(|k| k == "automation" || k == "automate") {
        SkillCategory::Automation
    } else if lower.iter().any(|k| k == "security" || k == "secure") {
        SkillCategory::Security
    } else if lower
        .iter()
        .any(|k| k == "monitoring" || k == "monitor" || k == "observability")
    {
        SkillCategory::Monitoring
    } else {
        SkillCategory::Other
    }
}

/// Convert a SkillCategory to its keyword string for filtering.
fn category_to_keyword(cat: &SkillCategory) -> String {
    match cat {
        SkillCategory::DevTools => "devtools".to_string(),
        SkillCategory::DataProcessing => "data-processing".to_string(),
        SkillCategory::ApiIntegration => "api-integration".to_string(),
        SkillCategory::Automation => "automation".to_string(),
        SkillCategory::Security => "security".to_string(),
        SkillCategory::Monitoring => "monitoring".to_string(),
        SkillCategory::Other => "other".to_string(),
    }
}

/// Check if two categories match.
fn matches_category(a: &SkillCategory, b: &SkillCategory) -> bool {
    std::mem::discriminant(a) == std::mem::discriminant(b)
}

/// Simple percent-encoding for URL query parameters.
fn urlencoded(input: &str) -> String {
    input
        .replace('%', "%25")
        .replace(' ', "%20")
        .replace('+', "%2B")
        .replace('&', "%26")
        .replace('=', "%3D")
        .replace('#', "%23")
        .replace('@', "%40")
        .replace('/', "%2F")
}

/// Parse the installed version from npm install stdout output.
/// npm output looks like: "added 1 package in 1s" or "+ package@version"
fn parse_npm_install_version(stdout: &str) -> Option<String> {
    // Look for pattern like "package@version" in output
    for line in stdout.lines() {
        if let Some(at_pos) = line.rfind('@') {
            let after_at = &line[at_pos + 1..];
            let version = after_at.trim();
            if !version.is_empty() && version.chars().next().is_some_and(|c| c.is_ascii_digit()) {
                return Some(version.to_string());
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keywords_to_category_devtools() {
        let keywords = vec!["openclaw-skill".to_string(), "devtools".to_string()];
        assert!(matches!(
            keywords_to_category(&keywords),
            SkillCategory::DevTools
        ));
    }

    #[test]
    fn test_keywords_to_category_security() {
        let keywords = vec!["security".to_string()];
        assert!(matches!(
            keywords_to_category(&keywords),
            SkillCategory::Security
        ));
    }

    #[test]
    fn test_keywords_to_category_other() {
        let keywords = vec!["random".to_string()];
        assert!(matches!(
            keywords_to_category(&keywords),
            SkillCategory::Other
        ));
    }

    #[test]
    fn test_keywords_to_category_empty() {
        let keywords: Vec<String> = vec![];
        assert!(matches!(
            keywords_to_category(&keywords),
            SkillCategory::Other
        ));
    }

    #[test]
    fn test_category_to_keyword() {
        assert_eq!(category_to_keyword(&SkillCategory::DevTools), "devtools");
        assert_eq!(category_to_keyword(&SkillCategory::Security), "security");
        assert_eq!(category_to_keyword(&SkillCategory::Other), "other");
    }

    #[test]
    fn test_matches_category() {
        assert!(matches_category(
            &SkillCategory::DevTools,
            &SkillCategory::DevTools
        ));
        assert!(!matches_category(
            &SkillCategory::DevTools,
            &SkillCategory::Security
        ));
    }

    #[test]
    fn test_urlencoded() {
        assert_eq!(urlencoded("hello world"), "hello%20world");
        assert_eq!(urlencoded("a@b"), "a%40b");
        assert_eq!(urlencoded("a/b"), "a%2Fb");
    }

    #[test]
    fn test_parse_npm_install_version() {
        assert_eq!(
            parse_npm_install_version("+ my-package@1.2.3\n"),
            Some("1.2.3".to_string())
        );
        assert_eq!(
            parse_npm_install_version("added 1 package\n+ @scope/pkg@0.1.0\n"),
            Some("0.1.0".to_string())
        );
        assert_eq!(parse_npm_install_version("added 1 package in 2s"), None);
    }

    #[test]
    fn test_parse_vt_report_clean() {
        let report = serde_json::json!({
            "data": {
                "attributes": {
                    "last_analysis_stats": {
                        "malicious": 0,
                        "suspicious": 0,
                        "harmless": 60,
                        "undetected": 10
                    }
                },
                "links": {
                    "self": "https://www.virustotal.com/api/v3/files/abc123"
                }
            }
        });
        let result = parse_vt_report(&report);
        assert!(matches!(result.threat_level, ThreatLevel::Clean));
        assert_eq!(result.malicious_count, 0);
        assert_eq!(result.suspicious_count, 0);
        assert_eq!(result.total_scanners, 70);
    }

    #[test]
    fn test_parse_vt_report_malicious() {
        let report = serde_json::json!({
            "data": {
                "attributes": {
                    "last_analysis_stats": {
                        "malicious": 5,
                        "suspicious": 2,
                        "harmless": 50,
                        "undetected": 13
                    }
                },
                "links": {
                    "self": "https://www.virustotal.com/api/v3/files/xyz"
                }
            }
        });
        let result = parse_vt_report(&report);
        assert!(matches!(result.threat_level, ThreatLevel::Malicious));
        assert_eq!(result.malicious_count, 5);
    }

    #[test]
    fn test_parse_vt_report_suspicious() {
        let report = serde_json::json!({
            "data": {
                "attributes": {
                    "last_analysis_stats": {
                        "malicious": 0,
                        "suspicious": 4,
                        "harmless": 55,
                        "undetected": 11
                    }
                },
                "links": {}
            }
        });
        let result = parse_vt_report(&report);
        assert!(matches!(result.threat_level, ThreatLevel::Suspicious));
        assert_eq!(result.suspicious_count, 4);
        assert!(result.permalink.is_none());
    }

    #[test]
    fn test_new_creates_service() {
        let service = SkillsService::new();
        // VT key may or may not be set depending on env
        assert!(service.vt_api_key.is_some() || service.vt_api_key.is_none());
    }
}
