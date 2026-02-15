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

// ===== Docker Types =====

/// Status of a Docker container
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub enum ContainerStatus {
    Running,
    Stopped,
    Created,
    Exited,
    Error,
}

/// Information about a managed Docker container
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ContainerInfo {
    pub id: String,
    pub name: String,
    pub image: String,
    pub status: ContainerStatus,
    pub created_at: String,
    pub port: Option<u16>,
}

/// Request to create a new Docker sandbox container
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct DockerCreateRequest {
    pub name: String,
    /// Docker image to use; defaults to "node:20-alpine" if None
    pub image: Option<String>,
}

/// Response after creating a Docker container
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct DockerCreateResponse {
    pub success: bool,
    pub container_id: Option<String>,
    pub port: Option<u16>,
    pub error: Option<String>,
}

/// Docker daemon status and running containers
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct DockerStatusResponse {
    pub available: bool,
    pub version: Option<String>,
    pub containers: Vec<ContainerInfo>,
    pub error: Option<String>,
}

/// Container log output
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ContainerLogsResponse {
    pub container_id: String,
    pub logs: Vec<String>,
}

// ===== Skills Types =====
// Skills types will be added in Plan 02 (Skills backend)

// ===== SSH & Remote Setup Types =====

/// SSH connection status and details
///
/// Validation rules:
/// - host: Must match `^[a-zA-Z0-9.-]+$` (hostname or IP)
/// - username: Must match `^[a-z_][a-z0-9_-]*$` (valid Unix username)
/// - key_path: Absolute path or `~/.ssh/id_*` pattern
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct SshConnection {
    pub host: String,
    pub username: String,
    pub key_path: String,
    pub connected: bool,
    pub error: Option<String>,
}

/// SSH connection request for testing or establishing connection
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct SshConnectionRequest {
    pub host: String,
    pub username: String,
    pub key_path: String,
}

/// SSH connection test response
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct SshConnectionResponse {
    pub success: bool,
    pub message: String,
    pub connection: Option<SshConnection>,
}

/// Remote setup progress update (streamed via WebSocket)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct RemoteSetupProgress {
    /// Current installation stage
    pub stage: String, // "connection", "node", "openclaw", "config", "daemon", "complete"
    /// Stage status
    pub status: String, // "in_progress", "completed", "failed"
    /// User-visible message
    pub message: String,
    /// Error details if status is failed
    pub error: Option<String>,
    /// Unix timestamp (seconds)
    pub timestamp: u64,
}

/// Remote installation request (sent via WebSocket)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct RemoteInstallRequest {
    pub host: String,
    pub username: String,
    /// Optional: override WizardConfig from saved config
    #[ts(type = "Record<string, any> | null")]
    pub config: Option<serde_json::Value>,
}
