use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::Response,
};
use tokio::sync::mpsc;
use tracing::{info, warn, error};

use crate::models::{WsMessage, InstallRequest, InstallProgress};
use crate::services::installer::InstallerService;
use crate::services::uninstaller::UninstallService;
use crate::services::upgrader::UpgradeService;

/// WebSocket upgrade handler
pub async fn ws_handler(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(handle_socket)
}

/// Handle WebSocket connection
async fn handle_socket(mut socket: WebSocket) {
    info!("WebSocket connection established");

    while let Some(Ok(msg)) = socket.recv().await {
        match msg {
            Message::Text(text) => {
                info!("Received text message: {}", text);

                // Try to parse as WsMessage
                match serde_json::from_str::<WsMessage>(&text) {
                    Ok(ws_msg) => {
                        if ws_msg.msg_type == "start-install" {
                            // Parse InstallRequest from payload
                            match serde_json::from_value::<InstallRequest>(ws_msg.payload) {
                                Ok(install_request) => {
                                    info!("Starting installation: node={}, openclaw={}",
                                        install_request.install_node,
                                        install_request.install_openclaw);

                                    // Create channel for progress updates
                                    let (tx, mut rx) = mpsc::channel::<InstallProgress>(100);

                                    // Spawn installation task
                                    let install_node = install_request.install_node;
                                    let install_openclaw = install_request.install_openclaw;
                                    tokio::spawn(async move {
                                        if let Err(e) = InstallerService::run_install(
                                            install_node,
                                            install_openclaw,
                                            tx.clone(),
                                        ).await {
                                            error!("Installation failed: {}", e);
                                            // Send final error message
                                            let _ = tx.send(InstallProgress {
                                                stage: "error".into(),
                                                status: "failed".into(),
                                                message: "Installation failed".into(),
                                                error: Some(e.to_string()),
                                                ..Default::default()
                                            }).await;
                                        }
                                    });

                                    // Forward progress updates to WebSocket
                                    while let Some(progress) = rx.recv().await {
                                        let response = WsMessage {
                                            msg_type: "install-progress".into(),
                                            payload: serde_json::to_value(&progress).unwrap_or_default(),
                                        };

                                        let response_json = serde_json::to_string(&response).unwrap_or_default();
                                        if socket.send(Message::Text(response_json.into())).await.is_err() {
                                            warn!("Failed to send progress update");
                                            break;
                                        }
                                    }
                                }
                                Err(e) => {
                                    warn!("Failed to parse InstallRequest: {}", e);
                                }
                            }
                        } else if ws_msg.msg_type == "start-uninstall" {
                            info!("Starting uninstall");

                            let (tx, mut rx) = mpsc::channel::<InstallProgress>(100);

                            tokio::spawn(async move {
                                if let Err(e) = UninstallService::run_uninstall(tx.clone()).await {
                                    error!("Uninstall failed: {}", e);
                                    let _ = tx.send(InstallProgress {
                                        stage: "uninstall".into(),
                                        status: "failed".into(),
                                        message: "Uninstall failed".into(),
                                        error: Some(e.to_string()),
                                        ..Default::default()
                                    }).await;
                                }
                            });

                            while let Some(progress) = rx.recv().await {
                                let response = WsMessage {
                                    msg_type: "uninstall-progress".into(),
                                    payload: serde_json::to_value(&progress).unwrap_or_default(),
                                };

                                let response_json = serde_json::to_string(&response).unwrap_or_default();
                                if socket.send(Message::Text(response_json.into())).await.is_err() {
                                    warn!("Failed to send uninstall progress update");
                                    break;
                                }
                            }
                        } else if ws_msg.msg_type == "start-upgrade" {
                            info!("Starting upgrade");

                            let (tx, mut rx) = mpsc::channel::<InstallProgress>(100);

                            tokio::spawn(async move {
                                if let Err(e) = UpgradeService::run_upgrade(tx.clone()).await {
                                    error!("Upgrade failed: {}", e);
                                    let _ = tx.send(InstallProgress {
                                        stage: "upgrade".into(),
                                        status: "failed".into(),
                                        message: "Upgrade failed".into(),
                                        error: Some(e.to_string()),
                                        ..Default::default()
                                    }).await;
                                }
                            });

                            while let Some(progress) = rx.recv().await {
                                let response = WsMessage {
                                    msg_type: "upgrade-progress".into(),
                                    payload: serde_json::to_value(&progress).unwrap_or_default(),
                                };

                                let response_json = serde_json::to_string(&response).unwrap_or_default();
                                if socket.send(Message::Text(response_json.into())).await.is_err() {
                                    warn!("Failed to send upgrade progress update");
                                    break;
                                }
                            }
                        } else {
                            // Echo other message types
                            let response = format!("echo: {}", text);
                            if socket.send(Message::Text(response.into())).await.is_err() {
                                warn!("Failed to send echo response");
                                break;
                            }
                        }
                    }
                    Err(_) => {
                        // Not a structured message, echo it
                        let response = format!("echo: {}", text);
                        if socket.send(Message::Text(response.into())).await.is_err() {
                            warn!("Failed to send echo response");
                            break;
                        }
                    }
                }
            }
            Message::Close(_) => {
                info!("WebSocket connection closed");
                break;
            }
            _ => {}
        }
    }
}
