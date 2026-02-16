//! # Multi-Server REST & WebSocket Routes
//!
//! HTTP endpoints for server management (CRUD, test, rollback) and
//! WebSocket for multi-server deployment progress streaming.
//!
//! Endpoints:
//! - GET    /api/multi-server/servers — List all server targets
//! - POST   /api/multi-server/servers — Add a new server target
//! - DELETE /api/multi-server/servers/{id} — Remove a server target
//! - POST   /api/multi-server/servers/{id}/test — Test server connection
//! - POST   /api/multi-server/rollback/{id} — Rollback a deployed server
//! - GET    /ws/multi-server/deploy — WebSocket for deployment progress

use axum::{
    Json,
    extract::{
        Path,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::Response,
};
use tokio::sync::mpsc;
use tracing::{error, info, warn};

use crate::error::AppError;
use crate::models::types::{
    ApiResponse, EmptyResponse, MultiServerDeployRequest, MultiServerProgress, ServerDeployResult,
    ServerListResponse, ServerTarget, ServerTestResult, WizardConfig, WsMessage,
};
use crate::services::multi_server::MultiServerOrchestrator;

/// GET /api/multi-server/servers
///
/// Returns list of all configured server targets.
pub async fn get_servers() -> Result<Json<ApiResponse<ServerListResponse>>, AppError> {
    let servers = MultiServerOrchestrator::load_servers()
        .map_err(|e| AppError::InternalError(format!("Failed to load servers: {}", e)))?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(ServerListResponse { servers }),
        error: None,
    }))
}

/// POST /api/multi-server/servers
///
/// Add a new server target. Auto-generates ID if empty.
pub async fn add_server(
    Json(server): Json<ServerTarget>,
) -> Result<Json<ApiResponse<ServerTarget>>, AppError> {
    let created = MultiServerOrchestrator::add_server(server)
        .map_err(|e| AppError::InternalError(format!("Failed to add server: {}", e)))?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(created),
        error: None,
    }))
}

/// DELETE /api/multi-server/servers/{id}
///
/// Remove a server target by ID.
pub async fn remove_server(Path(id): Path<String>) -> Result<Json<EmptyResponse>, AppError> {
    MultiServerOrchestrator::remove_server(&id)
        .map_err(|e| AppError::ServerNotFound(e.to_string()))?;

    Ok(Json(EmptyResponse {
        success: true,
        error: None,
    }))
}

/// POST /api/multi-server/servers/{id}/test
///
/// Test SSH connection to a specific server.
pub async fn test_server(
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<ServerTestResult>>, AppError> {
    let result = MultiServerOrchestrator::test_server(&id)
        .await
        .map_err(|e| AppError::ServerNotFound(e.to_string()))?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(result),
        error: None,
    }))
}

/// POST /api/multi-server/rollback/{id}
///
/// Rollback a deployed server (stop daemon, remove config, uninstall).
pub async fn rollback_server(
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<ServerDeployResult>>, AppError> {
    let result = MultiServerOrchestrator::rollback_server(&id)
        .await
        .map_err(|e| AppError::DeploymentFailed(e.to_string()))?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(result),
        error: None,
    }))
}

/// GET /ws/multi-server/deploy — WebSocket upgrade handler
///
/// Expects first message to be a JSON MultiServerDeployRequest.
/// Streams MultiServerProgress messages per server during deployment.
pub async fn ws_multi_server_deploy(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(handle_multi_server_deploy_socket)
}

/// Handle the multi-server deployment WebSocket connection
async fn handle_multi_server_deploy_socket(mut socket: WebSocket) {
    info!("Multi-server deploy WebSocket connection established");

    // Wait for the first message with deployment parameters
    let deploy_request = match socket.recv().await {
        Some(Ok(Message::Text(text))) => {
            // Try parsing as WsMessage envelope first
            if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
                match serde_json::from_value::<MultiServerDeployRequest>(ws_msg.payload) {
                    Ok(req) => req,
                    Err(e) => {
                        warn!(
                            "Failed to parse MultiServerDeployRequest from WsMessage: {}",
                            e
                        );
                        let _ = send_deploy_error(&mut socket, "Invalid deployment request format")
                            .await;
                        return;
                    }
                }
            }
            // Try parsing directly as MultiServerDeployRequest
            else if let Ok(req) = serde_json::from_str::<MultiServerDeployRequest>(&text) {
                req
            } else {
                warn!("Failed to parse deploy request");
                let _ = send_deploy_error(&mut socket, "Invalid JSON message format").await;
                return;
            }
        }
        Some(Ok(Message::Close(_))) | None => {
            info!("Multi-server deploy WebSocket closed before request");
            return;
        }
        _ => {
            warn!("Unexpected WebSocket message type");
            return;
        }
    };

    info!(
        "Starting multi-server deployment for {} servers",
        deploy_request.server_ids.len()
    );

    // Load saved WizardConfig from disk
    let config = match load_wizard_config_for_deploy() {
        Ok(config) => config,
        Err(e) => {
            error!("Failed to load wizard config: {}", e);
            let _ = send_deploy_error(
                &mut socket,
                "Failed to load wizard configuration. Complete the setup wizard first.",
            )
            .await;
            return;
        }
    };

    // Create progress channel
    let (tx, mut rx) = mpsc::channel::<MultiServerProgress>(100);

    // Spawn the deployment task
    let server_ids = deploy_request.server_ids.clone();
    tokio::spawn(async move {
        let results = MultiServerOrchestrator::deploy_to_servers(server_ids, config, tx).await;

        // Results are already stored in the server list by the orchestrator
        info!(
            "Multi-server deployment complete: {}/{} successful",
            results.iter().filter(|r| r.success).count(),
            results.len()
        );
    });

    // Forward progress updates to WebSocket
    while let Some(progress) = rx.recv().await {
        let response = WsMessage {
            msg_type: "multi-server-progress".into(),
            payload: serde_json::to_value(&progress).unwrap_or_default(),
        };

        let json = serde_json::to_string(&response).unwrap_or_default();
        if socket.send(Message::Text(json.into())).await.is_err() {
            warn!("Failed to send progress update, client disconnected");
            break;
        }
    }

    info!("Multi-server deploy WebSocket connection closed");
}

/// Send an error message over the deploy WebSocket
async fn send_deploy_error(socket: &mut WebSocket, message: &str) -> Result<(), ()> {
    let progress = MultiServerProgress {
        server_id: "system".to_string(),
        server_name: "System".to_string(),
        stage: "error".to_string(),
        status: "failed".to_string(),
        message: message.to_string(),
        error: Some(message.to_string()),
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };

    let response = WsMessage {
        msg_type: "multi-server-progress".into(),
        payload: serde_json::to_value(&progress).unwrap_or_default(),
    };

    let json = serde_json::to_string(&response).unwrap_or_default();
    socket
        .send(Message::Text(json.into()))
        .await
        .map_err(|_| ())
}

/// Load WizardConfig from saved openclaw.json for deployment
fn load_wizard_config_for_deploy() -> anyhow::Result<WizardConfig> {
    use crate::services::platform::Platform;

    let config_dir = Platform::config_dir()
        .map_err(|e| anyhow::anyhow!("Failed to find config directory: {}", e))?;
    let config_path = config_dir.join("openclaw.json");

    let config_str = std::fs::read_to_string(&config_path)
        .map_err(|e| anyhow::anyhow!("Config not found at {}: {}", config_path.display(), e))?;

    let raw: serde_json::Value = serde_json::from_str(&config_str)
        .map_err(|e| anyhow::anyhow!("Invalid config JSON: {}", e))?;

    let provider = raw["ai"]["provider"]
        .as_str()
        .unwrap_or("anthropic")
        .to_string();
    let api_key = raw["ai"]["apiKey"].as_str().unwrap_or("").to_string();
    let auth_type = match raw["ai"]["auth"].as_str().unwrap_or("api-key") {
        "token" => "setup-token".to_string(),
        other => other.to_string(),
    };
    let gateway_port = raw["gateway"]["port"].as_u64().unwrap_or(3000) as u16;
    let gateway_bind = raw["gateway"]["bind"]
        .as_str()
        .unwrap_or("127.0.0.1")
        .to_string();
    let auth_mode = raw["gateway"]["auth"]["mode"]
        .as_str()
        .unwrap_or("none")
        .to_string();
    let auth_credential = raw["gateway"]["auth"]["credential"]
        .as_str()
        .map(|s| s.to_string());

    Ok(WizardConfig {
        provider,
        api_key,
        auth_type,
        gateway_port,
        gateway_bind,
        auth_mode,
        auth_credential,
        channels: None,
        base_url: None,
        model_id: None,
        compatibility: None,
        account_id: None,
        gateway_id: None,
    })
}
