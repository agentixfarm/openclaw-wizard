//! # Installation Rollback Service
//!
//! Reverses installation stages in order: stop daemon, remove config, uninstall OpenClaw.
//! Each stage is independent -- failure in one does not prevent the next.

use crate::models::types::{RollbackResult, RollbackStage};
use crate::services::command::SafeCommand;
use crate::services::daemon::DaemonService;
use crate::services::platform::Platform;
use anyhow::Result;

pub struct RollbackService;

impl RollbackService {
    /// Rollback a local installation by reversing stages in order.
    ///
    /// Stages:
    /// 1. Stop daemon (if running)
    /// 2. Remove config files (~/.openclaw/openclaw.json, ~/.openclaw/.env)
    /// 3. Uninstall OpenClaw (npm uninstall -g @anthropic/openclaw)
    ///
    /// Each stage runs independently -- a failure in one does not block the next.
    pub async fn rollback_local() -> Result<RollbackResult> {
        let mut stages = vec![
            RollbackStage {
                name: "stop_daemon".to_string(),
                status: "pending".to_string(),
                message: String::new(),
            },
            RollbackStage {
                name: "remove_config".to_string(),
                status: "pending".to_string(),
                message: String::new(),
            },
            RollbackStage {
                name: "uninstall_openclaw".to_string(),
                status: "pending".to_string(),
                message: String::new(),
            },
        ];

        // Stage 1: Stop daemon
        let daemon_status = DaemonService::status();
        if daemon_status.running {
            match DaemonService::stop() {
                Ok(_) => {
                    stages[0].status = "success".to_string();
                    stages[0].message = "Daemon stopped successfully".to_string();
                }
                Err(e) => {
                    stages[0].status = "failed".to_string();
                    stages[0].message = format!("Failed to stop daemon: {}", e);
                }
            }
        } else {
            stages[0].status = "skipped".to_string();
            stages[0].message = "Daemon was not running".to_string();
        }

        // Stage 2: Remove config files
        let home = Platform::home_dir();
        match home {
            Ok(home_dir) => {
                let openclaw_dir = home_dir.join(".openclaw");
                let config_path = openclaw_dir.join("openclaw.json");
                let env_path = openclaw_dir.join(".env");

                let mut removed_any = false;
                let mut messages = Vec::new();

                if config_path.exists() {
                    match std::fs::remove_file(&config_path) {
                        Ok(_) => {
                            removed_any = true;
                            messages.push("Removed openclaw.json".to_string());
                        }
                        Err(e) => {
                            stages[1].status = "failed".to_string();
                            stages[1].message = format!("Failed to remove config: {}", e);
                        }
                    }
                }

                if env_path.exists() {
                    match std::fs::remove_file(&env_path) {
                        Ok(_) => {
                            removed_any = true;
                            messages.push("Removed .env".to_string());
                        }
                        Err(e) => {
                            if stages[1].status != "failed" {
                                stages[1].status = "failed".to_string();
                                stages[1].message = format!("Failed to remove .env: {}", e);
                            }
                        }
                    }
                }

                if stages[1].status == "pending" {
                    if removed_any {
                        stages[1].status = "success".to_string();
                        stages[1].message = messages.join(", ");
                    } else {
                        stages[1].status = "skipped".to_string();
                        stages[1].message = "No config files found".to_string();
                    }
                }
            }
            Err(_) => {
                stages[1].status = "skipped".to_string();
                stages[1].message = "Could not determine home directory".to_string();
            }
        }

        // Stage 3: Uninstall OpenClaw
        match SafeCommand::run("npm", &["uninstall", "-g", "@anthropic/openclaw"]) {
            Ok(output) => {
                if output.exit_code == 0 {
                    stages[2].status = "success".to_string();
                    stages[2].message = "OpenClaw uninstalled".to_string();
                } else {
                    // npm uninstall returns non-zero if package not installed -- treat as skipped
                    stages[2].status = "skipped".to_string();
                    stages[2].message = "OpenClaw was not installed globally".to_string();
                }
            }
            Err(e) => {
                stages[2].status = "failed".to_string();
                stages[2].message = format!("Failed to uninstall: {}", e);
            }
        }

        // Determine overall success
        let has_failures = stages.iter().any(|s| s.status == "failed");
        let error = if has_failures {
            let failed: Vec<&str> = stages
                .iter()
                .filter(|s| s.status == "failed")
                .map(|s| s.name.as_str())
                .collect();
            Some(format!("Failed stages: {}", failed.join(", ")))
        } else {
            None
        };

        Ok(RollbackResult {
            success: !has_failures,
            stages,
            error,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rollback_stages_structure() {
        // Verify the structure matches expected 3 stages
        let result = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(RollbackService::rollback_local())
            .expect("rollback should not error");

        assert_eq!(result.stages.len(), 3);
        assert_eq!(result.stages[0].name, "stop_daemon");
        assert_eq!(result.stages[1].name, "remove_config");
        assert_eq!(result.stages[2].name, "uninstall_openclaw");

        // Each stage should have a valid status
        for stage in &result.stages {
            assert!(
                ["pending", "success", "skipped", "failed"].contains(&stage.status.as_str()),
                "Invalid status: {}",
                stage.status
            );
        }
    }
}
