use axum::Json;
use std::env;

use crate::models::{ApiResponse, SystemInfo};

/// Health check endpoint
pub async fn health() -> Json<ApiResponse<()>> {
    Json(ApiResponse {
        success: true,
        data: None,
        error: None,
    })
}

/// System information endpoint
pub async fn system_info() -> Json<ApiResponse<SystemInfo>> {
    let info = SystemInfo {
        os: env::consts::OS.to_string(),
        arch: env::consts::ARCH.to_string(),
        node_version: None,
        openclaw_installed: false,
    };

    Json(ApiResponse {
        success: true,
        data: Some(info),
        error: None,
    })
}
