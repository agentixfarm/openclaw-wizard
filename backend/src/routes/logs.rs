//! # Log Viewing and Analysis Routes
//!
//! REST endpoints for recent log retrieval and AI-powered analysis,
//! plus WebSocket endpoint for real-time log streaming.

use crate::error::AppError;
use crate::models::types::{ApiResponse, LogAnalysis, LogAnalysisRequest, LogsResponse};
use crate::services::log_analyzer::LogAnalyzer;
use crate::services::log_service::LogService;
use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::Query,
    response::Response,
    Json,
};
use serde::Deserialize;
use tracing::{info, warn};

/// Query parameters for recent logs endpoint
#[derive(Debug, Deserialize)]
pub struct LogsQuery {
    pub service: String,
    pub lines: Option<usize>,
    pub level: Option<String>,
    pub search: Option<String>,
}

/// GET /api/logs/recent
///
/// Returns recent log lines for a service with optional level and search filtering.
pub async fn get_recent_logs(
    Query(params): Query<LogsQuery>,
) -> Result<Json<ApiResponse<LogsResponse>>, AppError> {
    // Validate service name
    if params.service != "gateway" && params.service != "daemon" {
        return Err(AppError::BadRequest(
            "Service must be 'gateway' or 'daemon'".to_string(),
        ));
    }

    let lines = params.lines.unwrap_or(200);
    let level = params.level.as_deref();
    let search = params.search.as_deref();

    match LogService::get_recent_logs(&params.service, lines, level, search) {
        Ok(response) => Ok(Json(ApiResponse {
            success: true,
            data: Some(response),
            error: None,
        })),
        Err(e) => Ok(Json(ApiResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to read logs: {}", e)),
        })),
    }
}

/// POST /api/logs/analyze
///
/// Send log context to the user's configured AI provider for analysis.
/// Rate limited to 1 request per 10 seconds.
pub async fn analyze_logs(
    Json(request): Json<LogAnalysisRequest>,
) -> Result<Json<ApiResponse<LogAnalysis>>, AppError> {
    let analyzer = LogAnalyzer::from_config().ok_or_else(|| {
        AppError::AiProviderNotConfigured(
            "No AI provider configured. Set up an AI provider in OpenClaw config first."
                .to_string(),
        )
    })?;

    match analyzer
        .analyze_error(&request.log_context, &request.service)
        .await
    {
        Ok(analysis) => Ok(Json(ApiResponse {
            success: true,
            data: Some(analysis),
            error: None,
        })),
        Err(e) => Err(e),
    }
}

/// GET /ws/logs
///
/// WebSocket upgrade for real-time log streaming.
pub async fn ws_log_stream(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(handle_log_socket)
}

/// Handle WebSocket log streaming connection
async fn handle_log_socket(mut socket: WebSocket) {
    info!("Log WebSocket connection established");

    // Wait for client to send which service to tail
    let service = match socket.recv().await {
        Some(Ok(Message::Text(text))) => {
            // Try JSON format: { "service": "gateway" }
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&text) {
                parsed["service"]
                    .as_str()
                    .unwrap_or("gateway")
                    .to_string()
            } else {
                text.trim().to_string()
            }
        }
        _ => {
            warn!("No initial message received on log WebSocket");
            return;
        }
    };

    // Validate service name
    if service != "gateway" && service != "daemon" {
        let error_msg = serde_json::json!({
            "type": "error",
            "content": "Service must be 'gateway' or 'daemon'"
        });
        let _ = socket
            .send(Message::Text(error_msg.to_string().into()))
            .await;
        return;
    }

    info!("Starting log stream for service: {}", service);

    // Start tailing the log file
    let (mut rx, tail_handle) = match LogService::tail_log_file(&service).await {
        Ok(result) => result,
        Err(e) => {
            let error_msg = serde_json::json!({
                "type": "error",
                "content": format!("Failed to start log stream: {}", e)
            });
            let _ = socket
                .send(Message::Text(error_msg.to_string().into()))
                .await;
            return;
        }
    };

    // Forward log lines to WebSocket
    while let Some(line) = rx.recv().await {
        let parsed = LogService::parse_log_line(&line);

        let msg = serde_json::json!({
            "type": "log_line",
            "content": parsed.content,
            "timestamp": parsed.timestamp,
            "level": parsed.level,
        });

        if socket
            .send(Message::Text(msg.to_string().into()))
            .await
            .is_err()
        {
            info!("Log WebSocket client disconnected");
            break;
        }
    }

    // Clean up: abort the tail task when client disconnects
    tail_handle.abort();
    info!("Log stream ended for service: {}", service);
}
