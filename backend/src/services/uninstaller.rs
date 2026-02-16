//! # Uninstall Service
//!
//! Handles complete removal of OpenClaw installation with streaming progress updates.

use anyhow::{Context, Result};
use tokio::sync::mpsc;

use crate::models::InstallProgress;
use crate::services::command::SafeCommand;
use crate::services::platform::Platform;

/// Uninstall service for complete OpenClaw removal
pub struct UninstallService;

impl UninstallService {
    /// Run uninstall with streaming progress
    pub async fn run_uninstall(tx: mpsc::Sender<InstallProgress>) -> Result<()> {
        Self::stop_gateway(&tx).await;
        Self::uninstall_gateway_service(&tx).await;
        Self::uninstall_openclaw(&tx).await;
        Self::remove_wizard_config(&tx).await;
        Self::remove_npm_package(&tx).await;

        let _ = tx.send(InstallProgress {
            stage: "uninstall".into(),
            status: "completed".into(),
            message: "Uninstall complete. OpenClaw has been removed.".into(),
            progress_pct: Some(100),
            ..Default::default()
        }).await;

        Ok(())
    }

    /// Step 1: Stop the gateway daemon
    async fn stop_gateway(tx: &mpsc::Sender<InstallProgress>) {
        let _ = tx.send(InstallProgress {
            stage: "uninstall".into(),
            status: "running".into(),
            message: "Stopping gateway...".into(),
            output_line: Some("$ openclaw gateway stop".into()),
            progress_pct: Some(5),
            ..Default::default()
        }).await;

        match SafeCommand::run("openclaw", &["gateway", "stop"]) {
            Ok(output) if output.exit_code == 0 => {
                let _ = tx.send(InstallProgress {
                    stage: "uninstall".into(),
                    status: "running".into(),
                    message: "Gateway stopped".into(),
                    progress_pct: Some(15),
                    ..Default::default()
                }).await;
            }
            _ => {
                let _ = tx.send(InstallProgress {
                    stage: "uninstall".into(),
                    status: "running".into(),
                    message: "Gateway was not running (skipped)".into(),
                    progress_pct: Some(15),
                    ..Default::default()
                }).await;
            }
        }
    }

    /// Step 2: Uninstall the gateway service (LaunchAgent/systemd)
    async fn uninstall_gateway_service(tx: &mpsc::Sender<InstallProgress>) {
        let _ = tx.send(InstallProgress {
            stage: "uninstall".into(),
            status: "running".into(),
            message: "Removing gateway service...".into(),
            output_line: Some("$ openclaw gateway uninstall".into()),
            progress_pct: Some(20),
            ..Default::default()
        }).await;

        match SafeCommand::run("openclaw", &["gateway", "uninstall"]) {
            Ok(output) if output.exit_code == 0 => {
                let _ = tx.send(InstallProgress {
                    stage: "uninstall".into(),
                    status: "running".into(),
                    message: "Gateway service removed".into(),
                    progress_pct: Some(30),
                    ..Default::default()
                }).await;
            }
            _ => {
                let _ = tx.send(InstallProgress {
                    stage: "uninstall".into(),
                    status: "running".into(),
                    message: "Gateway service not installed (skipped)".into(),
                    progress_pct: Some(30),
                    ..Default::default()
                }).await;
            }
        }
    }

    /// Step 3: Run openclaw uninstall --all to remove state, config, and data
    async fn uninstall_openclaw(tx: &mpsc::Sender<InstallProgress>) {
        let _ = tx.send(InstallProgress {
            stage: "uninstall".into(),
            status: "running".into(),
            message: "Removing OpenClaw data and configuration...".into(),
            output_line: Some("$ openclaw uninstall --all --non-interactive --yes".into()),
            progress_pct: Some(35),
            ..Default::default()
        }).await;

        match SafeCommand::run("openclaw", &["uninstall", "--all", "--non-interactive", "--yes"]) {
            Ok(output) if output.exit_code == 0 => {
                let _ = tx.send(InstallProgress {
                    stage: "uninstall".into(),
                    status: "running".into(),
                    message: "OpenClaw data removed".into(),
                    output_line: if !output.stdout.trim().is_empty() {
                        Some(output.stdout.trim().to_string())
                    } else {
                        None
                    },
                    progress_pct: Some(55),
                    ..Default::default()
                }).await;
            }
            Ok(output) => {
                let _ = tx.send(InstallProgress {
                    stage: "uninstall".into(),
                    status: "running".into(),
                    message: format!("Uninstall completed with warnings: {}", output.stderr.lines().last().unwrap_or("").trim()),
                    progress_pct: Some(55),
                    ..Default::default()
                }).await;
            }
            Err(_) => {
                let _ = tx.send(InstallProgress {
                    stage: "uninstall".into(),
                    status: "running".into(),
                    message: "openclaw uninstall command not available (skipped)".into(),
                    progress_pct: Some(55),
                    ..Default::default()
                }).await;
            }
        }
    }

    /// Step 4: Remove wizard-specific config file
    async fn remove_wizard_config(tx: &mpsc::Sender<InstallProgress>) {
        let _ = tx.send(InstallProgress {
            stage: "uninstall".into(),
            status: "running".into(),
            message: "Removing wizard configuration...".into(),
            progress_pct: Some(60),
            ..Default::default()
        }).await;

        if let Ok(config_dir) = Platform::config_dir() {
            let config_path = config_dir.join("openclaw.json");
            if config_path.exists() {
                match std::fs::remove_file(&config_path) {
                    Ok(_) => {
                        let _ = tx.send(InstallProgress {
                            stage: "uninstall".into(),
                            status: "running".into(),
                            message: format!("Removed {}", config_path.display()),
                            progress_pct: Some(70),
                            ..Default::default()
                        }).await;
                    }
                    Err(e) => {
                        let _ = tx.send(InstallProgress {
                            stage: "uninstall".into(),
                            status: "running".into(),
                            message: format!("Could not remove wizard config: {}", e),
                            progress_pct: Some(70),
                            ..Default::default()
                        }).await;
                    }
                }
            } else {
                let _ = tx.send(InstallProgress {
                    stage: "uninstall".into(),
                    status: "running".into(),
                    message: "No wizard config found (skipped)".into(),
                    progress_pct: Some(70),
                    ..Default::default()
                }).await;
            }
        }
    }

    /// Step 5: Remove the npm package as a final cleanup
    async fn remove_npm_package(tx: &mpsc::Sender<InstallProgress>) {
        let _ = tx.send(InstallProgress {
            stage: "uninstall".into(),
            status: "running".into(),
            message: "Removing npm package...".into(),
            output_line: Some("$ npm uninstall -g openclaw".into()),
            progress_pct: Some(75),
            ..Default::default()
        }).await;

        match SafeCommand::run("npm", &["uninstall", "-g", "openclaw"]) {
            Ok(output) if output.exit_code == 0 => {
                let _ = tx.send(InstallProgress {
                    stage: "uninstall".into(),
                    status: "running".into(),
                    message: "npm package removed".into(),
                    progress_pct: Some(90),
                    ..Default::default()
                }).await;
            }
            _ => {
                let _ = tx.send(InstallProgress {
                    stage: "uninstall".into(),
                    status: "running".into(),
                    message: "npm package already removed or not found (skipped)".into(),
                    progress_pct: Some(90),
                    ..Default::default()
                }).await;
            }
        }
    }
}
