//! # Remote Setup Routes
//!
//! REST and WebSocket endpoints for SSH-based remote VPS installation.
//!
//! Endpoints:
//! - POST /api/remote/test-connection — Test SSH connection and store credentials
//! - GET  /ws/remote/install — WebSocket for streaming installation progress
//!
//! SECURITY:
//! - SSH key paths are stored in keychain, not passed via WebSocket
//! - Input validation on hostname and username
//! - Never logs SSH credentials

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::Response,
    Json,
};
use tokio::sync::mpsc;
use tracing::{error, info, warn};

use crate::error::AppError;
use crate::models::{
    RemoteInstallRequest, RemoteSetupProgress, SshConnectionRequest, SshConnectionResponse,
    SshConnection, WizardConfig, WsMessage,
};
use crate::services::remote::RemoteService;
use crate::services::ssh::SshService;

/// POST /api/remote/test-connection
///
/// Validates SSH credentials, stores key path in platform keychain,
/// and tests the connection. Returns success/failure with details.
pub async fn test_ssh_connection(
    Json(request): Json<SshConnectionRequest>,
) -> Result<Json<SshConnectionResponse>, AppError> {
    let ssh_service = SshService::new();

    // Store SSH key path in keychain before testing
    ssh_service
        .store_ssh_key_path(&request.host, &request.username, &request.key_path)
        .map_err(|e| AppError::KeyringError(e.to_string()))?;

    // Test connection
    match ssh_service
        .check_connection(&request.host, &request.username)
        .await
    {
        Ok(true) => {
            info!(
                "SSH connection test successful: {}@{}",
                request.username, request.host
            );
            Ok(Json(SshConnectionResponse {
                success: true,
                message: "SSH connection successful".into(),
                connection: Some(SshConnection {
                    host: request.host,
                    username: request.username,
                    key_path: request.key_path,
                    connected: true,
                    error: None,
                }),
            }))
        }
        Ok(false) => {
            warn!(
                "SSH auth failed: {}@{}",
                request.username, request.host
            );
            Ok(Json(SshConnectionResponse {
                success: false,
                message: "SSH authentication failed. Check your SSH key and username.".into(),
                connection: Some(SshConnection {
                    host: request.host,
                    username: request.username,
                    key_path: request.key_path,
                    connected: false,
                    error: Some("Authentication failed".into()),
                }),
            }))
        }
        Err(e) => {
            error!(
                "SSH connection error for {}@{}: {}",
                request.username, request.host, e
            );
            Ok(Json(SshConnectionResponse {
                success: false,
                message: format!("SSH connection failed: {}", e),
                connection: None,
            }))
        }
    }
}

/// GET /ws/remote/install — WebSocket upgrade handler
///
/// Expects first message to be a JSON RemoteInstallRequest wrapped in WsMessage.
/// Streams RemoteSetupProgress messages back to the client.
pub async fn ws_remote_install(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(handle_remote_install_socket)
}

/// Handle the remote installation WebSocket connection
async fn handle_remote_install_socket(mut socket: WebSocket) {
    info!("Remote install WebSocket connection established");

    // Wait for the first message with installation parameters
    let install_request = match socket.recv().await {
        Some(Ok(Message::Text(text))) => {
            match serde_json::from_str::<WsMessage>(&text) {
                Ok(ws_msg) if ws_msg.msg_type == "start-remote-install" => {
                    match serde_json::from_value::<RemoteInstallRequest>(ws_msg.payload) {
                        Ok(req) => req,
                        Err(e) => {
                            warn!("Failed to parse RemoteInstallRequest: {}", e);
                            let _ = send_error_message(
                                &mut socket,
                                "Invalid installation request format",
                            )
                            .await;
                            return;
                        }
                    }
                }
                Ok(ws_msg) => {
                    warn!("Unexpected message type: {}", ws_msg.msg_type);
                    let _ = send_error_message(
                        &mut socket,
                        &format!("Expected 'start-remote-install', got '{}'", ws_msg.msg_type),
                    )
                    .await;
                    return;
                }
                Err(e) => {
                    warn!("Failed to parse WebSocket message: {}", e);
                    let _ = send_error_message(&mut socket, "Invalid JSON message format").await;
                    return;
                }
            }
        }
        Some(Ok(Message::Close(_))) | None => {
            info!("Remote install WebSocket closed before install request");
            return;
        }
        _ => {
            warn!("Unexpected WebSocket message type");
            return;
        }
    };

    info!(
        "Starting remote installation on {}@{}",
        install_request.username, install_request.host
    );

    // Load saved WizardConfig from disk for the installation
    let config = match load_wizard_config() {
        Ok(config) => config,
        Err(e) => {
            error!("Failed to load wizard config: {}", e);
            let _ = send_error_message(
                &mut socket,
                "Failed to load wizard configuration. Complete the setup wizard first.",
            )
            .await;
            return;
        }
    };

    // Create progress channel
    let (tx, mut rx) = mpsc::channel::<RemoteSetupProgress>(100);

    // Spawn the installation task
    let host = install_request.host.clone();
    let username = install_request.username.clone();

    tokio::spawn(async move {
        let remote_service = RemoteService::new();
        if let Err(e) = remote_service
            .install_openclaw_remote(&host, &username, config, tx.clone())
            .await
        {
            error!("Remote installation failed: {}", e);
            // Error progress already sent by RemoteService stages
        }
    });

    // Forward progress updates to WebSocket (identical pattern to v1.0 ws.rs)
    while let Some(progress) = rx.recv().await {
        let response = WsMessage {
            msg_type: "remote-install-progress".into(),
            payload: serde_json::to_value(&progress).unwrap_or_default(),
        };

        let json = serde_json::to_string(&response).unwrap_or_default();
        if socket.send(Message::Text(json.into())).await.is_err() {
            warn!("Failed to send progress update, client disconnected");
            break;
        }
    }

    info!("Remote install WebSocket connection closed");
}

/// Send an error message over WebSocket
async fn send_error_message(socket: &mut WebSocket, message: &str) -> Result<(), ()> {
    let progress = RemoteSetupProgress {
        stage: "error".into(),
        status: "failed".into(),
        message: message.to_string(),
        error: Some(message.to_string()),
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };

    let response = WsMessage {
        msg_type: "remote-install-progress".into(),
        payload: serde_json::to_value(&progress).unwrap_or_default(),
    };

    let json = serde_json::to_string(&response).unwrap_or_default();
    socket
        .send(Message::Text(json.into()))
        .await
        .map_err(|_| ())
}

/// Load WizardConfig from the saved openclaw.json config file
///
/// Reads the OpenClaw config and maps it back into WizardConfig format.
/// Falls back to defaults for fields not present in saved config.
fn load_wizard_config() -> anyhow::Result<WizardConfig> {
    use crate::services::platform::Platform;

    let config_dir = Platform::config_dir()
        .map_err(|e| anyhow::anyhow!("Failed to find config directory: {}", e))?;
    let config_path = config_dir.join("openclaw.json");

    let config_str = std::fs::read_to_string(&config_path)
        .map_err(|e| anyhow::anyhow!("Config not found at {}: {}", config_path.display(), e))?;

    let raw: serde_json::Value = serde_json::from_str(&config_str)
        .map_err(|e| anyhow::anyhow!("Invalid config JSON: {}", e))?;

    // Map OpenClaw config format back to WizardConfig
    let provider = raw["ai"]["provider"]
        .as_str()
        .unwrap_or("anthropic")
        .to_string();
    let api_key = raw["ai"]["apiKey"]
        .as_str()
        .unwrap_or("")
        .to_string();
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
        channels: None, // Channels loaded separately if needed
    })
}
