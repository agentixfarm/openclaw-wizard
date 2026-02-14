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

/// Individual requirement check result
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct RequirementCheck {
    pub name: String,
    pub required: String,
    pub actual: String,
    pub passed: bool,
    pub help_text: Option<String>,
}

/// Full system requirements response
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct SystemRequirements {
    pub checks: Vec<RequirementCheck>,
    pub all_passed: bool,
    pub node_installed: bool,
    pub node_version: Option<String>,
}

/// OpenClaw detection result
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct OpenClawDetection {
    pub installed: bool,
    pub version: Option<String>,
    pub install_path: Option<String>,
    pub config_found: bool,
    pub config_path: Option<String>,
    #[ts(type = "Record<string, any> | null")]
    pub existing_config: Option<serde_json::Value>,
}

/// API key validation request/response
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ApiKeyValidationRequest {
    pub provider: String,
    pub api_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ApiKeyValidationResponse {
    pub valid: bool,
    pub error: Option<String>,
}

/// Wizard config to save
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct WizardConfig {
    pub provider: String,
    pub api_key: String,
    pub gateway_port: u16,
    pub gateway_bind: String,
    pub auth_mode: String,
    pub auth_credential: Option<String>,
}
