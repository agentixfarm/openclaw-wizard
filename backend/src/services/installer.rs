//! # Installation Service
//!
//! Handles Node.js and OpenClaw installation with streaming progress updates.

use anyhow::{Context, Result};
use tokio::sync::mpsc;
use tokio::process::Command as TokioCommand;
use tokio::io::{AsyncBufReadExt, BufReader};
use std::process::Stdio;

use crate::models::InstallProgress;
use crate::services::command::SafeCommand;

/// Installation service
pub struct InstallerService;

impl InstallerService {
    /// Run installation with streaming progress
    pub async fn run_install(
        install_node: bool,
        install_openclaw: bool,
        tx: mpsc::Sender<InstallProgress>,
    ) -> Result<()> {
        if install_node {
            Self::install_node(&tx).await?;
        }
        if install_openclaw {
            Self::install_openclaw(&tx).await?;
        }
        Self::verify_installation(&tx).await?;
        Ok(())
    }

    /// Install Node.js
    async fn install_node(tx: &mpsc::Sender<InstallProgress>) -> Result<()> {
        // Send starting message
        let _ = tx.send(InstallProgress {
            stage: "node-install".into(),
            status: "running".into(),
            message: "Starting Node.js 22 installation...".into(),
            ..Default::default()
        }).await;

        // Detect platform
        let os = std::env::consts::OS;

        match os {
            "macos" => Self::install_node_macos(tx).await?,
            "linux" => Self::install_node_linux(tx).await?,
            _ => {
                let _ = tx.send(InstallProgress {
                    stage: "node-install".into(),
                    status: "failed".into(),
                    message: format!("Unsupported OS for automatic Node.js installation: {}", os),
                    error: Some("Please install Node.js 22+ manually from nodejs.org".into()),
                    ..Default::default()
                }).await;
                anyhow::bail!("Unsupported OS: {}", os);
            }
        }

        // Verify installation
        let _ = tx.send(InstallProgress {
            stage: "node-install".into(),
            status: "running".into(),
            message: "Verifying Node.js installation...".into(),
            ..Default::default()
        }).await;

        match SafeCommand::check_node_version() {
            Ok(Some(version)) => {
                let _ = tx.send(InstallProgress {
                    stage: "node-install".into(),
                    status: "completed".into(),
                    message: format!("Node.js {} installed successfully", version),
                    ..Default::default()
                }).await;
                Ok(())
            }
            _ => {
                let _ = tx.send(InstallProgress {
                    stage: "node-install".into(),
                    status: "failed".into(),
                    message: "Node.js installation completed but node command not found".into(),
                    error: Some("You may need to restart the application or terminal".into()),
                    ..Default::default()
                }).await;
                anyhow::bail!("Node.js not found after installation");
            }
        }
    }

    /// Install Node.js on macOS
    async fn install_node_macos(tx: &mpsc::Sender<InstallProgress>) -> Result<()> {
        let arch = std::env::consts::ARCH;
        let node_version = "v22.12.0";

        // Determine correct pkg URL based on architecture
        let pkg_url = if arch == "aarch64" {
            format!("https://nodejs.org/dist/{}/node-{}-arm64.pkg", node_version, node_version)
        } else {
            format!("https://nodejs.org/dist/{}/node-{}-x64.pkg", node_version, node_version)
        };

        let pkg_path = format!("/tmp/node-{}.pkg", node_version);

        // Download Node.js installer
        let _ = tx.send(InstallProgress {
            stage: "node-install".into(),
            status: "running".into(),
            message: format!("Downloading Node.js {} for {}...", node_version, arch),
            progress_pct: Some(10),
            ..Default::default()
        }).await;

        let client = reqwest::Client::new();
        let response = client.get(&pkg_url).send().await
            .context("Failed to download Node.js installer")?;

        if !response.status().is_success() {
            anyhow::bail!("Failed to download Node.js: HTTP {}", response.status());
        }

        let bytes = response.bytes().await
            .context("Failed to read installer bytes")?;

        tokio::fs::write(&pkg_path, bytes).await
            .context("Failed to write installer to /tmp")?;

        let _ = tx.send(InstallProgress {
            stage: "node-install".into(),
            status: "running".into(),
            message: "Download complete. Installing Node.js (requires admin password)...".into(),
            progress_pct: Some(50),
            ..Default::default()
        }).await;

        // Run installer with sudo
        let mut child = TokioCommand::new("sudo")
            .args(&["installer", "-pkg", &pkg_path, "-target", "/"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .context("Failed to start installer")?;

        // Stream stdout
        if let Some(stdout) = child.stdout.take() {
            let mut reader = BufReader::new(stdout).lines();
            while let Some(line) = reader.next_line().await? {
                let _ = tx.send(InstallProgress {
                    stage: "node-install".into(),
                    status: "running".into(),
                    message: "Installing...".into(),
                    output_line: Some(line),
                    progress_pct: Some(75),
                    ..Default::default()
                }).await;
            }
        }

        // Wait for completion
        let status = child.wait().await?;

        if !status.success() {
            let _ = tx.send(InstallProgress {
                stage: "node-install".into(),
                status: "failed".into(),
                message: "Node.js installation failed".into(),
                error: Some("Installer exited with non-zero status".into()),
                ..Default::default()
            }).await;
            anyhow::bail!("Installer failed with exit code: {:?}", status.code());
        }

        // Clean up
        let _ = tokio::fs::remove_file(&pkg_path).await;

        Ok(())
    }

    /// Install Node.js on Linux
    async fn install_node_linux(tx: &mpsc::Sender<InstallProgress>) -> Result<()> {
        let _ = tx.send(InstallProgress {
            stage: "node-install".into(),
            status: "running".into(),
            message: "Setting up NodeSource repository...".into(),
            progress_pct: Some(10),
            ..Default::default()
        }).await;

        // Download and run NodeSource setup script
        let setup_url = "https://deb.nodesource.com/setup_22.x";

        let client = reqwest::Client::new();
        let script = client.get(setup_url).send().await
            .context("Failed to download NodeSource setup script")?
            .text().await
            .context("Failed to read setup script")?;

        // Write script to temp file
        let script_path = "/tmp/nodesource_setup.sh";
        tokio::fs::write(script_path, script).await
            .context("Failed to write setup script")?;

        // Run setup script
        let mut setup_child = TokioCommand::new("sudo")
            .args(&["-E", "bash", script_path])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .context("Failed to run setup script")?;

        // Wait for setup to complete
        let status = setup_child.wait().await?;
        if !status.success() {
            let _ = tx.send(InstallProgress {
                stage: "node-install".into(),
                status: "failed".into(),
                message: "Failed to setup NodeSource repository".into(),
                error: Some("Setup script failed".into()),
                ..Default::default()
            }).await;
            anyhow::bail!("NodeSource setup failed");
        }

        // Clean up script
        let _ = tokio::fs::remove_file(script_path).await;

        let _ = tx.send(InstallProgress {
            stage: "node-install".into(),
            status: "running".into(),
            message: "Installing Node.js via apt...".into(),
            progress_pct: Some(50),
            ..Default::default()
        }).await;

        // Install nodejs
        let mut apt_child = TokioCommand::new("sudo")
            .args(&["apt-get", "install", "-y", "nodejs"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .context("Failed to run apt-get install")?;

        // Stream output
        if let Some(stdout) = apt_child.stdout.take() {
            let mut reader = BufReader::new(stdout).lines();
            while let Some(line) = reader.next_line().await? {
                let _ = tx.send(InstallProgress {
                    stage: "node-install".into(),
                    status: "running".into(),
                    message: "Installing...".into(),
                    output_line: Some(line),
                    progress_pct: Some(75),
                    ..Default::default()
                }).await;
            }
        }

        let status = apt_child.wait().await?;
        if !status.success() {
            let _ = tx.send(InstallProgress {
                stage: "node-install".into(),
                status: "failed".into(),
                message: "apt-get install failed".into(),
                error: Some("Installation process failed".into()),
                ..Default::default()
            }).await;
            anyhow::bail!("apt-get install nodejs failed");
        }

        Ok(())
    }

    /// Install OpenClaw via npm
    async fn install_openclaw(tx: &mpsc::Sender<InstallProgress>) -> Result<()> {
        let _ = tx.send(InstallProgress {
            stage: "openclaw-install".into(),
            status: "running".into(),
            message: "Installing OpenClaw via npm...".into(),
            progress_pct: Some(10),
            ..Default::default()
        }).await;

        // Run npm install -g openclaw
        let mut child = TokioCommand::new("npm")
            .args(&["install", "-g", "openclaw"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .context("Failed to start npm install")?;

        // Stream stdout
        if let Some(stdout) = child.stdout.take() {
            let mut reader = BufReader::new(stdout).lines();
            while let Some(line) = reader.next_line().await? {
                // Check for common errors
                let is_error = line.contains("sharp") || line.contains("libvips") ||
                               line.contains("gyp ERR") || line.contains("EACCES");

                let _ = tx.send(InstallProgress {
                    stage: "openclaw-install".into(),
                    status: "running".into(),
                    message: "Installing dependencies...".into(),
                    output_line: Some(line.clone()),
                    progress_pct: Some(50),
                    ..Default::default()
                }).await;

                if is_error {
                    let _ = tx.send(InstallProgress {
                        stage: "openclaw-install".into(),
                        status: "running".into(),
                        message: "Warning: Potential build issues detected".into(),
                        ..Default::default()
                    }).await;
                }
            }
        }

        // Stream stderr as well (npm outputs to stderr)
        if let Some(stderr) = child.stderr.take() {
            let mut reader = BufReader::new(stderr).lines();
            while let Some(line) = reader.next_line().await? {
                let _ = tx.send(InstallProgress {
                    stage: "openclaw-install".into(),
                    status: "running".into(),
                    message: "Installing...".into(),
                    output_line: Some(line),
                    progress_pct: Some(50),
                    ..Default::default()
                }).await;
            }
        }

        let status = child.wait().await?;

        if !status.success() {
            let _ = tx.send(InstallProgress {
                stage: "openclaw-install".into(),
                status: "failed".into(),
                message: "OpenClaw installation failed".into(),
                error: Some("npm install exited with error. Common causes: sharp/libvips build issues, permission problems".into()),
                ..Default::default()
            }).await;
            anyhow::bail!("npm install openclaw failed");
        }

        let _ = tx.send(InstallProgress {
            stage: "openclaw-install".into(),
            status: "completed".into(),
            message: "OpenClaw installed successfully".into(),
            progress_pct: Some(100),
            ..Default::default()
        }).await;

        Ok(())
    }

    /// Verify installation
    async fn verify_installation(tx: &mpsc::Sender<InstallProgress>) -> Result<()> {
        let _ = tx.send(InstallProgress {
            stage: "verify".into(),
            status: "running".into(),
            message: "Verifying installation...".into(),
            ..Default::default()
        }).await;

        // Check Node.js
        match SafeCommand::check_node_version() {
            Ok(Some(version)) => {
                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "running".into(),
                    message: format!("✓ Node.js {}", version),
                    ..Default::default()
                }).await;
            }
            _ => {
                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "failed".into(),
                    message: "Node.js verification failed".into(),
                    error: Some("Node.js not found".into()),
                    ..Default::default()
                }).await;
                anyhow::bail!("Node.js not found during verification");
            }
        }

        // Check OpenClaw
        match SafeCommand::run("openclaw", &["--version"]) {
            Ok(output) if output.exit_code == 0 => {
                let version = output.stdout.trim();
                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "running".into(),
                    message: format!("✓ OpenClaw {}", version),
                    ..Default::default()
                }).await;
            }
            _ => {
                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "failed".into(),
                    message: "OpenClaw verification failed".into(),
                    error: Some("OpenClaw command not found".into()),
                    ..Default::default()
                }).await;
                anyhow::bail!("OpenClaw not found during verification");
            }
        }

        let _ = tx.send(InstallProgress {
            stage: "verify".into(),
            status: "completed".into(),
            message: "All installations verified successfully!".into(),
            progress_pct: Some(100),
            ..Default::default()
        }).await;

        Ok(())
    }
}
