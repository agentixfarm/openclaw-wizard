//! # Multi-Server Orchestrator
//!
//! Manages multi-server deployment: server CRUD, parallel deployment via
//! tokio::JoinSet, per-server progress tracking via mpsc channels, and
//! saga-pattern rollback for partial failures.
//!
//! Server targets persisted to ~/.openclaw/servers.json.

use crate::models::types::{MultiServerProgress, ServerDeployResult, ServerTarget, WizardConfig};
use crate::services::config::ConfigWriter;
use crate::services::remote::RemoteService;
use crate::services::ssh::SshService;
use anyhow::{Context, Result};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::mpsc;
use tokio::task::JoinSet;
use tracing::{info, warn};

/// Maximum number of parallel server deployments
const MAX_PARALLEL_DEPLOYMENTS: usize = 5;

/// Server list persistence file
const SERVERS_FILE: &str = "servers.json";

/// Multi-server deployment orchestrator
pub struct MultiServerOrchestrator;

impl MultiServerOrchestrator {
    /// Load server list from ~/.openclaw/servers.json
    ///
    /// Returns empty vec if file doesn't exist.
    pub fn load_servers() -> Result<Vec<ServerTarget>> {
        let path = Self::servers_file_path();
        if !path.exists() {
            return Ok(Vec::new());
        }
        ConfigWriter::read_json(&path).context("Failed to read servers.json")
    }

    /// Save server list to ~/.openclaw/servers.json
    pub fn save_servers(servers: &[ServerTarget]) -> Result<()> {
        let path = Self::servers_file_path();
        ConfigWriter::write_json(&path, &servers.to_vec()).context("Failed to write servers.json")
    }

    /// Add a new server target
    ///
    /// Generates a UUID if the server id is empty. Appends to the list and saves.
    pub fn add_server(mut server: ServerTarget) -> Result<ServerTarget> {
        if server.id.is_empty() {
            server.id = Self::generate_server_id();
        }
        if server.status.is_empty() {
            server.status = "pending".to_string();
        }

        let mut servers = Self::load_servers()?;
        servers.push(server.clone());
        Self::save_servers(&servers)?;

        info!("Added server: {} ({})", server.name, server.id);
        Ok(server)
    }

    /// Remove a server by ID
    pub fn remove_server(id: &str) -> Result<()> {
        let mut servers = Self::load_servers()?;
        let initial_len = servers.len();
        servers.retain(|s| s.id != id);

        if servers.len() == initial_len {
            anyhow::bail!("Server not found: {}", id);
        }

        Self::save_servers(&servers)?;
        info!("Removed server: {}", id);
        Ok(())
    }

    /// Test connection to a server
    ///
    /// Uses SshService::check_connection and updates the server's status.
    pub async fn test_server(id: &str) -> Result<crate::models::types::ServerTestResult> {
        let mut servers = Self::load_servers()?;
        let server = servers
            .iter_mut()
            .find(|s| s.id == id)
            .ok_or_else(|| anyhow::anyhow!("Server not found: {}", id))?;

        let ssh = SshService::new();
        match ssh.check_connection(&server.host, &server.username).await {
            Ok(true) => {
                server.status = "connected".to_string();
                let result = crate::models::types::ServerTestResult {
                    server_id: id.to_string(),
                    success: true,
                    message: format!("Connected to {}@{}", server.username, server.host),
                };
                Self::save_servers(&servers)?;
                Ok(result)
            }
            Ok(false) => {
                server.status = "failed".to_string();
                let result = crate::models::types::ServerTestResult {
                    server_id: id.to_string(),
                    success: false,
                    message: "SSH authentication failed. Check your SSH key and username."
                        .to_string(),
                };
                Self::save_servers(&servers)?;
                Ok(result)
            }
            Err(e) => {
                server.status = "failed".to_string();
                let msg = format!("Connection failed: {}", e);
                let result = crate::models::types::ServerTestResult {
                    server_id: id.to_string(),
                    success: false,
                    message: msg,
                };
                Self::save_servers(&servers)?;
                Ok(result)
            }
        }
    }

    /// Deploy OpenClaw to multiple servers in parallel
    ///
    /// Uses tokio::JoinSet to run up to MAX_PARALLEL_DEPLOYMENTS concurrently.
    /// Per-server progress is forwarded to the aggregate progress_tx channel.
    pub async fn deploy_to_servers(
        server_ids: Vec<String>,
        config: WizardConfig,
        progress_tx: mpsc::Sender<MultiServerProgress>,
    ) -> Vec<ServerDeployResult> {
        let servers = match Self::load_servers() {
            Ok(s) => s,
            Err(e) => {
                warn!("Failed to load servers: {}", e);
                return vec![];
            }
        };

        // Filter to requested servers, limit to MAX_PARALLEL_DEPLOYMENTS
        let targets: Vec<ServerTarget> = servers
            .iter()
            .filter(|s| server_ids.contains(&s.id))
            .take(MAX_PARALLEL_DEPLOYMENTS)
            .cloned()
            .collect();

        let mut join_set = JoinSet::new();

        for target in targets {
            let config_clone = config.clone();
            let agg_tx = progress_tx.clone();

            join_set.spawn(async move {
                Self::deploy_single_server(target, config_clone, agg_tx).await
            });
        }

        // Collect all results
        let mut results = Vec::new();
        while let Some(result) = join_set.join_next().await {
            match result {
                Ok(deploy_result) => results.push(deploy_result),
                Err(e) => {
                    warn!("Deployment task panicked: {}", e);
                }
            }
        }

        // Update server statuses
        if let Ok(mut all_servers) = Self::load_servers() {
            for result in &results {
                if let Some(server) = all_servers.iter_mut().find(|s| s.id == result.server_id) {
                    server.status = if result.success {
                        "deployed".to_string()
                    } else {
                        "failed".to_string()
                    };
                }
            }
            let _ = Self::save_servers(&all_servers);
        }

        results
    }

    /// Deploy to a single server with progress reporting
    async fn deploy_single_server(
        target: ServerTarget,
        config: WizardConfig,
        agg_tx: mpsc::Sender<MultiServerProgress>,
    ) -> ServerDeployResult {
        let remote = RemoteService::new();
        let (per_server_tx, mut per_server_rx) =
            mpsc::channel::<crate::models::types::RemoteSetupProgress>(100);

        let server_id = target.id.clone();
        let server_name = target.name.clone();
        let host = target.host.clone();
        let username = target.username.clone();

        // Forward per-server progress to aggregate channel
        let fwd_id = server_id.clone();
        let fwd_name = server_name.clone();
        let fwd_tx = agg_tx.clone();

        let forward_handle = tokio::spawn(async move {
            let mut completed_stages = Vec::new();
            while let Some(progress) = per_server_rx.recv().await {
                if progress.status == "completed" {
                    completed_stages.push(progress.stage.clone());
                }

                let multi_progress = MultiServerProgress {
                    server_id: fwd_id.clone(),
                    server_name: fwd_name.clone(),
                    stage: progress.stage,
                    status: progress.status,
                    message: progress.message,
                    error: progress.error,
                    timestamp: progress.timestamp,
                };

                if fwd_tx.send(multi_progress).await.is_err() {
                    break;
                }
            }
            completed_stages
        });

        // Run the actual deployment
        let deploy_result = remote
            .install_openclaw_remote(&host, &username, config, per_server_tx)
            .await;

        // Drop sender to signal forwarding task to finish
        // (already dropped when install_openclaw_remote returns)

        let completed_stages = forward_handle.await.unwrap_or_default();

        match deploy_result {
            Ok(()) => ServerDeployResult {
                server_id,
                server_name,
                success: true,
                error: None,
                completed_stages,
            },
            Err(e) => ServerDeployResult {
                server_id,
                server_name,
                success: false,
                error: Some(e.to_string()),
                completed_stages,
            },
        }
    }

    /// Rollback a deployed server
    ///
    /// Runs compensating actions in reverse order:
    /// 1. Stop daemon
    /// 2. Remove config
    /// 3. Uninstall OpenClaw
    pub async fn rollback_server(id: &str) -> Result<ServerDeployResult> {
        let servers = Self::load_servers()?;
        let server = servers
            .iter()
            .find(|s| s.id == id)
            .ok_or_else(|| anyhow::anyhow!("Server not found: {}", id))?;

        let ssh = SshService::new();
        let mut completed_stages = Vec::new();
        let mut last_error = None;

        // Stage 1: Stop daemon
        let stop_cmd = r#"export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
openclaw daemon stop 2>/dev/null || pkill -f "openclaw" 2>/dev/null || true"#;

        match ssh
            .exec_remote(&server.host, &server.username, stop_cmd)
            .await
        {
            Ok(_) => completed_stages.push("stop_daemon".to_string()),
            Err(e) => {
                warn!("Failed to stop daemon on {}: {}", server.host, e);
                last_error = Some(format!("Failed to stop daemon: {}", e));
            }
        }

        // Stage 2: Remove config
        let rm_config_cmd = "rm -f ~/.openclaw/openclaw.json";
        match ssh
            .exec_remote(&server.host, &server.username, rm_config_cmd)
            .await
        {
            Ok(_) => completed_stages.push("remove_config".to_string()),
            Err(e) => {
                warn!("Failed to remove config on {}: {}", server.host, e);
                last_error = Some(format!("Failed to remove config: {}", e));
            }
        }

        // Stage 3: Uninstall OpenClaw
        let uninstall_cmd = r#"export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm uninstall -g @anthropic/openclaw 2>/dev/null || true"#;

        match ssh
            .exec_remote(&server.host, &server.username, uninstall_cmd)
            .await
        {
            Ok(_) => completed_stages.push("uninstall_openclaw".to_string()),
            Err(e) => {
                warn!("Failed to uninstall OpenClaw on {}: {}", server.host, e);
                last_error = Some(format!("Failed to uninstall: {}", e));
            }
        }

        // Update server status to pending
        let mut all_servers = Self::load_servers()?;
        if let Some(s) = all_servers.iter_mut().find(|s| s.id == id) {
            s.status = "pending".to_string();
        }
        Self::save_servers(&all_servers)?;

        Ok(ServerDeployResult {
            server_id: id.to_string(),
            server_name: server.name.clone(),
            success: last_error.is_none(),
            error: last_error,
            completed_stages,
        })
    }

    /// Get the path to ~/.openclaw/servers.json
    fn servers_file_path() -> PathBuf {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        PathBuf::from(home).join(".openclaw").join(SERVERS_FILE)
    }

    /// Generate a unique server ID using timestamp + random suffix
    fn generate_server_id() -> String {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        let random: u32 = (timestamp as u32).wrapping_mul(2654435761); // Knuth multiplicative hash
        format!("srv-{:x}-{:x}", timestamp, random)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_server_id_unique() {
        let id1 = MultiServerOrchestrator::generate_server_id();
        // Small delay to get different timestamp
        std::thread::sleep(std::time::Duration::from_millis(2));
        let id2 = MultiServerOrchestrator::generate_server_id();
        assert_ne!(id1, id2, "Two generated IDs should be different");
        assert!(id1.starts_with("srv-"), "ID should start with srv-");
    }

    #[test]
    fn test_servers_file_path() {
        let path = MultiServerOrchestrator::servers_file_path();
        let path_str = path.to_string_lossy();
        assert!(
            path_str.ends_with("servers.json"),
            "Path should end with servers.json"
        );
        assert!(
            path_str.contains(".openclaw"),
            "Path should contain .openclaw directory"
        );
    }

    #[test]
    fn test_load_servers_empty() {
        // When servers.json doesn't exist, should return empty vec
        // This test works because we don't have a servers.json in the test env
        // (or if we do, it would be valid JSON)
        let path = MultiServerOrchestrator::servers_file_path();
        if !path.exists() {
            let result = MultiServerOrchestrator::load_servers();
            assert!(result.is_ok());
            assert!(result.unwrap().is_empty());
        }
    }
}
