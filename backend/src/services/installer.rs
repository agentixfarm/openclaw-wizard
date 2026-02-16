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
use crate::services::platform::Platform;

/// Installation service
pub struct InstallerService;

impl InstallerService {
    const MIN_NODE_MAJOR: u32 = 22;

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
        if let Ok(Some(version)) = SafeCommand::check_node_version() {
            if Self::parse_node_major(&version).map_or(false, |major| major >= Self::MIN_NODE_MAJOR) {
                let _ = tx.send(InstallProgress {
                    stage: "node-install".into(),
                    status: "completed".into(),
                    message: format!("Node.js {} already installed (skipping)", version),
                    progress_pct: Some(100),
                    ..Default::default()
                }).await;
                return Ok(());
            }
        }

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

        let pkg_url = format!("https://nodejs.org/dist/{}/node-{}.pkg", node_version, node_version);
        let pkg_path = format!("/tmp/node-{}.pkg", node_version);

        let _ = tx.send(InstallProgress {
            stage: "node-install".into(),
            status: "running".into(),
            message: format!("Downloading Node.js {} for macOS ({})...", node_version, arch),
            output_line: Some(format!("Fetching {}", pkg_url)),
            progress_pct: Some(10),
            ..Default::default()
        }).await;

        let client = reqwest::Client::new();
        let response = client.get(&pkg_url).send().await
            .context("Failed to download Node.js installer")?;

        if !response.status().is_success() {
            anyhow::bail!("Failed to download Node.js: HTTP {}", response.status());
        }

        let total_size = response.content_length().unwrap_or(0);
        let _ = tx.send(InstallProgress {
            stage: "node-install".into(),
            status: "running".into(),
            message: "Downloading...".into(),
            output_line: Some(format!("Package size: {:.1} MB", total_size as f64 / 1_048_576.0)),
            progress_pct: Some(20),
            ..Default::default()
        }).await;

        let bytes = response.bytes().await
            .context("Failed to read installer bytes")?;

        tokio::fs::write(&pkg_path, bytes).await
            .context("Failed to write installer to /tmp")?;

        let _ = tx.send(InstallProgress {
            stage: "node-install".into(),
            status: "running".into(),
            message: "Download complete. Running macOS installer...".into(),
            output_line: Some(format!("$ sudo installer -pkg {} -target /", pkg_path)),
            progress_pct: Some(50),
            ..Default::default()
        }).await;

        let mut child = TokioCommand::new("sudo")
            .args(&["installer", "-pkg", &pkg_path, "-target", "/"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .context("Failed to start installer")?;

        // Stream both stdout and stderr concurrently
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();
        let tx_out = tx.clone();
        let tx_err = tx.clone();

        let stdout_task = tokio::spawn(async move {
            if let Some(stdout) = stdout {
                let mut reader = BufReader::new(stdout).lines();
                while let Some(line) = reader.next_line().await.unwrap_or(None) {
                    if line.trim().is_empty() { continue; }
                    let _ = tx_out.send(InstallProgress {
                        stage: "node-install".into(),
                        status: "running".into(),
                        message: "Installing Node.js...".into(),
                        output_line: Some(line),
                        progress_pct: Some(75),
                        ..Default::default()
                    }).await;
                }
            }
        });

        let stderr_task = tokio::spawn(async move {
            if let Some(stderr) = stderr {
                let mut reader = BufReader::new(stderr).lines();
                while let Some(line) = reader.next_line().await.unwrap_or(None) {
                    if line.trim().is_empty() { continue; }
                    let _ = tx_err.send(InstallProgress {
                        stage: "node-install".into(),
                        status: "running".into(),
                        message: "Installing Node.js...".into(),
                        output_line: Some(line),
                        progress_pct: Some(75),
                        ..Default::default()
                    }).await;
                }
            }
        });

        let _ = tokio::join!(stdout_task, stderr_task);
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
        // Detect platform info for display
        let os = std::env::consts::OS;
        let arch = std::env::consts::ARCH;

        let _ = tx.send(InstallProgress {
            stage: "openclaw-install".into(),
            status: "running".into(),
            message: format!("Installing OpenClaw on {} ({})...", os, arch),
            output_line: Some(format!("$ npm install -g openclaw")),
            progress_pct: Some(10),
            ..Default::default()
        }).await;

        // Run npm install -g openclaw with verbose output
        let mut child = TokioCommand::new("npm")
            .args(&["install", "-g", "openclaw", "--loglevel", "notice"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .context("Failed to start npm install")?;

        // Stream stdout and stderr concurrently (npm writes progress to stderr)
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        let tx_out = tx.clone();
        let tx_err = tx.clone();

        let stdout_task = tokio::spawn(async move {
            if let Some(stdout) = stdout {
                let mut reader = BufReader::new(stdout).lines();
                while let Some(line) = reader.next_line().await.unwrap_or(None) {
                    if line.trim().is_empty() { continue; }
                    let _ = tx_out.send(InstallProgress {
                        stage: "openclaw-install".into(),
                        status: "running".into(),
                        message: "Installing packages...".into(),
                        output_line: Some(line),
                        progress_pct: Some(50),
                        ..Default::default()
                    }).await;
                }
            }
        });

        let stderr_task = tokio::spawn(async move {
            if let Some(stderr) = stderr {
                let mut reader = BufReader::new(stderr).lines();
                while let Some(line) = reader.next_line().await.unwrap_or(None) {
                    if line.trim().is_empty() { continue; }

                    // Derive a human-readable message from npm output
                    let message = if line.contains("added") || line.contains("changed") {
                        "Finalizing packages...".to_string()
                    } else if line.contains("WARN") {
                        "Installing (warnings are normal)...".to_string()
                    } else if line.contains("gyp ERR") || line.contains("sharp") || line.contains("EACCES") {
                        "Warning: build issue detected".to_string()
                    } else {
                        "Installing dependencies...".to_string()
                    };

                    let _ = tx_err.send(InstallProgress {
                        stage: "openclaw-install".into(),
                        status: "running".into(),
                        message,
                        output_line: Some(line),
                        progress_pct: Some(50),
                        ..Default::default()
                    }).await;
                }
            }
        });

        // Wait for both streams to complete
        let _ = tokio::join!(stdout_task, stderr_task);

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

    /// Verify installation and start the gateway service
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

        // Deploy wizard config to ~/.openclaw/openclaw.json where the gateway expects it
        let _ = tx.send(InstallProgress {
            stage: "verify".into(),
            status: "running".into(),
            message: "Deploying configuration...".into(),
            progress_pct: Some(60),
            ..Default::default()
        }).await;

        if let Err(e) = Self::deploy_config(tx).await {
            // Non-fatal: config can be set up manually
            let _ = tx.send(InstallProgress {
                stage: "verify".into(),
                status: "running".into(),
                message: format!("Config deployment note: {}", e),
                progress_pct: Some(65),
                ..Default::default()
            }).await;
        }

        // Run doctor --fix to auto-repair config, permissions, and missing directories
        let _ = tx.send(InstallProgress {
            stage: "verify".into(),
            status: "running".into(),
            message: "Running doctor checks...".into(),
            output_line: Some("$ openclaw doctor --fix".to_string()),
            progress_pct: Some(68),
            ..Default::default()
        }).await;

        match SafeCommand::run("openclaw", &["doctor", "--fix"]) {
            Ok(output) if output.exit_code == 0 => {
                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "running".into(),
                    message: "✓ Doctor checks passed".into(),
                    output_line: if !output.stdout.trim().is_empty() {
                        Some(output.stdout.trim().to_string())
                    } else {
                        None
                    },
                    progress_pct: Some(70),
                    ..Default::default()
                }).await;
            }
            Ok(output) => {
                // Non-fatal: log issues but continue
                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "running".into(),
                    message: "Doctor found issues (continuing setup)".into(),
                    output_line: Some(output.stderr.trim().to_string()),
                    progress_pct: Some(70),
                    ..Default::default()
                }).await;
            }
            Err(_) => {
                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "running".into(),
                    message: "Could not run doctor (continuing setup)".into(),
                    progress_pct: Some(70),
                    ..Default::default()
                }).await;
            }
        }

        // Install and start the gateway service
        let _ = tx.send(InstallProgress {
            stage: "verify".into(),
            status: "running".into(),
            message: "Installing gateway service...".into(),
            progress_pct: Some(75),
            ..Default::default()
        }).await;

        match SafeCommand::run("openclaw", &["gateway", "install"]) {
            Ok(output) if output.exit_code == 0 => {
                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "running".into(),
                    message: "✓ Gateway service installed".into(),
                    progress_pct: Some(80),
                    ..Default::default()
                }).await;
            }
            Ok(output) => {
                // Non-fatal: log but continue (might already be installed)
                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "running".into(),
                    message: format!("Gateway service install note: {}", output.stderr.trim()),
                    output_line: Some(output.stdout.trim().to_string()),
                    progress_pct: Some(80),
                    ..Default::default()
                }).await;
            }
            Err(_) => {
                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "running".into(),
                    message: "Could not install gateway service (can be done manually later)".into(),
                    progress_pct: Some(80),
                    ..Default::default()
                }).await;
            }
        }

        // Start the gateway
        let _ = tx.send(InstallProgress {
            stage: "verify".into(),
            status: "running".into(),
            message: "Starting gateway...".into(),
            progress_pct: Some(90),
            ..Default::default()
        }).await;

        match SafeCommand::run("openclaw", &["gateway", "start"]) {
            Ok(output) if output.exit_code == 0 => {
                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "running".into(),
                    message: "✓ Gateway started".into(),
                    ..Default::default()
                }).await;
            }
            _ => {
                // Non-fatal: gateway can be started from dashboard
                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "running".into(),
                    message: "Gateway not started (can be started from dashboard)".into(),
                    ..Default::default()
                }).await;
            }
        }

        let _ = tx.send(InstallProgress {
            stage: "verify".into(),
            status: "completed".into(),
            message: "Setup complete!".into(),
            progress_pct: Some(100),
            ..Default::default()
        }).await;

        Ok(())
    }

    /// Deploy the wizard's saved config to OpenClaw using `openclaw onboard`.
    /// This registers the AI provider auth, sets gateway config, and creates workspace.
    async fn deploy_config(tx: &mpsc::Sender<InstallProgress>) -> Result<()> {
        let wizard_config_dir = Platform::config_dir()
            .context("Failed to determine wizard config directory")?;
        let wizard_config_path = wizard_config_dir.join("openclaw.json");

        if !wizard_config_path.exists() {
            anyhow::bail!("No wizard config found at {}", wizard_config_path.display());
        }

        // Read wizard config
        let config_bytes = tokio::fs::read(&wizard_config_path).await
            .context("Failed to read wizard config")?;
        let config: serde_json::Value = serde_json::from_slice(&config_bytes)
            .context("Failed to parse wizard config")?;

        // Build openclaw onboard command with all wizard settings
        let mut args: Vec<String> = vec![
            "onboard".into(),
            "--non-interactive".into(),
            "--accept-risk".into(),
            "--mode".into(), "local".into(),
            "--no-install-daemon".into(),
            "--skip-health".into(),
            "--skip-ui".into(),
        ];

        // AI provider auth
        let api_key = config.get("api_key").and_then(|v| v.as_str()).unwrap_or("");
        let auth_type = config.get("auth_type").and_then(|v| v.as_str()).unwrap_or("api-key");
        let provider = config.get("provider").and_then(|v| v.as_str()).unwrap_or("anthropic");

        match provider {
            // Skip: no auth configured
            "skip" => {
                args.extend(["--auth-choice".into(), "skip".into()]);
            }
            // OAuth providers: pass auth-choice only, no key
            "chutes" => {
                args.extend(["--auth-choice".into(), "chutes".into()]);
            }
            "github-copilot" => {
                args.extend(["--auth-choice".into(), "github-copilot".into()]);
            }
            "qwen" => {
                args.extend(["--auth-choice".into(), "qwen-portal".into()]);
            }
            // Custom provider: base URL + model ID + optional key
            "custom" => {
                args.extend(["--auth-choice".into(), "custom-api-key".into()]);
                if let Some(base_url) = config.get("base_url").and_then(|v| v.as_str()) {
                    if !base_url.is_empty() {
                        args.extend(["--custom-base-url".into(), base_url.into()]);
                    }
                }
                if let Some(model_id) = config.get("model_id").and_then(|v| v.as_str()) {
                    if !model_id.is_empty() {
                        args.extend(["--custom-model-id".into(), model_id.into()]);
                    }
                }
                if let Some(compat) = config.get("compatibility").and_then(|v| v.as_str()) {
                    if !compat.is_empty() {
                        args.extend(["--custom-compatibility".into(), compat.into()]);
                    }
                }
                if !api_key.is_empty() {
                    args.extend(["--custom-api-key".into(), api_key.into()]);
                }
            }
            // Cloudflare: needs account ID, gateway ID, and key
            "cloudflare" => {
                args.extend(["--auth-choice".into(), "cloudflare-ai-gateway-api-key".into()]);
                if !api_key.is_empty() {
                    args.extend(["--cloudflare-ai-gateway-api-key".into(), api_key.into()]);
                }
                if let Some(account_id) = config.get("account_id").and_then(|v| v.as_str()) {
                    if !account_id.is_empty() {
                        args.extend(["--cloudflare-ai-gateway-account-id".into(), account_id.into()]);
                    }
                }
                if let Some(gateway_id) = config.get("gateway_id").and_then(|v| v.as_str()) {
                    if !gateway_id.is_empty() {
                        args.extend(["--cloudflare-ai-gateway-gateway-id".into(), gateway_id.into()]);
                    }
                }
            }
            // vLLM: self-hosted, base URL only
            "vllm" => {
                args.extend(["--auth-choice".into(), "vllm".into()]);
                // vLLM base URL is typically passed as custom-base-url
                if let Some(base_url) = config.get("base_url").and_then(|v| v.as_str()) {
                    if !base_url.is_empty() {
                        args.extend(["--custom-base-url".into(), base_url.into()]);
                    }
                }
            }
            // Provider-specific auth-choice mappings where the CLI flag name differs from provider ID
            "google" => {
                if !api_key.is_empty() {
                    args.extend(["--auth-choice".into(), "gemini-api-key".into()]);
                    args.extend(["--gemini-api-key".into(), api_key.into()]);
                }
            }
            "vercel-ai-gateway" => {
                if !api_key.is_empty() {
                    args.extend(["--auth-choice".into(), "ai-gateway-api-key".into()]);
                    args.extend(["--ai-gateway-api-key".into(), api_key.into()]);
                }
            }
            "opencode-zen" => {
                if !api_key.is_empty() {
                    args.extend(["--auth-choice".into(), "opencode-zen".into()]);
                    args.extend(["--opencode-zen-api-key".into(), api_key.into()]);
                }
            }
            "minimax" => {
                if !api_key.is_empty() {
                    args.extend(["--auth-choice".into(), "minimax-api-key-cn".into()]);
                    args.extend(["--minimax-api-key".into(), api_key.into()]);
                }
            }
            // Standard API key providers: --auth-choice {provider}-api-key --{provider}-api-key <key>
            // Works for: anthropic, openai, xai, openrouter, moonshot, zai, qianfan, xiaomi,
            //            synthetic, together, huggingface, venice, litellm
            _ => {
                if !api_key.is_empty() {
                    if auth_type == "setup-token" {
                        // Setup tokens use --auth-choice token with --token-provider
                        args.extend(["--auth-choice".into(), "token".into()]);
                        args.extend(["--token".into(), api_key.into()]);
                        args.extend(["--token-provider".into(), provider.into()]);
                    } else {
                        let key_flag = format!("--{}-api-key", provider);
                        args.extend(["--auth-choice".into(), format!("{}-api-key", provider)]);
                        args.extend([key_flag, api_key.into()]);
                    }
                }
            }
        }

        // Gateway settings
        let port = config.get("gateway_port").and_then(|v| v.as_u64()).unwrap_or(18789);
        args.extend(["--gateway-port".into(), port.to_string()]);

        let bind = config.get("gateway_bind").and_then(|v| v.as_str()).unwrap_or("127.0.0.1");
        let bind_mode = match bind {
            "127.0.0.1" | "localhost" => "loopback",
            "0.0.0.0" => "lan",
            other => other,
        };
        args.extend(["--gateway-bind".into(), bind_mode.into()]);

        args.extend(["--gateway-auth".into(), "token".into()]);
        if let Some(credential) = config.get("auth_credential").and_then(|v| v.as_str()) {
            if !credential.is_empty() {
                args.extend(["--gateway-token".into(), credential.into()]);
            }
        }

        // Skip channels in onboard; we'll set them separately
        args.push("--skip-channels".into());
        args.push("--skip-skills".into());

        let _ = tx.send(InstallProgress {
            stage: "verify".into(),
            status: "running".into(),
            message: "Running onboard setup...".into(),
            output_line: Some("$ openclaw onboard --non-interactive ...".to_string()),
            progress_pct: Some(62),
            ..Default::default()
        }).await;

        let args_str: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        match SafeCommand::run("openclaw", &args_str) {
            Ok(output) if output.exit_code == 0 => {
                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "running".into(),
                    message: "✓ OpenClaw configured".into(),
                    progress_pct: Some(64),
                    ..Default::default()
                }).await;
            }
            Ok(output) => {
                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "running".into(),
                    message: format!("Onboard warning: {}", output.stderr.lines().last().unwrap_or("").trim()),
                    output_line: Some(output.stdout.trim().to_string()),
                    progress_pct: Some(64),
                    ..Default::default()
                }).await;
            }
            Err(e) => {
                anyhow::bail!("Failed to run openclaw onboard: {}", e);
            }
        }

        // Deploy channel configurations separately via config set
        if let Some(channels) = config.get("channels").and_then(|v| v.as_array()) {
            for channel in channels {
                let platform = match channel.get("platform").and_then(|v| v.as_str()) {
                    Some(p) => p,
                    None => continue,
                };

                if let Some(token) = channel.get("bot_token").and_then(|v| v.as_str()) {
                    if !token.is_empty() {
                        let path = format!("channels.{}.botToken", platform);
                        let _ = SafeCommand::run("openclaw", &["config", "set", &path, token]);
                    }
                }

                if let Some(token) = channel.get("app_token").and_then(|v| v.as_str()) {
                    if !token.is_empty() {
                        let path = format!("channels.{}.appToken", platform);
                        let _ = SafeCommand::run("openclaw", &["config", "set", &path, token]);
                    }
                }

                let _ = tx.send(InstallProgress {
                    stage: "verify".into(),
                    status: "running".into(),
                    message: format!("✓ {} channel configured", platform),
                    progress_pct: Some(65),
                    ..Default::default()
                }).await;
            }
        }

        let _ = tx.send(InstallProgress {
            stage: "verify".into(),
            status: "running".into(),
            message: "✓ Configuration deployed".into(),
            progress_pct: Some(66),
            ..Default::default()
        }).await;

        Ok(())
    }

    fn parse_node_major(version_str: &str) -> Option<u32> {
        version_str
            .trim()
            .trim_start_matches('v')
            .split('.')
            .next()
            .and_then(|major| major.parse::<u32>().ok())
    }
}

#[cfg(test)]
mod tests {
    use super::InstallerService;

    #[test]
    fn parse_node_major_handles_common_versions() {
        assert_eq!(InstallerService::parse_node_major("v22.12.0"), Some(22));
        assert_eq!(InstallerService::parse_node_major("22.11.0"), Some(22));
        assert_eq!(InstallerService::parse_node_major("v20"), Some(20));
    }

    #[test]
    fn parse_node_major_rejects_invalid_versions() {
        assert_eq!(InstallerService::parse_node_major(""), None);
        assert_eq!(InstallerService::parse_node_major("not-a-version"), None);
    }
}
