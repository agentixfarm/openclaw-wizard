//! # Dashboard API Routes
//!
//! Provides HTTP endpoints for dashboard functionality:
//! - Daemon process management (start/stop/restart/status)
//! - Health monitoring (gateway health snapshot)
//! - Configuration CRUD (read/write/import/export openclaw.json)

use crate::models::types::{ApiResponse, DaemonActionResponse, DaemonStatus, HealthSnapshot};
use crate::services::{
    config::ConfigWriter, daemon::DaemonService, health::HealthService, platform::Platform,
};
use axum::Json;
use std::path::PathBuf;

// ===== Daemon Management Endpoints =====

/// GET /api/dashboard/daemon/status
///
/// Returns current status of the OpenClaw gateway daemon process.
pub async fn daemon_status() -> Json<ApiResponse<DaemonStatus>> {
    let status = DaemonService::status();

    Json(ApiResponse {
        success: true,
        data: Some(status),
        error: None,
    })
}

/// POST /api/dashboard/daemon/start
///
/// Starts the OpenClaw gateway daemon process.
pub async fn daemon_start() -> Json<ApiResponse<DaemonActionResponse>> {
    match DaemonService::start() {
        Ok(_) => Json(ApiResponse {
            success: true,
            data: Some(DaemonActionResponse {
                success: true,
                message: "Daemon started successfully".to_string(),
            }),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: Some(DaemonActionResponse {
                success: false,
                message: format!("Failed to start daemon: {}", e),
            }),
            error: Some(format!("Failed to start daemon: {}", e)),
        }),
    }
}

/// POST /api/dashboard/daemon/stop
///
/// Stops the OpenClaw gateway daemon process.
pub async fn daemon_stop() -> Json<ApiResponse<DaemonActionResponse>> {
    match DaemonService::stop() {
        Ok(_) => Json(ApiResponse {
            success: true,
            data: Some(DaemonActionResponse {
                success: true,
                message: "Daemon stopped successfully".to_string(),
            }),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: Some(DaemonActionResponse {
                success: false,
                message: format!("Failed to stop daemon: {}", e),
            }),
            error: Some(format!("Failed to stop daemon: {}", e)),
        }),
    }
}

/// POST /api/dashboard/daemon/restart
///
/// Restarts the OpenClaw gateway daemon process (stop + wait + start).
pub async fn daemon_restart() -> Json<ApiResponse<DaemonActionResponse>> {
    match DaemonService::restart() {
        Ok(_) => Json(ApiResponse {
            success: true,
            data: Some(DaemonActionResponse {
                success: true,
                message: "Daemon restarted successfully".to_string(),
            }),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: Some(DaemonActionResponse {
                success: false,
                message: format!("Failed to restart daemon: {}", e),
            }),
            error: Some(format!("Failed to restart daemon: {}", e)),
        }),
    }
}

// ===== Health Monitoring Endpoint =====

/// GET /api/dashboard/health
///
/// Returns current health snapshot of the OpenClaw gateway.
/// Includes gateway reachability, mode, channel status, and session count.
pub async fn get_health() -> Json<ApiResponse<HealthSnapshot>> {
    let health = HealthService::get_health();

    Json(ApiResponse {
        success: true,
        data: Some(health),
        error: None,
    })
}

// ===== Configuration CRUD Endpoints =====

/// Get the path to the wizard configuration file
fn config_path() -> PathBuf {
    Platform::config_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("openclaw.json")
}

/// GET /api/dashboard/config
///
/// Returns the current OpenClaw configuration as JSON.
pub async fn get_config() -> Json<ApiResponse<serde_json::Value>> {
    let path = config_path();

    match ConfigWriter::read_json::<serde_json::Value>(&path) {
        Ok(config) => Json(ApiResponse {
            success: true,
            data: Some(config),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(format!(
                "Failed to read config from {}: {}",
                path.display(),
                e
            )),
        }),
    }
}

/// PUT /api/dashboard/config
///
/// Saves new configuration atomically to openclaw.json in the wizard config directory.
/// Validates that input is valid JSON before saving.
pub async fn save_config_handler(Json(config): Json<serde_json::Value>) -> Json<ApiResponse<()>> {
    let path = config_path();

    // Validate it's a JSON object (not null, array, or primitive)
    if !config.is_object() {
        return Json(ApiResponse {
            success: false,
            data: None,
            error: Some("Config must be a JSON object".to_string()),
        });
    }

    match ConfigWriter::write_json(&path, &config) {
        Ok(_) => Json(ApiResponse {
            success: true,
            data: Some(()),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to save config: {}", e)),
        }),
    }
}

/// POST /api/dashboard/config/import
///
/// Imports configuration from uploaded JSON.
/// Validates and saves atomically to openclaw.json in the wizard config directory.
pub async fn import_config(Json(config): Json<serde_json::Value>) -> Json<ApiResponse<()>> {
    // Import is the same as save - just semantically different endpoint
    save_config_handler(Json(config)).await
}

/// GET /api/dashboard/config/export
///
/// Exports current configuration as JSON (same as get_config).
pub async fn export_config() -> Json<ApiResponse<serde_json::Value>> {
    // Export is the same as get - just semantically different endpoint
    get_config().await
}

/// GET /api/dashboard/chat-url
///
/// Returns the authenticated gateway dashboard URL.
/// Reads port and auth token from openclaw.json in the wizard config directory and constructs the URL.
/// The token is placed in the URL fragment (#token=...) which is never sent over HTTP.
pub async fn get_chat_url() -> Json<ApiResponse<serde_json::Value>> {
    let path = config_path();
    let config = match ConfigWriter::read_json::<serde_json::Value>(&path) {
        Ok(c) => c,
        Err(e) => {
            return Json(ApiResponse {
                success: false,
                data: None,
                error: Some(format!("Config not found: {}", e)),
            });
        }
    };

    let port = config
        .get("gateway")
        .and_then(|g| g.get("port"))
        .and_then(|p| p.as_u64())
        .unwrap_or(18789);

    let token = config
        .get("gateway")
        .and_then(|g| g.get("auth"))
        .and_then(|a| a.get("token"))
        .and_then(|t| t.as_str());

    let url = match token {
        Some(t) => format!("http://127.0.0.1:{}/#token={}", port, t),
        None => format!("http://127.0.0.1:{}/", port),
    };

    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({ "url": url })),
        error: None,
    })
}

/// GET /api/dashboard/version
///
/// Returns current and latest available OpenClaw version information.
pub async fn get_version_info() -> Json<ApiResponse<serde_json::Value>> {
    use crate::services::command::SafeCommand;

    // Get current version
    let current_version = match SafeCommand::run("openclaw", &["--version"]) {
        Ok(output) if output.exit_code == 0 => {
            // Parse version from output like "openclaw 2026.2.15"
            output
                .stdout
                .split_whitespace()
                .last()
                .unwrap_or("unknown")
                .to_string()
        }
        _ => "unknown".to_string(),
    };

    // Check for latest version using npm view
    let latest_version = match SafeCommand::run("npm", &["view", "openclaw", "version"]) {
        Ok(output) if output.exit_code == 0 => output.stdout.trim().to_string(),
        _ => current_version.clone(), // Fallback to current if check fails
    };

    let update_available = current_version != "unknown"
        && latest_version != current_version
        && !latest_version.is_empty();

    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "current_version": current_version,
            "latest_version": latest_version,
            "update_available": update_available,
        })),
        error: None,
    })
}

// ===== WhatsApp Connection =====

use crate::services::whatsapp::{WhatsAppProgress, WhatsAppService};
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::response::Response;
use tokio::sync::mpsc;

/// WebSocket handler for WhatsApp QR code connection
pub async fn whatsapp_connect_ws(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(handle_whatsapp_socket)
}

async fn handle_whatsapp_socket(mut socket: WebSocket) {
    let (tx, mut rx) = mpsc::channel::<WhatsAppProgress>(100);

    // Spawn connection task
    let connect_task = tokio::spawn(async move {
        if let Err(e) = WhatsAppService::connect(tx.clone()).await {
            let _ = tx
                .send(WhatsAppProgress {
                    stage: "error".into(),
                    status: "failed".into(),
                    message: "Connection failed".into(),
                    qr_code: None,
                    error: Some(e.to_string()),
                })
                .await;
        }
    });

    // Stream progress updates to WebSocket
    while let Some(progress) = rx.recv().await {
        let json = match serde_json::to_string(&progress) {
            Ok(j) => j,
            Err(_) => continue,
        };

        if socket.send(Message::Text(json.into())).await.is_err() {
            break;
        }

        // Only close on final stages (connected/error), not intermediate ones (config)
        if progress.status == "failed" || progress.stage == "connected" || progress.stage == "error"
        {
            break;
        }
    }

    let _ = connect_task.await;
    // WebSocket will close automatically when dropped
}
