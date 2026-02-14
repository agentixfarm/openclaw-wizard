use axum::Json;

use crate::models::{ApiResponse, SystemInfo};
use crate::services::platform::Platform;

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
    let info = Platform::system_info();

    Json(ApiResponse {
        success: true,
        data: Some(info),
        error: None,
    })
}
