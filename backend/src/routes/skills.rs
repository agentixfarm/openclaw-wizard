//! # Skills Management Routes
//!
//! REST endpoints for skills discovery, installation, and security scanning:
//! - GET    /api/skills/search    - Search ClawHub for skills
//! - GET    /api/skills/installed - List locally installed skills
//! - POST   /api/skills/install   - Install a skill (with optional VT scan)
//! - POST   /api/skills/scan      - Scan a skill package with VirusTotal
//! - GET    /api/skills/{name}    - Get skill details
//! - DELETE /api/skills/{name}    - Uninstall a skill
//!
//! IMPORTANT: Literal routes (search, installed) must be registered BEFORE
//! the {name} parameter route to avoid path capture conflicts.
//!
//! SECURITY:
//! - VT scan runs before install when API key is configured
//! - Malicious packages return 403 Forbidden
//! - VT not configured returns None (not an error)

use axum::Json;
use axum::extract::{Path, Query};
use serde::Deserialize;

use crate::error::AppError;
use crate::models::types::{
    ApiResponse, EmptyResponse, InstalledSkill, ScanRequest, ScanResult, SkillInstallRequest,
    SkillInstallResponse, SkillMetadata, SkillSearchResponse,
};
use crate::services::SkillsService;

/// Query parameters for skill search endpoint.
#[derive(Debug, Deserialize)]
pub struct SkillSearchQuery {
    /// Search query text (optional — empty returns all)
    pub q: Option<String>,
    /// Category filter (optional)
    pub category: Option<String>,
}

/// GET /api/skills/search
///
/// Search ClawHub (npm registry) for OpenClaw skills.
/// Query params: q (optional text), category (optional filter).
/// Returns matching skills with metadata.
pub async fn search_skills(
    Query(query): Query<SkillSearchQuery>,
) -> Result<Json<ApiResponse<SkillSearchResponse>>, AppError> {
    let service = SkillsService::new();

    let category = query.category.as_deref().and_then(parse_category);

    let response = service
        .search_skills(query.q.as_deref(), category.as_ref())
        .await?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(response),
        error: None,
    }))
}

/// GET /api/skills/{name}
///
/// Get detailed metadata for a specific skill.
/// Path param: skill name (URL-encoded for scoped packages like @openclaw/skill-name).
pub async fn skill_details(
    Path(name): Path<String>,
) -> Result<Json<ApiResponse<SkillMetadata>>, AppError> {
    let service = SkillsService::new();

    let metadata = service.get_skill_details(&name).await?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(metadata),
        error: None,
    }))
}

/// POST /api/skills/install
///
/// Install a skill via npm. If VirusTotal API key is configured,
/// the package is scanned before installation.
///
/// Returns 403 if VirusTotal detects the package as malicious.
/// Returns install result with optional scan result.
pub async fn install_skill(
    Json(request): Json<SkillInstallRequest>,
) -> Result<Json<SkillInstallResponse>, AppError> {
    let service = SkillsService::new();

    let response = service
        .install_skill(&request.name, request.version.as_deref())
        .await?;

    Ok(Json(response))
}

/// DELETE /api/skills/{name}
///
/// Uninstall a skill via npm.
pub async fn uninstall_skill(Path(name): Path<String>) -> Result<Json<EmptyResponse>, AppError> {
    let service = SkillsService::new();

    service.uninstall_skill(&name).await?;

    Ok(Json(EmptyResponse {
        success: true,
        error: None,
    }))
}

/// GET /api/skills/installed
///
/// List all locally installed OpenClaw skills.
/// Filters npm global packages for those with openclaw-skill keyword.
pub async fn list_installed() -> Result<Json<ApiResponse<Vec<InstalledSkill>>>, AppError> {
    let service = SkillsService::new();

    let skills = service.list_installed().await?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(skills),
        error: None,
    }))
}

/// POST /api/skills/scan
///
/// Scan a skill package with VirusTotal.
/// Returns None if VT API key is not configured (not an error).
pub async fn scan_skill(
    Json(request): Json<ScanRequest>,
) -> Result<Json<ApiResponse<Option<ScanResult>>>, AppError> {
    let service = SkillsService::new();

    let result = service
        .scan_skill(&request.skill_name, &request.version)
        .await?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(result),
        error: None,
    }))
}

/// Parse a category string into a SkillCategory enum value.
fn parse_category(s: &str) -> Option<crate::models::types::SkillCategory> {
    use crate::models::types::SkillCategory;
    match s.to_lowercase().as_str() {
        "devtools" | "dev-tools" => Some(SkillCategory::DevTools),
        "dataprocessing" | "data-processing" => Some(SkillCategory::DataProcessing),
        "apiintegration" | "api-integration" => Some(SkillCategory::ApiIntegration),
        "automation" => Some(SkillCategory::Automation),
        "security" => Some(SkillCategory::Security),
        "monitoring" => Some(SkillCategory::Monitoring),
        "other" => Some(SkillCategory::Other),
        _ => None,
    }
}
