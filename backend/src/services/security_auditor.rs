//! # Security Auditor - Deterministic Security Checks
//!
//! Performs 8 rule-based security checks against the user's OpenClaw
//! configuration. No AI needed — all checks are deterministic.

use crate::models::types::{SecurityAudit, SecurityFinding};
use crate::services::config::ConfigWriter;
use anyhow::Result;
use std::path::PathBuf;

pub struct SecurityAuditor;

impl SecurityAuditor {
    /// Run all 8 security checks against the user's OpenClaw config
    ///
    /// Returns a SecurityAudit with findings, counts, and overall score.
    pub fn audit() -> Result<SecurityAudit> {
        let home = std::env::var("HOME")
            .map_err(|_| anyhow::anyhow!("HOME environment variable not set"))?;
        let config_path = PathBuf::from(format!("{}/.openclaw/openclaw.json", home));

        let config: serde_json::Value =
            ConfigWriter::read_json(&config_path).unwrap_or_else(|_| serde_json::json!({}));

        Self::audit_config(&config)
    }

    /// Run security audit against a provided config value (for testing)
    pub fn audit_config(config: &serde_json::Value) -> Result<SecurityAudit> {
        let mut findings = Vec::new();

        Self::check_api_key_in_config(config, &mut findings);
        Self::check_gateway_bind(config, &mut findings);
        Self::check_auth_mode(config, &mut findings);
        Self::check_tailscale(config, &mut findings);
        Self::check_channel_allowlists(config, &mut findings);
        Self::check_docker_socket(config, &mut findings);
        Self::check_weak_credentials(config, &mut findings);
        Self::check_config_permissions(&mut findings);

        let critical_count = findings.iter().filter(|f| f.severity == "critical").count() as u32;
        let warning_count = findings.iter().filter(|f| f.severity == "warning").count() as u32;

        let overall_score = if critical_count > 0 {
            "critical".to_string()
        } else if warning_count > 0 {
            "warnings".to_string()
        } else {
            "secure".to_string()
        };

        let audit_date = chrono::Utc::now().to_rfc3339();

        Ok(SecurityAudit {
            findings,
            overall_score,
            critical_count,
            warning_count,
            audit_date,
        })
    }

    /// SEC-001: Check for API keys stored in config file
    fn check_api_key_in_config(config: &serde_json::Value, findings: &mut Vec<SecurityFinding>) {
        let key_fields = [
            ("apiKey", config.get("apiKey")),
            ("api_key", config.get("api_key")),
            (
                "ai.apiKey",
                config.get("ai").and_then(|ai| ai.get("apiKey")),
            ),
            (
                "ai.api_key",
                config.get("ai").and_then(|ai| ai.get("api_key")),
            ),
        ];

        for (field, value) in &key_fields {
            if let Some(v) = value
                && let Some(key) = v.as_str()
                && key.starts_with("sk-")
            {
                findings.push(SecurityFinding {
                    id: "SEC-001".to_string(),
                    severity: "warning".to_string(),
                    title: "API key stored in config file".to_string(),
                    description: format!(
                        "An API key starting with 'sk-' was found in the '{}' field. \
                         Storing API keys in config files increases exposure risk.",
                        field
                    ),
                    affected_field: field.to_string(),
                    fix_suggestion: Some(
                        "Move API key to ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable"
                            .to_string(),
                    ),
                });
                return; // Only report once
            }
        }
    }

    /// SEC-002: Check gateway bind address
    fn check_gateway_bind(config: &serde_json::Value, findings: &mut Vec<SecurityFinding>) {
        let bind = config
            .get("gateway")
            .and_then(|g| g.get("bind"))
            .and_then(|b| b.as_str())
            .unwrap_or("127.0.0.1");

        if bind == "0.0.0.0" {
            let auth_mode = config
                .get("gateway")
                .and_then(|g| g.get("auth_mode"))
                .or_else(|| config.get("auth").and_then(|a| a.get("mode")))
                .and_then(|m| m.as_str())
                .unwrap_or("none");

            if auth_mode == "none" {
                findings.push(SecurityFinding {
                    id: "SEC-002".to_string(),
                    severity: "critical".to_string(),
                    title: "Gateway exposed to all interfaces without auth".to_string(),
                    description: "Gateway is bound to 0.0.0.0 (all network interfaces) \
                                  with no authentication. Anyone on the network can access it."
                        .to_string(),
                    affected_field: "gateway.bind".to_string(),
                    fix_suggestion: Some(
                        "Set bind to 127.0.0.1 or enable authentication".to_string(),
                    ),
                });
            } else {
                findings.push(SecurityFinding {
                    id: "SEC-002".to_string(),
                    severity: "warning".to_string(),
                    title: "Gateway exposed to all interfaces".to_string(),
                    description: "Gateway is bound to 0.0.0.0 (all network interfaces). \
                                  Authentication is configured, but binding to localhost is safer."
                        .to_string(),
                    affected_field: "gateway.bind".to_string(),
                    fix_suggestion: Some(
                        "Consider setting bind to 127.0.0.1 and using Tailscale for remote access"
                            .to_string(),
                    ),
                });
            }
        }
    }

    /// SEC-003: Check auth mode
    fn check_auth_mode(config: &serde_json::Value, findings: &mut Vec<SecurityFinding>) {
        let auth_mode = config
            .get("gateway")
            .and_then(|g| g.get("auth_mode"))
            .or_else(|| config.get("auth").and_then(|a| a.get("mode")))
            .and_then(|m| m.as_str())
            .unwrap_or("none");

        if auth_mode == "none" {
            findings.push(SecurityFinding {
                id: "SEC-003".to_string(),
                severity: "critical".to_string(),
                title: "No authentication configured".to_string(),
                description: "Authentication mode is set to 'none'. Anyone who can reach \
                              the gateway can use it without credentials."
                    .to_string(),
                affected_field: "auth.mode".to_string(),
                fix_suggestion: Some(
                    "Set auth_mode to 'token' and configure a credential".to_string(),
                ),
            });
        }
    }

    /// SEC-004: Check Tailscale configuration for remote access
    fn check_tailscale(config: &serde_json::Value, findings: &mut Vec<SecurityFinding>) {
        let bind = config
            .get("gateway")
            .and_then(|g| g.get("bind"))
            .and_then(|b| b.as_str())
            .unwrap_or("127.0.0.1");

        if bind != "127.0.0.1" {
            let has_tailscale = config.get("tailscale").is_some()
                || config
                    .get("gateway")
                    .and_then(|g| g.get("tailscale"))
                    .is_some();

            if !has_tailscale {
                findings.push(SecurityFinding {
                    id: "SEC-004".to_string(),
                    severity: "warning".to_string(),
                    title: "No Tailscale configured for remote access".to_string(),
                    description: format!(
                        "Gateway is bound to '{}' (not localhost) but Tailscale is not \
                         configured. Tailscale provides encrypted tunneling for remote access.",
                        bind
                    ),
                    affected_field: "tailscale".to_string(),
                    fix_suggestion: Some("Enable Tailscale for secure remote access".to_string()),
                });
            }
        }
    }

    /// SEC-005: Check channel allowlists
    fn check_channel_allowlists(config: &serde_json::Value, findings: &mut Vec<SecurityFinding>) {
        if let Some(channels) = config.get("channels").and_then(|c| c.as_array()) {
            for channel in channels {
                let platform = channel
                    .get("platform")
                    .and_then(|p| p.as_str())
                    .unwrap_or("unknown");

                let dm_policy = channel
                    .get("dmPolicy")
                    .or_else(|| channel.get("dm_policy"))
                    .and_then(|p| p.as_str())
                    .unwrap_or("open");

                let allowed_users = channel
                    .get("allowedUsers")
                    .or_else(|| channel.get("allowed_users"))
                    .and_then(|u| u.as_array());

                let has_users = allowed_users.is_some_and(|u| !u.is_empty());

                if dm_policy != "allowlist" || !has_users {
                    findings.push(SecurityFinding {
                        id: "SEC-005".to_string(),
                        severity: "warning".to_string(),
                        title: format!("{} channel missing allowlist", platform),
                        description: format!(
                            "The {} channel does not have dm_policy set to 'allowlist' \
                             or has no allowed_users configured. This may allow unauthorized users \
                             to interact with the bot.",
                            platform
                        ),
                        affected_field: format!("channels.{}.dm_policy", platform),
                        fix_suggestion: Some(
                            "Set dm_policy to 'allowlist' and add trusted user IDs".to_string(),
                        ),
                    });
                }
            }
        }
    }

    /// SEC-006: Check for Docker socket mounting
    fn check_docker_socket(config: &serde_json::Value, findings: &mut Vec<SecurityFinding>) {
        let config_str = serde_json::to_string(config).unwrap_or_default();

        if config_str.contains("/var/run/docker.sock") {
            findings.push(SecurityFinding {
                id: "SEC-006".to_string(),
                severity: "critical".to_string(),
                title: "Docker socket mounted in config".to_string(),
                description: "Configuration references /var/run/docker.sock. Mounting the \
                              Docker socket gives container root access to the host."
                    .to_string(),
                affected_field: "docker.volumes".to_string(),
                fix_suggestion: Some(
                    "Remove Docker socket mounting -- use Docker API over TCP instead".to_string(),
                ),
            });
        }
    }

    /// SEC-007: Check for weak credentials
    fn check_weak_credentials(config: &serde_json::Value, findings: &mut Vec<SecurityFinding>) {
        let credential = config
            .get("auth")
            .and_then(|a| a.get("credential"))
            .or_else(|| config.get("gateway").and_then(|g| g.get("auth_credential")))
            .and_then(|c| c.as_str());

        if let Some(cred) = credential
            && cred.len() < 16
        {
            findings.push(SecurityFinding {
                id: "SEC-007".to_string(),
                severity: "warning".to_string(),
                title: "Weak authentication credential".to_string(),
                description: format!(
                    "Auth credential is only {} characters. Short credentials are \
                     easier to brute-force.",
                    cred.len()
                ),
                affected_field: "auth.credential".to_string(),
                fix_suggestion: Some("Use a credential with at least 16 characters".to_string()),
            });
        }
    }

    /// SEC-008: Check config file permissions
    fn check_config_permissions(findings: &mut Vec<SecurityFinding>) {
        // Skip on Windows
        #[cfg(unix)]
        {
            use std::os::unix::fs::MetadataExt;

            let home = match std::env::var("HOME") {
                Ok(h) => h,
                Err(_) => return,
            };
            let config_path = PathBuf::from(format!("{}/.openclaw/openclaw.json", home));

            if let Ok(metadata) = std::fs::metadata(&config_path) {
                let mode = metadata.mode();
                // Check if world-readable (other read bit)
                if mode & 0o004 != 0 {
                    findings.push(SecurityFinding {
                        id: "SEC-008".to_string(),
                        severity: "warning".to_string(),
                        title: "Config file is world-readable".to_string(),
                        description: format!(
                            "The config file at {} has permissions {:o}, which allows \
                             other users on the system to read it.",
                            config_path.display(),
                            mode & 0o777
                        ),
                        affected_field: "file_permissions".to_string(),
                        fix_suggestion: Some(
                            "Run: chmod 600 ~/.openclaw/openclaw.json".to_string(),
                        ),
                    });
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audit_secure_config() {
        let config = serde_json::json!({
            "ai": {
                "provider": "anthropic",
            },
            "gateway": {
                "bind": "127.0.0.1",
                "port": 3000,
            },
            "auth": {
                "mode": "token",
                "credential": "a-very-secure-credential-with-lots-of-chars"
            },
            "channels": [{
                "platform": "telegram",
                "dmPolicy": "allowlist",
                "allowedUsers": ["user123"]
            }]
        });

        let result = SecurityAuditor::audit_config(&config).unwrap();
        assert_eq!(result.overall_score, "secure");
        assert_eq!(result.critical_count, 0);
        assert_eq!(result.warning_count, 0);
    }

    #[test]
    fn test_audit_detects_exposed_api_key() {
        let config = serde_json::json!({
            "apiKey": "sk-ant-secret-key-12345",
            "gateway": { "bind": "127.0.0.1" },
            "auth": { "mode": "token", "credential": "secure-cred-16-chars-ok" }
        });

        let result = SecurityAuditor::audit_config(&config).unwrap();
        let sec001 = result.findings.iter().find(|f| f.id == "SEC-001");
        assert!(sec001.is_some(), "Should detect SEC-001: API key in config");
        assert_eq!(sec001.unwrap().severity, "warning");
    }

    #[test]
    fn test_audit_detects_open_gateway() {
        let config = serde_json::json!({
            "gateway": {
                "bind": "0.0.0.0",
            },
            "auth": {
                "mode": "none",
            }
        });

        let result = SecurityAuditor::audit_config(&config).unwrap();

        let sec002 = result.findings.iter().find(|f| f.id == "SEC-002");
        assert!(sec002.is_some(), "Should detect SEC-002: open gateway");
        assert_eq!(sec002.unwrap().severity, "critical");

        let sec003 = result.findings.iter().find(|f| f.id == "SEC-003");
        assert!(sec003.is_some(), "Should detect SEC-003: no auth");
        assert_eq!(sec003.unwrap().severity, "critical");

        assert_eq!(result.overall_score, "critical");
    }

    #[test]
    fn test_audit_detects_weak_credential() {
        let config = serde_json::json!({
            "gateway": { "bind": "127.0.0.1" },
            "auth": {
                "mode": "token",
                "credential": "short"
            }
        });

        let result = SecurityAuditor::audit_config(&config).unwrap();
        let sec007 = result.findings.iter().find(|f| f.id == "SEC-007");
        assert!(sec007.is_some(), "Should detect SEC-007: weak credential");
        assert_eq!(sec007.unwrap().severity, "warning");
    }

    #[test]
    fn test_overall_score_logic() {
        // All secure
        let config_secure = serde_json::json!({
            "gateway": { "bind": "127.0.0.1" },
            "auth": { "mode": "token", "credential": "a-long-secure-credential!" }
        });
        let result = SecurityAuditor::audit_config(&config_secure).unwrap();
        assert_eq!(result.overall_score, "secure");

        // Warning only (weak credential)
        let config_warn = serde_json::json!({
            "gateway": { "bind": "127.0.0.1" },
            "auth": { "mode": "token", "credential": "short" }
        });
        let result = SecurityAuditor::audit_config(&config_warn).unwrap();
        assert_eq!(result.overall_score, "warnings");

        // Critical (no auth)
        let config_critical = serde_json::json!({
            "gateway": { "bind": "0.0.0.0" },
            "auth": { "mode": "none" }
        });
        let result = SecurityAuditor::audit_config(&config_critical).unwrap();
        assert_eq!(result.overall_score, "critical");
        assert!(result.critical_count > 0);
    }
}
