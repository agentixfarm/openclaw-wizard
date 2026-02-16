//! # Upgrade Service
//!
//! Handles upgrading OpenClaw installation with streaming progress updates.

use anyhow::{Context, Result};
use tokio::sync::mpsc;

use crate::models::InstallProgress;
use crate::services::command::SafeCommand;

/// Upgrade service for updating OpenClaw to the latest version
pub struct UpgradeService;

impl UpgradeService {
    /// Run upgrade with streaming progress
    pub async fn run_upgrade(tx: mpsc::Sender<InstallProgress>) -> Result<()> {
        Self::stop_gateway(&tx).await;
        Self::update_npm_package(&tx).await?;
        Self::run_doctor_fix(&tx).await;
        Self::reinstall_gateway_service(&tx).await;
        Self::start_gateway(&tx).await?;

        let _ = tx.send(InstallProgress {
            stage: "upgrade".into(),
            status: "completed".into(),
            message: "Upgrade complete. OpenClaw has been updated and the gateway is running.".into(),
            progress_pct: Some(100),
            ..Default::default()
        }).await;

        Ok(())
    }

    /// Step 1: Stop the gateway daemon (0-15%)
    async fn stop_gateway(tx: &mpsc::Sender<InstallProgress>) {
        let _ = tx.send(InstallProgress {
            stage: "upgrade".into(),
            status: "running".into(),
            message: "Stopping gateway...".into(),
            output_line: Some("$ openclaw gateway stop".into()),
            progress_pct: Some(0),
            ..Default::default()
        }).await;

        match SafeCommand::run("openclaw", &["gateway", "stop"]) {
            Ok(output) if output.exit_code == 0 => {
                let _ = tx.send(InstallProgress {
                    stage: "upgrade".into(),
                    status: "running".into(),
                    message: "Gateway stopped".into(),
                    progress_pct: Some(15),
                    ..Default::default()
                }).await;
            }
            _ => {
                let _ = tx.send(InstallProgress {
                    stage: "upgrade".into(),
                    status: "running".into(),
                    message: "Gateway was not running (skipped)".into(),
                    progress_pct: Some(15),
                    ..Default::default()
                }).await;
            }
        }
    }

    /// Step 2: Update npm package (15-40%) - CRITICAL STEP
    async fn update_npm_package(tx: &mpsc::Sender<InstallProgress>) -> Result<()> {
        let _ = tx.send(InstallProgress {
            stage: "upgrade".into(),
            status: "running".into(),
            message: "Updating OpenClaw package...".into(),
            output_line: Some("$ npm update -g openclaw".into()),
            progress_pct: Some(15),
            ..Default::default()
        }).await;

        match SafeCommand::run("npm", &["update", "-g", "openclaw"]) {
            Ok(output) if output.exit_code == 0 => {
                let _ = tx.send(InstallProgress {
                    stage: "upgrade".into(),
                    status: "running".into(),
                    message: "OpenClaw package updated".into(),
                    output_line: if !output.stdout.trim().is_empty() {
                        Some(output.stdout.trim().to_string())
                    } else {
                        None
                    },
                    progress_pct: Some(40),
                    ..Default::default()
                }).await;
                Ok(())
            }
            Ok(output) => {
                let error_msg = format!("npm update failed: {}", output.stderr.trim());
                let _ = tx.send(InstallProgress {
                    stage: "upgrade".into(),
                    status: "failed".into(),
                    message: error_msg.clone(),
                    error: Some(error_msg.clone()),
                    progress_pct: Some(40),
                    ..Default::default()
                }).await;
                Err(anyhow::anyhow!(error_msg))
            }
            Err(e) => {
                let error_msg = format!("Failed to run npm update: {}", e);
                let _ = tx.send(InstallProgress {
                    stage: "upgrade".into(),
                    status: "failed".into(),
                    message: error_msg.clone(),
                    error: Some(error_msg.clone()),
                    progress_pct: Some(40),
                    ..Default::default()
                }).await;
                Err(anyhow::anyhow!(error_msg))
            }
        }
    }

    /// Step 3: Run doctor --fix (40-65%) - NON-CRITICAL
    async fn run_doctor_fix(tx: &mpsc::Sender<InstallProgress>) {
        let _ = tx.send(InstallProgress {
            stage: "upgrade".into(),
            status: "running".into(),
            message: "Running diagnostics and auto-fix...".into(),
            output_line: Some("$ openclaw doctor --fix".into()),
            progress_pct: Some(40),
            ..Default::default()
        }).await;

        match SafeCommand::run("openclaw", &["doctor", "--fix"]) {
            Ok(output) if output.exit_code == 0 => {
                let _ = tx.send(InstallProgress {
                    stage: "upgrade".into(),
                    status: "running".into(),
                    message: "Diagnostics completed".into(),
                    progress_pct: Some(65),
                    ..Default::default()
                }).await;
            }
            _ => {
                let _ = tx.send(InstallProgress {
                    stage: "upgrade".into(),
                    status: "running".into(),
                    message: "Diagnostics completed with warnings (continuing)".into(),
                    progress_pct: Some(65),
                    ..Default::default()
                }).await;
            }
        }
    }

    /// Step 4: Reinstall gateway service (65-85%) - NON-CRITICAL
    async fn reinstall_gateway_service(tx: &mpsc::Sender<InstallProgress>) {
        let _ = tx.send(InstallProgress {
            stage: "upgrade".into(),
            status: "running".into(),
            message: "Reinstalling gateway service...".into(),
            output_line: Some("$ openclaw gateway install".into()),
            progress_pct: Some(65),
            ..Default::default()
        }).await;

        match SafeCommand::run("openclaw", &["gateway", "install"]) {
            Ok(output) if output.exit_code == 0 => {
                let _ = tx.send(InstallProgress {
                    stage: "upgrade".into(),
                    status: "running".into(),
                    message: "Gateway service reinstalled".into(),
                    progress_pct: Some(85),
                    ..Default::default()
                }).await;
            }
            _ => {
                let _ = tx.send(InstallProgress {
                    stage: "upgrade".into(),
                    status: "running".into(),
                    message: "Gateway service reinstall had warnings (continuing)".into(),
                    progress_pct: Some(85),
                    ..Default::default()
                }).await;
            }
        }
    }

    /// Step 5: Start gateway (85-100%) - CRITICAL STEP
    async fn start_gateway(tx: &mpsc::Sender<InstallProgress>) -> Result<()> {
        let _ = tx.send(InstallProgress {
            stage: "upgrade".into(),
            status: "running".into(),
            message: "Starting gateway...".into(),
            output_line: Some("$ openclaw gateway start".into()),
            progress_pct: Some(85),
            ..Default::default()
        }).await;

        match SafeCommand::run("openclaw", &["gateway", "start"]) {
            Ok(output) if output.exit_code == 0 => {
                let _ = tx.send(InstallProgress {
                    stage: "upgrade".into(),
                    status: "running".into(),
                    message: "Gateway started".into(),
                    progress_pct: Some(100),
                    ..Default::default()
                }).await;
                Ok(())
            }
            Ok(output) => {
                let error_msg = format!("Failed to start gateway: {}", output.stderr.trim());
                let _ = tx.send(InstallProgress {
                    stage: "upgrade".into(),
                    status: "failed".into(),
                    message: error_msg.clone(),
                    error: Some(error_msg.clone()),
                    progress_pct: Some(100),
                    ..Default::default()
                }).await;
                Err(anyhow::anyhow!(error_msg))
            }
            Err(e) => {
                let error_msg = format!("Failed to run gateway start: {}", e);
                let _ = tx.send(InstallProgress {
                    stage: "upgrade".into(),
                    status: "failed".into(),
                    message: error_msg.clone(),
                    error: Some(error_msg.clone()),
                    progress_pct: Some(100),
                    ..Default::default()
                }).await;
                Err(anyhow::anyhow!(error_msg))
            }
        }
    }
}
