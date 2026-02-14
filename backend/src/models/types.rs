use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// System information structure
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub node_version: Option<String>,
    pub openclaw_installed: bool,
}

/// Generic API response wrapper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T>
where
    T: Serialize + Clone,
{
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

/// Concrete API response with SystemInfo for TypeScript export
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct SystemInfoResponse {
    pub success: bool,
    pub data: Option<SystemInfo>,
    pub error: Option<String>,
}

/// Concrete API response with no data for TypeScript export
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct EmptyResponse {
    pub success: bool,
    pub error: Option<String>,
}

/// WebSocket message envelope
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
#[ts(export_to = "../bindings/")]
pub struct WsMessage {
    pub msg_type: String,
    #[ts(type = "any")]
    pub payload: serde_json::Value,
}
