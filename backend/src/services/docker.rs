//! # Docker Service
//!
//! Manages Docker container lifecycle with strict security enforcement.
//! Connects to the local Docker daemon via bollard and provides
//! container CRUD operations for the OpenClaw sandbox mode.

use bollard::container::LogOutput;
use bollard::models::{ContainerCreateBody, HostConfig, PortBinding};
use bollard::query_parameters::{
    CreateContainerOptions, ListContainersOptions, LogsOptions, RemoveContainerOptions,
    StopContainerOptions,
};
use bollard::Docker;
use futures::StreamExt;
use std::collections::HashMap;
use tracing::{error, info, warn};

use crate::error::AppError;
use crate::models::types::{
    ContainerInfo, ContainerLogsResponse, ContainerStatus, DockerCreateRequest,
    DockerCreateResponse, DockerStatusResponse,
};

/// Maximum number of OpenClaw-managed containers allowed simultaneously.
const MAX_CONTAINERS: usize = 5;

/// Default Docker image for sandbox containers.
const DEFAULT_IMAGE: &str = "node:20-alpine";

/// Label used to identify containers managed by OpenClaw Wizard.
const OPENCLAW_LABEL: &str = "openclaw-wizard";

pub struct DockerService {
    client: Option<Docker>,
}

impl DockerService {
    /// Create a new DockerService. Attempts to connect to the local Docker daemon.
    /// If Docker is not available, the service is created with client = None
    /// and all operations will return appropriate "not available" responses.
    pub fn new() -> Self {
        match Docker::connect_with_socket_defaults() {
            Ok(client) => {
                info!("Docker client connected successfully");
                Self {
                    client: Some(client),
                }
            }
            Err(e) => {
                warn!("Docker not available: {}. Container features disabled.", e);
                Self { client: None }
            }
        }
    }

    /// Get a reference to the Docker client, returning an error if Docker is not available.
    fn require_client(&self) -> Result<&Docker, AppError> {
        self.client.as_ref().ok_or_else(|| {
            AppError::DockerNotAvailable(
                "Docker is not available. Please install Docker and ensure the daemon is running."
                    .to_string(),
            )
        })
    }

    /// Check if Docker is available and return status information.
    pub async fn check_available(&self) -> Result<DockerStatusResponse, AppError> {
        let client = match &self.client {
            Some(c) => c,
            None => {
                return Ok(DockerStatusResponse {
                    available: false,
                    version: None,
                    containers: vec![],
                    error: Some(
                        "Docker is not installed or the daemon is not running.".to_string(),
                    ),
                });
            }
        };

        // Ping Docker to verify connectivity
        match client.ping().await {
            Ok(_) => {}
            Err(e) => {
                return Ok(DockerStatusResponse {
                    available: false,
                    version: None,
                    containers: vec![],
                    error: Some(format!("Docker daemon unreachable: {}", e)),
                });
            }
        }

        // Get Docker version
        let version = match client.version().await {
            Ok(v) => v.version,
            Err(_) => None,
        };

        // List our managed containers
        let containers = self.list_containers().await.unwrap_or_default();

        Ok(DockerStatusResponse {
            available: true,
            version,
            containers,
            error: None,
        })
    }

    /// List all containers managed by OpenClaw Wizard (filtered by label).
    pub async fn list_containers(&self) -> Result<Vec<ContainerInfo>, AppError> {
        let client = self.require_client()?;

        let mut filters = HashMap::new();
        filters.insert(
            "label".to_string(),
            vec![format!("{}=true", OPENCLAW_LABEL)],
        );

        let options = ListContainersOptions {
            all: true,
            filters: Some(filters),
            ..Default::default()
        };

        let containers = client
            .list_containers(Some(options))
            .await
            .map_err(|e| AppError::DockerOperationFailed(format!("Failed to list containers: {}", e)))?;

        let result: Vec<ContainerInfo> = containers
            .into_iter()
            .map(|c| {
                let status = match c.state {
                    Some(bollard::models::ContainerSummaryStateEnum::RUNNING) => {
                        ContainerStatus::Running
                    }
                    Some(bollard::models::ContainerSummaryStateEnum::CREATED) => {
                        ContainerStatus::Created
                    }
                    Some(bollard::models::ContainerSummaryStateEnum::EXITED) => {
                        ContainerStatus::Exited
                    }
                    _ => ContainerStatus::Stopped,
                };

                // Extract the mapped host port for container port 3000
                let port = c
                    .ports
                    .as_ref()
                    .and_then(|ports| {
                        ports.iter().find_map(|p| {
                            if p.private_port == 3000 {
                                p.public_port
                            } else {
                                None
                            }
                        })
                    });

                let name = c
                    .names
                    .and_then(|names| {
                        names
                            .first()
                            .map(|n| n.trim_start_matches('/').to_string())
                    })
                    .unwrap_or_default();

                let created_at = c
                    .created
                    .map(|ts| {
                        chrono::DateTime::from_timestamp(ts, 0)
                            .map(|dt| dt.to_rfc3339())
                            .unwrap_or_default()
                    })
                    .unwrap_or_default();

                ContainerInfo {
                    id: c.id.unwrap_or_default(),
                    name,
                    image: c.image.unwrap_or_default(),
                    status,
                    created_at,
                    port,
                }
            })
            .collect();

        Ok(result)
    }

    /// Create a new sandbox container with strict security limits.
    ///
    /// Security enforcement:
    /// - Memory: 512MB hard limit, no swap
    /// - CPU: 1 core (1e9 nanocpus)
    /// - PIDs: max 100 (prevents fork bombs)
    /// - Capabilities: drop ALL, add only NET_BIND_SERVICE
    /// - Security: no-new-privileges
    /// - User: "node" (non-root)
    /// - NEVER mounts Docker socket
    pub async fn create_sandbox(
        &self,
        request: &DockerCreateRequest,
    ) -> Result<DockerCreateResponse, AppError> {
        let client = self.require_client()?;

        // Enforce container limit
        let existing = self.list_containers().await?;
        if existing.len() >= MAX_CONTAINERS {
            return Err(AppError::ContainerLimitExceeded(format!(
                "Maximum of {} containers allowed. Remove existing containers first.",
                MAX_CONTAINERS
            )));
        }

        let image = request
            .image
            .as_deref()
            .unwrap_or(DEFAULT_IMAGE)
            .to_string();

        // Build port bindings: container 3000 -> random host port on 127.0.0.1
        let mut port_bindings = HashMap::new();
        port_bindings.insert(
            "3000/tcp".to_string(),
            Some(vec![PortBinding {
                host_ip: Some("127.0.0.1".to_string()),
                host_port: Some("0".to_string()), // random port
            }]),
        );

        // Strict security HostConfig
        let host_config = HostConfig {
            memory: Some(512 * 1024 * 1024),      // 512MB
            memory_swap: Some(512 * 1024 * 1024),  // No swap (same as memory)
            nano_cpus: Some(1_000_000_000),         // 1 CPU
            pids_limit: Some(100),                  // Prevent fork bombs
            security_opt: Some(vec!["no-new-privileges:true".to_string()]),
            cap_drop: Some(vec!["ALL".to_string()]),
            cap_add: Some(vec!["NET_BIND_SERVICE".to_string()]),
            readonly_rootfs: Some(false), // OpenClaw needs to write to filesystem
            port_bindings: Some(port_bindings),
            // CRITICAL: No binds, no Docker socket mounting
            ..Default::default()
        };

        // Labels to identify our containers
        let mut labels = HashMap::new();
        labels.insert(OPENCLAW_LABEL.to_string(), "true".to_string());

        let config = ContainerCreateBody {
            image: Some(image.clone()),
            user: Some("node".to_string()), // Non-root user (exists in node:20-alpine)
            host_config: Some(host_config),
            labels: Some(labels),
            exposed_ports: Some(vec!["3000/tcp".to_string()]),
            env: Some(vec!["OPENCLAW_SANDBOX=true".to_string()]),
            ..Default::default()
        };

        let options = CreateContainerOptions {
            name: Some(request.name.clone()),
            ..Default::default()
        };

        // Create the container
        let create_response = match client.create_container(Some(options), config).await {
            Ok(resp) => resp,
            Err(e) => {
                error!("Failed to create container: {}", e);
                return Ok(DockerCreateResponse {
                    success: false,
                    container_id: None,
                    port: None,
                    error: Some(format!("Failed to create container: {}", e)),
                });
            }
        };

        let container_id = create_response.id.clone();

        // Start the container
        if let Err(e) = client
            .start_container(&container_id, None)
            .await
        {
            error!("Failed to start container {}: {}", container_id, e);
            // Attempt to remove the failed container
            let _ = client
                .remove_container(
                    &container_id,
                    Some(RemoveContainerOptions {
                        force: true,
                        ..Default::default()
                    }),
                )
                .await;
            return Ok(DockerCreateResponse {
                success: false,
                container_id: None,
                port: None,
                error: Some(format!("Container created but failed to start: {}", e)),
            });
        }

        // Inspect to get the mapped host port
        let mapped_port = match client.inspect_container(&container_id, None).await {
            Ok(inspect) => inspect
                .network_settings
                .and_then(|ns| ns.ports)
                .and_then(|ports| ports.get("3000/tcp").cloned())
                .flatten()
                .and_then(|bindings| bindings.first().cloned())
                .and_then(|binding| binding.host_port)
                .and_then(|p| p.parse::<u16>().ok()),
            Err(e) => {
                warn!("Could not inspect container for port mapping: {}", e);
                None
            }
        };

        info!(
            "Container {} created and started (port: {:?})",
            container_id, mapped_port
        );

        Ok(DockerCreateResponse {
            success: true,
            container_id: Some(container_id),
            port: mapped_port,
            error: None,
        })
    }

    /// Stop a running container with a 10-second timeout.
    pub async fn stop_container(&self, container_id: &str) -> Result<(), AppError> {
        let client = self.require_client()?;

        let options = StopContainerOptions {
            t: Some(10),
            ..Default::default()
        };

        client
            .stop_container(container_id, Some(options))
            .await
            .map_err(|e| {
                if e.to_string().contains("No such container") {
                    AppError::ContainerNotFound(format!("Container {} not found", container_id))
                } else {
                    AppError::DockerOperationFailed(format!(
                        "Failed to stop container {}: {}",
                        container_id, e
                    ))
                }
            })?;

        info!("Container {} stopped", container_id);
        Ok(())
    }

    /// Force remove a container (stops it first if running).
    pub async fn remove_container(&self, container_id: &str) -> Result<(), AppError> {
        let client = self.require_client()?;

        let options = RemoveContainerOptions {
            force: true,
            ..Default::default()
        };

        client
            .remove_container(container_id, Some(options))
            .await
            .map_err(|e| {
                if e.to_string().contains("No such container") {
                    AppError::ContainerNotFound(format!("Container {} not found", container_id))
                } else {
                    AppError::DockerOperationFailed(format!(
                        "Failed to remove container {}: {}",
                        container_id, e
                    ))
                }
            })?;

        info!("Container {} removed", container_id);
        Ok(())
    }

    /// Fetch the last N lines of logs from a container.
    pub async fn get_container_logs(
        &self,
        container_id: &str,
        tail: u32,
    ) -> Result<ContainerLogsResponse, AppError> {
        let client = self.require_client()?;

        let options = LogsOptions {
            stdout: true,
            stderr: true,
            tail: tail.to_string(),
            ..Default::default()
        };

        let mut stream = client.logs(container_id, Some(options));
        let mut logs = Vec::new();

        while let Some(result) = stream.next().await {
            match result {
                Ok(output) => {
                    let line = match output {
                        LogOutput::StdOut { message } => {
                            String::from_utf8_lossy(&message).to_string()
                        }
                        LogOutput::StdErr { message } => {
                            String::from_utf8_lossy(&message).to_string()
                        }
                        LogOutput::Console { message } => {
                            String::from_utf8_lossy(&message).to_string()
                        }
                        LogOutput::StdIn { message } => {
                            String::from_utf8_lossy(&message).to_string()
                        }
                    };
                    // Trim trailing newline
                    logs.push(line.trim_end_matches('\n').to_string());
                }
                Err(e) => {
                    if e.to_string().contains("No such container") {
                        return Err(AppError::ContainerNotFound(format!(
                            "Container {} not found",
                            container_id
                        )));
                    }
                    return Err(AppError::DockerOperationFailed(format!(
                        "Failed to read logs from container {}: {}",
                        container_id, e
                    )));
                }
            }
        }

        Ok(ContainerLogsResponse {
            container_id: container_id.to_string(),
            logs,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_creates_service() {
        // DockerService::new() should never panic, even without Docker
        let service = DockerService::new();
        // Client may or may not be Some depending on the environment
        assert!(service.client.is_some() || service.client.is_none());
    }

    #[test]
    fn test_require_client_when_none() {
        let service = DockerService { client: None };
        let result = service.require_client();
        assert!(result.is_err());
    }

    #[test]
    fn test_max_containers_constant() {
        assert_eq!(MAX_CONTAINERS, 5);
    }

    #[test]
    fn test_default_image_constant() {
        assert_eq!(DEFAULT_IMAGE, "node:20-alpine");
    }
}
