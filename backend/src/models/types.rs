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
    /// "api-key" or "setup-token"
    pub auth_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ApiKeyValidationResponse {
    pub valid: bool,
    pub error: Option<String>,
}

/// Channel token validation request
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ChannelValidationRequest {
    pub platform: String,    // "telegram", "discord", "slack"
    pub token: String,       // Bot token
    pub app_token: Option<String>,  // For Slack app-level token
}

/// Channel token validation response
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ChannelValidationResponse {
    pub valid: bool,
    pub error: Option<String>,
    pub bot_name: Option<String>,     // Display name of validated bot
    pub bot_username: Option<String>, // Username (@handle) of bot
}

/// Channel configuration for saving
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ChannelConfig {
    pub platform: String,
    pub enabled: bool,
    pub bot_token: Option<String>,
    pub app_token: Option<String>,    // Slack only
    pub dm_policy: String,            // "allowlist" default
    pub allowed_users: Vec<String>,   // User IDs or phone numbers
}

/// Wizard config to save
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct WizardConfig {
    pub provider: String,
    pub api_key: String,
    /// "api-key" or "setup-token"
    pub auth_type: String,
    pub gateway_port: u16,
    pub gateway_bind: String,
    pub auth_mode: String,
    pub auth_credential: Option<String>,
    pub channels: Option<Vec<ChannelConfig>>,  // NEW field
}

/// Installation request
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct InstallRequest {
    pub install_node: bool,
    pub install_openclaw: bool,
}

/// Installation progress update
#[derive(Debug, Clone, Serialize, Deserialize, TS, Default)]
#[ts(export, export_to = "../bindings/")]
pub struct InstallProgress {
    pub stage: String,           // "node-install", "openclaw-install", "verify"
    pub status: String,          // "running", "completed", "failed"
    pub message: String,         // Human-readable progress message
    pub output_line: Option<String>,  // Raw command output line
    pub error: Option<String>,   // Error details if failed
    pub progress_pct: Option<u8>,// Optional percentage (0-100)
}

// ===== Dashboard Types =====

/// DaemonStatus - returned by daemon status endpoint
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct DaemonStatus {
    pub running: bool,
    pub pid: Option<u32>,
    pub uptime_seconds: Option<u64>,
    pub memory_mb: Option<u64>,
    pub cpu_percent: Option<f32>,
}

/// ChannelHealth - individual channel status
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ChannelHealth {
    pub platform: String,
    pub status: String,        // "connected" | "disconnected" | "error"
    pub last_active: Option<String>,
    pub error_message: Option<String>,
}

/// HealthSnapshot - returned by health endpoint
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct HealthSnapshot {
    pub gateway_reachable: bool,
    pub gateway_mode: String,
    pub channels: Vec<ChannelHealth>,
    pub session_count: u32,
    pub probe_duration_ms: u32,
}

/// DaemonActionResponse - returned by start/stop/restart
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct DaemonActionResponse {
    pub success: bool,
    pub message: String,
}
