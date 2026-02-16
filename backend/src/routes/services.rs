//! # Service Management REST Routes
//!
//! HTTP endpoints for independent gateway/daemon lifecycle control
//! and OpenClaw doctor diagnostics. Phase 7 replacement for dashboard
//! daemon routes with finer-grained service control.

use crate::models::types::{
    ApiResponse, DoctorReport, ServiceActionResponse, ServicesStatus,
};
use crate::services::doctor::DoctorService;
use crate::services::service_manager::ServiceManager;
use axum::Json;

/// GET /api/services/status
///
/// Returns independent status for gateway and daemon with system metrics.
pub async fn services_status() -> Json<ApiResponse<ServicesStatus>> {
    let status = ServiceManager::services_status();

    Json(ApiResponse {
        success: true,
        data: Some(status),
        error: None,
    })
}

/// POST /api/services/gateway/start
pub async fn start_gateway() -> Json<ApiResponse<ServiceActionResponse>> {
    match ServiceManager::start_gateway() {
        Ok(response) => Json(ApiResponse {
            success: response.success,
            data: Some(response),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: Some(ServiceActionResponse {
                success: false,
                service: "gateway".to_string(),
                message: format!("Failed to start gateway: {}", e),
            }),
            error: Some(e.to_string()),
        }),
    }
}

/// POST /api/services/gateway/stop
pub async fn stop_gateway() -> Json<ApiResponse<ServiceActionResponse>> {
    match ServiceManager::stop_gateway() {
        Ok(response) => Json(ApiResponse {
            success: response.success,
            data: Some(response),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: Some(ServiceActionResponse {
                success: false,
                service: "gateway".to_string(),
                message: format!("Failed to stop gateway: {}", e),
            }),
            error: Some(e.to_string()),
        }),
    }
}

/// POST /api/services/gateway/restart
pub async fn restart_gateway() -> Json<ApiResponse<ServiceActionResponse>> {
    match ServiceManager::restart_gateway() {
        Ok(response) => Json(ApiResponse {
            success: response.success,
            data: Some(response),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: Some(ServiceActionResponse {
                success: false,
                service: "gateway".to_string(),
                message: format!("Failed to restart gateway: {}", e),
            }),
            error: Some(e.to_string()),
        }),
    }
}

/// POST /api/services/daemon/start
pub async fn start_daemon() -> Json<ApiResponse<ServiceActionResponse>> {
    match ServiceManager::start_daemon() {
        Ok(response) => Json(ApiResponse {
            success: response.success,
            data: Some(response),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: Some(ServiceActionResponse {
                success: false,
                service: "daemon".to_string(),
                message: format!("Failed to start daemon: {}", e),
            }),
            error: Some(e.to_string()),
        }),
    }
}

/// POST /api/services/daemon/stop
pub async fn stop_daemon() -> Json<ApiResponse<ServiceActionResponse>> {
    match ServiceManager::stop_daemon() {
        Ok(response) => Json(ApiResponse {
            success: response.success,
            data: Some(response),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: Some(ServiceActionResponse {
                success: false,
                service: "daemon".to_string(),
                message: format!("Failed to stop daemon: {}", e),
            }),
            error: Some(e.to_string()),
        }),
    }
}

/// POST /api/services/daemon/restart
pub async fn restart_daemon() -> Json<ApiResponse<ServiceActionResponse>> {
    match ServiceManager::restart_daemon() {
        Ok(response) => Json(ApiResponse {
            success: response.success,
            data: Some(response),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: Some(ServiceActionResponse {
                success: false,
                service: "daemon".to_string(),
                message: format!("Failed to restart daemon: {}", e),
            }),
            error: Some(e.to_string()),
        }),
    }
}

/// GET /api/services/doctor
///
/// Run OpenClaw doctor diagnostics and return structured results.
pub async fn run_doctor() -> Json<ApiResponse<DoctorReport>> {
    match DoctorService::run_diagnostics() {
        Ok(report) => Json(ApiResponse {
            success: true,
            data: Some(report),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(format!("Doctor diagnostics failed: {}", e)),
        }),
    }
}
