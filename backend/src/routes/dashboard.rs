//! # Dashboard API Routes
//!
//! Provides HTTP endpoints for dashboard functionality:
//! - Daemon process management (start/stop/restart/status)
//! - Health monitoring (gateway health snapshot)
//! - Configuration CRUD (read/write/import/export openclaw.json)

use crate::models::types::{ApiResponse, DaemonActionResponse, DaemonStatus, HealthSnapshot};
use crate::services::{config::ConfigWriter, daemon::DaemonService, health::HealthService};
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

/// Get the path to the OpenClaw configuration file
fn config_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_default();
    PathBuf::from(&home).join(".openclaw/openclaw.json")
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
/// Saves new configuration atomically to ~/.openclaw/openclaw.json.
/// Validates that input is valid JSON before saving.
pub async fn save_config_handler(
    Json(config): Json<serde_json::Value>,
) -> Json<ApiResponse<()>> {
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
/// Validates and saves atomically to ~/.openclaw/openclaw.json.
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
