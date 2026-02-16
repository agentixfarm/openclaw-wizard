//! # Remote Setup Service
//!
//! Orchestrates full OpenClaw installation on remote VPS servers via SSH.
//!
//! Installation pipeline:
//! 1. Test SSH connection
//! 2. Check/install Node.js 22+
//! 3. Install OpenClaw via npm
//! 4. Write OpenClaw configuration remotely
//! 5. Install and start daemon
//!
//! SECURITY:
//! - SSH key paths retrieved from platform keychain (never passed over WebSocket)
//! - Config JSON is shell-escaped before remote write
//! - All operations use KnownHosts::Strict (inherited from SshService)

use anyhow::{Context, Result};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::mpsc;
use tracing::{info, warn};

use crate::models::{RemoteSetupProgress, WizardConfig};
use crate::services::ssh::SshService;

/// NVM install script URL
const NVM_INSTALL_URL: &str = "https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh";

/// Minimum required Node.js major version
const MIN_NODE_MAJOR: u32 = 22;

/// Remote setup orchestration service
pub struct RemoteService {
    ssh_service: SshService,
}

impl RemoteService {
    /// Create a new RemoteService instance
    pub fn new() -> Self {
        Self {
            ssh_service: SshService::new(),
        }
    }

    /// Orchestrate full OpenClaw installation on a remote server
    ///
    /// Streams progress updates via the provided channel. Each stage sends
    /// at least one progress message. On failure, sends a `failed` status
    /// and returns an error.
    pub async fn install_openclaw_remote(
        &self,
        host: &str,
        user: &str,
        config: WizardConfig,
        progress_tx: mpsc::Sender<RemoteSetupProgress>,
    ) -> Result<()> {
        // Stage 1: Check connection
        self.stage_check_connection(host, user, &progress_tx)
            .await?;

        // Stage 2: Check/install Node.js
        self.stage_ensure_node(host, user, &progress_tx).await?;

        // Stage 3: Install OpenClaw
        self.stage_install_openclaw(host, user, &progress_tx)
            .await?;

        // Stage 4: Write config
        self.stage_write_config(host, user, &config, &progress_tx)
            .await?;

        // Stage 5: Install daemon
        self.stage_install_daemon(host, user, &progress_tx).await?;

        // Stage 6: Start daemon
        self.stage_start_daemon(host, user, &progress_tx).await?;

        // Stage 7: Send completion
        Self::send_progress(
            &progress_tx,
            "complete",
            "completed",
            "Remote setup complete!",
            None,
        )
        .await;

        info!(
            "Remote OpenClaw installation completed on {}@{}",
            user, host
        );
        Ok(())
    }

    // ===== Installation Stages =====

    /// Stage 1: Verify SSH connectivity
    async fn stage_check_connection(
        &self,
        host: &str,
        user: &str,
        tx: &mpsc::Sender<RemoteSetupProgress>,
    ) -> Result<()> {
        Self::send_progress(
            tx,
            "connection",
            "in_progress",
            "Connecting to remote server...",
            None,
        )
        .await;

        match self.ssh_service.check_connection(host, user).await {
            Ok(true) => {
                Self::send_progress(
                    tx,
                    "connection",
                    "completed",
                    &format!("Connected to {}@{}", user, host),
                    None,
                )
                .await;
                Ok(())
            }
            Ok(false) => {
                let msg = "SSH authentication failed. Check your SSH key and username.";
                Self::send_progress(tx, "connection", "failed", msg, Some(msg)).await;
                anyhow::bail!(msg)
            }
            Err(e) => {
                let msg = format!("SSH connection failed: {}", e);
                Self::send_progress(tx, "connection", "failed", &msg, Some(&msg)).await;
                Err(e).context("SSH connection check failed")
            }
        }
    }

    /// Stage 2: Check Node.js version, install if missing or outdated
    async fn stage_ensure_node(
        &self,
        host: &str,
        user: &str,
        tx: &mpsc::Sender<RemoteSetupProgress>,
    ) -> Result<()> {
        Self::send_progress(
            tx,
            "node",
            "in_progress",
            "Checking Node.js installation...",
            None,
        )
        .await;

        // Check if Node.js is already installed with sufficient version
        let node_check = self
            .ssh_service
            .exec_remote(host, user, "node --version 2>/dev/null")
            .await;

        let needs_install = match &node_check {
            Ok(output) if output.exit_code == 0 => {
                let version_str = output.stdout.trim();
                match Self::parse_node_major(version_str) {
                    Some(major) if major >= MIN_NODE_MAJOR => {
                        Self::send_progress(
                            tx,
                            "node",
                            "completed",
                            &format!("Node.js {} already installed", version_str),
                            None,
                        )
                        .await;
                        false
                    }
                    Some(major) => {
                        warn!(
                            "Node.js {} found (need >= {}), will upgrade",
                            major, MIN_NODE_MAJOR
                        );
                        true
                    }
                    None => {
                        warn!("Could not parse Node.js version: {}", version_str);
                        true
                    }
                }
            }
            _ => true,
        };

        if needs_install {
            self.install_node_via_nvm(host, user, tx).await?;
        }

        Ok(())
    }

    /// Install Node.js via nvm on remote server
    async fn install_node_via_nvm(
        &self,
        host: &str,
        user: &str,
        tx: &mpsc::Sender<RemoteSetupProgress>,
    ) -> Result<()> {
        Self::send_progress(
            tx,
            "node",
            "in_progress",
            "Installing Node.js via nvm...",
            None,
        )
        .await;

        let nvm_script = format!(
            r#"set -e
curl -o- {NVM_INSTALL_URL} | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install {MIN_NODE_MAJOR}
nvm use {MIN_NODE_MAJOR}
nvm alias default {MIN_NODE_MAJOR}
node --version"#
        );

        // Stream output for real-time feedback
        let (line_tx, mut line_rx) = mpsc::channel::<String>(100);

        let ssh = self.ssh_service.clone();
        let host_owned = host.to_string();
        let user_owned = user.to_string();

        let install_handle = tokio::spawn(async move {
            ssh.stream_remote_command(&host_owned, &user_owned, &nvm_script, line_tx)
                .await
        });

        // Forward streamed lines as progress
        while let Some(line) = line_rx.recv().await {
            Self::send_progress(tx, "node", "in_progress", &line, None).await;
        }

        let result = install_handle
            .await
            .context("Node.js install task panicked")?;

        match result {
            Ok(output) if output.exit_code == 0 => {
                let version = output.stdout.lines().last().unwrap_or("v22").trim();
                Self::send_progress(
                    tx,
                    "node",
                    "completed",
                    &format!("Node.js {} installed successfully", version),
                    None,
                )
                .await;
                Ok(())
            }
            Ok(output) => {
                let msg = format!(
                    "Node.js installation failed (exit code {})",
                    output.exit_code
                );
                let detail = if !output.stderr.is_empty() {
                    output.stderr.lines().last().unwrap_or(&msg).to_string()
                } else {
                    msg.clone()
                };
                Self::send_progress(tx, "node", "failed", &msg, Some(&detail)).await;
                anyhow::bail!(msg)
            }
            Err(e) => {
                let msg = format!("Node.js installation failed: {}", e);
                Self::send_progress(tx, "node", "failed", &msg, Some(&msg)).await;
                Err(e).context("Failed to install Node.js via nvm")
            }
        }
    }

    /// Stage 3: Install OpenClaw via npm
    async fn stage_install_openclaw(
        &self,
        host: &str,
        user: &str,
        tx: &mpsc::Sender<RemoteSetupProgress>,
    ) -> Result<()> {
        Self::send_progress(
            tx,
            "openclaw",
            "in_progress",
            "Installing OpenClaw via npm...",
            None,
        )
        .await;

        // Source nvm before running npm (nvm installs node in user space)
        let install_cmd = r#"export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm install -g openclaw"#;

        let (line_tx, mut line_rx) = mpsc::channel::<String>(100);

        let ssh = self.ssh_service.clone();
        let host_owned = host.to_string();
        let user_owned = user.to_string();
        let cmd_owned = install_cmd.to_string();

        let install_handle = tokio::spawn(async move {
            ssh.stream_remote_command(&host_owned, &user_owned, &cmd_owned, line_tx)
                .await
        });

        while let Some(line) = line_rx.recv().await {
            Self::send_progress(tx, "openclaw", "in_progress", &line, None).await;
        }

        let result = install_handle
            .await
            .context("OpenClaw install task panicked")?;

        match result {
            Ok(output) if output.exit_code == 0 => {
                Self::send_progress(
                    tx,
                    "openclaw",
                    "completed",
                    "OpenClaw installed successfully",
                    None,
                )
                .await;
                Ok(())
            }
            Ok(output) => {
                let msg = format!(
                    "OpenClaw installation failed (exit code {})",
                    output.exit_code
                );
                let detail = if !output.stderr.is_empty() {
                    output.stderr.lines().last().unwrap_or(&msg).to_string()
                } else {
                    msg.clone()
                };
                Self::send_progress(tx, "openclaw", "failed", &msg, Some(&detail)).await;
                anyhow::bail!(msg)
            }
            Err(e) => {
                let msg = format!("OpenClaw installation failed: {}", e);
                Self::send_progress(tx, "openclaw", "failed", &msg, Some(&msg)).await;
                Err(e).context("Failed to install OpenClaw via npm")
            }
        }
    }

    /// Stage 4: Write OpenClaw config remotely
    async fn stage_write_config(
        &self,
        host: &str,
        user: &str,
        config: &WizardConfig,
        tx: &mpsc::Sender<RemoteSetupProgress>,
    ) -> Result<()> {
        Self::send_progress(
            tx,
            "config",
            "in_progress",
            "Writing OpenClaw configuration...",
            None,
        )
        .await;

        // Build OpenClaw config JSON from WizardConfig
        let openclaw_config = Self::build_openclaw_config(config)?;
        let config_json = serde_json::to_string_pretty(&openclaw_config)
            .context("Failed to serialize OpenClaw config")?;

        // Shell-escape the JSON for safe transport via SSH
        // Use heredoc to avoid single-quote escaping issues
        let write_cmd = format!(
            r#"mkdir -p ~/.openclaw && cat > ~/.openclaw/openclaw.json << 'OPENCLAW_CONFIG_EOF'
{}
OPENCLAW_CONFIG_EOF"#,
            config_json
        );

        let output = self
            .ssh_service
            .exec_remote(host, user, &write_cmd)
            .await
            .context("Failed to write config remotely")?;

        if output.exit_code != 0 {
            let msg = format!("Failed to write config: {}", output.stderr.trim());
            Self::send_progress(tx, "config", "failed", &msg, Some(&msg)).await;
            anyhow::bail!(msg);
        }

        Self::send_progress(
            tx,
            "config",
            "completed",
            "OpenClaw configuration written to ~/.openclaw/openclaw.json",
            None,
        )
        .await;

        Ok(())
    }

    /// Stage 5: Install OpenClaw daemon
    async fn stage_install_daemon(
        &self,
        host: &str,
        user: &str,
        tx: &mpsc::Sender<RemoteSetupProgress>,
    ) -> Result<()> {
        Self::send_progress(
            tx,
            "daemon",
            "in_progress",
            "Installing OpenClaw daemon...",
            None,
        )
        .await;

        // Source nvm so openclaw binary is on PATH
        let daemon_cmd = r#"export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
openclaw install-daemon"#;

        let output = self
            .ssh_service
            .exec_remote(host, user, daemon_cmd)
            .await
            .context("Failed to install daemon")?;

        if output.exit_code != 0 {
            let msg = format!("Daemon installation failed: {}", output.stderr.trim());
            Self::send_progress(tx, "daemon", "failed", &msg, Some(&msg)).await;
            anyhow::bail!(msg);
        }

        Self::send_progress(
            tx,
            "daemon",
            "in_progress",
            "Daemon installed, preparing to start...",
            None,
        )
        .await;

        Ok(())
    }

    /// Stage 6: Start OpenClaw daemon
    async fn stage_start_daemon(
        &self,
        host: &str,
        user: &str,
        tx: &mpsc::Sender<RemoteSetupProgress>,
    ) -> Result<()> {
        Self::send_progress(
            tx,
            "daemon",
            "in_progress",
            "Starting OpenClaw daemon...",
            None,
        )
        .await;

        let start_cmd = r#"export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
openclaw start"#;

        let output = self
            .ssh_service
            .exec_remote(host, user, start_cmd)
            .await
            .context("Failed to start daemon")?;

        if output.exit_code != 0 {
            let msg = format!("Failed to start daemon: {}", output.stderr.trim());
            Self::send_progress(tx, "daemon", "failed", &msg, Some(&msg)).await;
            anyhow::bail!(msg);
        }

        Self::send_progress(
            tx,
            "daemon",
            "completed",
            "OpenClaw daemon started successfully",
            None,
        )
        .await;

        Ok(())
    }

    // ===== Helper Methods =====

    /// Build OpenClaw config JSON from WizardConfig
    fn build_openclaw_config(config: &WizardConfig) -> Result<serde_json::Value> {
        let mut oc_config = serde_json::json!({
            "ai": {
                "provider": config.provider,
                "apiKey": config.api_key,
                "authType": config.auth_type,
            },
            "gateway": {
                "port": config.gateway_port,
                "bind": config.gateway_bind,
            },
            "auth": {
                "mode": config.auth_mode,
            }
        });

        // Add auth credential if present
        if let Some(ref cred) = config.auth_credential {
            oc_config["auth"]["credential"] = serde_json::Value::String(cred.clone());
        }

        // Add channel configurations if present
        if let Some(ref channels) = config.channels {
            let channel_configs: Vec<serde_json::Value> = channels
                .iter()
                .map(|ch| {
                    let mut ch_json = serde_json::json!({
                        "platform": ch.platform,
                        "enabled": ch.enabled,
                        "dmPolicy": ch.dm_policy,
                        "allowedUsers": ch.allowed_users,
                    });
                    if let Some(ref token) = ch.bot_token {
                        ch_json["botToken"] = serde_json::Value::String(token.clone());
                    }
                    if let Some(ref app_token) = ch.app_token {
                        ch_json["appToken"] = serde_json::Value::String(app_token.clone());
                    }
                    ch_json
                })
                .collect();

            oc_config["channels"] = serde_json::Value::Array(channel_configs);
        }

        Ok(oc_config)
    }

    /// Parse major version from Node.js version string (e.g. "v22.12.0" -> 22)
    fn parse_node_major(version_str: &str) -> Option<u32> {
        let trimmed = version_str.trim().trim_start_matches('v');
        trimmed.split('.').next()?.parse().ok()
    }

    /// Send a progress update
    async fn send_progress(
        tx: &mpsc::Sender<RemoteSetupProgress>,
        stage: &str,
        status: &str,
        message: &str,
        error: Option<&str>,
    ) {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let progress = RemoteSetupProgress {
            stage: stage.to_string(),
            status: status.to_string(),
            message: message.to_string(),
            error: error.map(|s| s.to_string()),
            timestamp,
        };

        if tx.send(progress).await.is_err() {
            warn!("Progress receiver dropped, cannot send update");
        }
    }
}

impl Default for RemoteService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_node_major_valid() {
        assert_eq!(RemoteService::parse_node_major("v22.12.0"), Some(22));
        assert_eq!(RemoteService::parse_node_major("v18.0.0"), Some(18));
        assert_eq!(RemoteService::parse_node_major("v20.1.0"), Some(20));
    }

    #[test]
    fn test_parse_node_major_edge_cases() {
        assert_eq!(RemoteService::parse_node_major("22.12.0"), Some(22));
        assert_eq!(RemoteService::parse_node_major("  v22.12.0  "), Some(22));
        assert_eq!(RemoteService::parse_node_major(""), None);
        assert_eq!(RemoteService::parse_node_major("not-a-version"), None);
    }

    #[test]
    fn test_build_openclaw_config_basic() {
        let config = WizardConfig {
            provider: "openai".into(),
            api_key: "sk-test-123".into(),
            auth_type: "api-key".into(),
            gateway_port: 3000,
            gateway_bind: "127.0.0.1".into(),
            auth_mode: "none".into(),
            auth_credential: None,
            channels: None,
            base_url: None,
            model_id: None,
            compatibility: None,
            account_id: None,
            gateway_id: None,
        };

        let result = RemoteService::build_openclaw_config(&config).unwrap();
        assert_eq!(result["ai"]["provider"], "openai");
        assert_eq!(result["gateway"]["port"], 3000);
        assert_eq!(result["auth"]["mode"], "none");
    }

    #[test]
    fn test_build_openclaw_config_with_channels() {
        use crate::models::types::ChannelConfig;

        let config = WizardConfig {
            provider: "anthropic".into(),
            api_key: "sk-ant-test".into(),
            auth_type: "api-key".into(),
            gateway_port: 8080,
            gateway_bind: "0.0.0.0".into(),
            auth_mode: "bearer".into(),
            auth_credential: Some("my-secret".into()),
            channels: Some(vec![ChannelConfig {
                platform: "telegram".into(),
                enabled: true,
                bot_token: Some("123:ABC".into()),
                app_token: None,
                dm_policy: "allowlist".into(),
                allowed_users: vec!["user1".into()],
            }]),
            base_url: None,
            model_id: None,
            compatibility: None,
            account_id: None,
            gateway_id: None,
        };

        let result = RemoteService::build_openclaw_config(&config).unwrap();
        assert_eq!(result["auth"]["credential"], "my-secret");
        assert!(result["channels"].is_array());
        assert_eq!(result["channels"][0]["platform"], "telegram");
    }
}
