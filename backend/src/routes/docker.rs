//! # Docker Container Management Routes
//!
//! REST endpoints for Docker sandbox container lifecycle:
//! - GET  /api/docker/status     — Check Docker availability and version
//! - GET  /api/docker/containers — List managed containers
//! - POST /api/docker/create     — Create a new sandbox container
//! - POST /api/docker/{id}/stop  — Stop a running container
//! - DELETE /api/docker/{id}     — Remove a container
//! - GET  /api/docker/{id}/logs  — Fetch container logs
//!
//! SECURITY:
//! - All containers created with strict resource limits
//! - Container limit of 5 enforced at service layer
//! - Docker-not-available returns 200 with available: false (not an error)

use axum::Json;
use axum::extract::{Path, Query};
use serde::Deserialize;

use crate::error::AppError;
use crate::models::types::{
    ApiResponse, ContainerInfo, ContainerLogsResponse, DockerCreateRequest, DockerCreateResponse,
    DockerStatusResponse, EmptyResponse,
};
use crate::services::DockerService;

/// Query parameters for logs endpoint.
#[derive(Debug, Deserialize)]
pub struct LogsQuery {
    /// Number of log lines to return (default: 100).
    pub tail: Option<u32>,
}

/// GET /api/docker/status
///
/// Returns Docker daemon availability, version info, and current containers.
/// If Docker is not installed or the daemon is not running, returns 200
/// with `available: false` — this is not an error condition since the user
/// may not have Docker installed.
pub async fn docker_status() -> Json<DockerStatusResponse> {
    let service = DockerService::new();

    match service.check_available().await {
        Ok(status) => Json(status),
        Err(_) => Json(DockerStatusResponse {
            available: false,
            version: None,
            containers: vec![],
            error: Some("Failed to check Docker status".to_string()),
        }),
    }
}

/// GET /api/docker/containers
///
/// Lists all containers managed by OpenClaw Wizard (filtered by label).
pub async fn list_containers() -> Result<Json<ApiResponse<Vec<ContainerInfo>>>, AppError> {
    let service = DockerService::new();

    let containers = service.list_containers().await?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(containers),
        error: None,
    }))
}

/// POST /api/docker/create
///
/// Creates a new sandbox container with strict security limits.
/// Returns 429 if the container limit (5) is exceeded.
pub async fn create_container(
    Json(request): Json<DockerCreateRequest>,
) -> Result<Json<DockerCreateResponse>, AppError> {
    let service = DockerService::new();

    let response = service.create_sandbox(&request).await?;

    Ok(Json(response))
}

/// POST /api/docker/{id}/stop
///
/// Stops a running container with a 10-second timeout.
pub async fn stop_container(Path(id): Path<String>) -> Result<Json<EmptyResponse>, AppError> {
    let service = DockerService::new();

    service.stop_container(&id).await?;

    Ok(Json(EmptyResponse {
        success: true,
        error: None,
    }))
}

/// DELETE /api/docker/{id}
///
/// Force removes a container (also stops it if running).
pub async fn remove_container(Path(id): Path<String>) -> Result<Json<EmptyResponse>, AppError> {
    let service = DockerService::new();

    service.remove_container(&id).await?;

    Ok(Json(EmptyResponse {
        success: true,
        error: None,
    }))
}

/// GET /api/docker/{id}/logs
///
/// Fetches the last N lines of logs from a container.
/// Query parameter `tail` controls how many lines to return (default: 100).
pub async fn container_logs(
    Path(id): Path<String>,
    Query(query): Query<LogsQuery>,
) -> Result<Json<ContainerLogsResponse>, AppError> {
    let service = DockerService::new();

    let tail = query.tail.unwrap_or(100);
    let logs = service.get_container_logs(&id, tail).await?;

    Ok(Json(logs))
}
