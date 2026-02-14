use axum::Json;

use crate::models::{ApiResponse, OpenClawDetection, SystemInfo, SystemRequirements};
use crate::services::{detection::DetectionService, platform::Platform};

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

/// System requirements endpoint
pub async fn system_requirements() -> Json<ApiResponse<SystemRequirements>> {
    let requirements = Platform::system_requirements();

    Json(ApiResponse {
        success: true,
        data: Some(requirements),
        error: None,
    })
}

/// OpenClaw detection endpoint
pub async fn detect_openclaw() -> Json<ApiResponse<OpenClawDetection>> {
    let detection = DetectionService::detect_openclaw();

    Json(ApiResponse {
        success: true,
        data: Some(detection),
        error: None,
    })
}
