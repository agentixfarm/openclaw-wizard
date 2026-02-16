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
#[allow(dead_code)]
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
    pub platform: String,          // "telegram", "discord", "slack"
    pub token: String,             // Bot token
    pub app_token: Option<String>, // For Slack app-level token
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
    pub app_token: Option<String>,  // Slack only
    pub dm_policy: String,          // "allowlist" default
    pub allowed_users: Vec<String>, // User IDs or phone numbers
}

/// Wizard config to save
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct WizardConfig {
    pub provider: String,
    #[serde(default)]
    pub api_key: String,
    /// "api-key", "setup-token", "oauth", or "skip"
    pub auth_type: String,
    pub gateway_port: u16,
    pub gateway_bind: String,
    pub auth_mode: String,
    pub auth_credential: Option<String>,
    pub channels: Option<Vec<ChannelConfig>>,
    // Extra fields for advanced providers (Custom, Cloudflare, vLLM)
    pub base_url: Option<String>,
    pub model_id: Option<String>,
    /// "openai" or "anthropic" (Custom provider compatibility mode)
    pub compatibility: Option<String>,
    /// Cloudflare account ID
    pub account_id: Option<String>,
    /// Cloudflare gateway ID
    pub gateway_id: Option<String>,
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
    pub stage: String,               // "node-install", "openclaw-install", "verify"
    pub status: String,              // "running", "completed", "failed"
    pub message: String,             // Human-readable progress message
    pub output_line: Option<String>, // Raw command output line
    pub error: Option<String>,       // Error details if failed
    pub progress_pct: Option<u8>,    // Optional percentage (0-100)
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
    pub status: String, // "connected" | "disconnected" | "error"
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

/// Category classification for skills
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub enum SkillCategory {
    DevTools,
    DataProcessing,
    ApiIntegration,
    Automation,
    Security,
    Monitoring,
    Other,
}

/// Metadata about a skill from the ClawHub registry
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct SkillMetadata {
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub category: SkillCategory,
    pub tags: Vec<String>,
    pub capabilities: Vec<String>,
    pub homepage: Option<String>,
    pub repository: Option<String>,
    pub downloads: Option<u32>,
    pub verified: bool,
}

/// Request to search for skills
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
#[allow(dead_code)]
pub struct SkillSearchRequest {
    pub query: Option<String>,
    pub category: Option<SkillCategory>,
}

/// Response from a skill search
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct SkillSearchResponse {
    pub skills: Vec<SkillMetadata>,
    pub total: u32,
}

/// Request to install a skill
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct SkillInstallRequest {
    pub name: String,
    /// Version to install; None = latest
    pub version: Option<String>,
}

/// Response after installing a skill
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct SkillInstallResponse {
    pub success: bool,
    pub name: String,
    pub version: String,
    pub error: Option<String>,
    pub scan_result: Option<ScanResult>,
}

/// Information about a locally installed skill
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct InstalledSkill {
    pub name: String,
    pub version: String,
    pub path: String,
    pub size_bytes: Option<u64>,
}

/// Threat level determined by VirusTotal scan
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub enum ThreatLevel {
    Clean,
    Suspicious,
    Malicious,
}

/// Result of a VirusTotal security scan
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ScanResult {
    pub threat_level: ThreatLevel,
    pub malicious_count: u32,
    pub suspicious_count: u32,
    pub total_scanners: u32,
    pub scan_date: String,
    pub permalink: Option<String>,
}

/// Request to scan a skill package
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ScanRequest {
    pub skill_name: String,
    pub version: String,
}

// ===== Service Management Types =====

/// Status of an individual service process (gateway or daemon)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ServiceProcessStatus {
    pub running: bool,
    pub pid: Option<u32>,
    pub uptime_seconds: Option<u64>,
    pub memory_mb: Option<u64>,
    pub cpu_percent: Option<f32>,
}

/// Combined status of all OpenClaw services with system metrics
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ServicesStatus {
    pub gateway: ServiceProcessStatus,
    pub daemon: ServiceProcessStatus,
    pub error_count_24h: u32,
    pub system_cpu_percent: Option<f32>,
    pub system_memory_total_mb: Option<u64>,
    pub system_memory_used_mb: Option<u64>,
}

/// Response after performing a service action (start/stop/restart)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ServiceActionResponse {
    pub success: bool,
    pub service: String,
    pub message: String,
}

/// Individual diagnostic check from openclaw doctor
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct DiagnosticCheck {
    pub name: String,
    /// "pass", "fail", or "warn"
    pub status: String,
    pub message: String,
    pub fix_suggestion: Option<String>,
}

/// Full diagnostic report from openclaw doctor
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct DoctorReport {
    pub checks: Vec<DiagnosticCheck>,
    /// "healthy", "warning", or "critical"
    pub overall_status: String,
    pub timestamp: String,
}

/// A single log line with optional parsed metadata
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct LogLine {
    pub content: String,
    pub timestamp: Option<String>,
    pub level: Option<String>,
}

/// Response containing recent log lines
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct LogsResponse {
    pub service: String,
    pub lines: Vec<LogLine>,
    pub total: u32,
}

/// Request to analyze log context with AI
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct LogAnalysisRequest {
    pub log_context: String,
    pub service: String,
}

/// AI-generated analysis of log errors
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct LogAnalysis {
    pub error_summary: String,
    pub cause: String,
    pub fix_steps: Vec<String>,
    pub confidence: String,
}

// ===== Intelligence Types =====

/// AI-powered cost optimization recommendation
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct CostRecommendation {
    pub current_model: String,
    pub recommended_model: String,
    pub current_cost_monthly: f64,
    pub recommended_cost_monthly: f64,
    pub savings_monthly: f64,
    pub savings_percent: f64,
    pub use_case: String,
    pub rationale: String,
}

/// Full cost analysis result with recommendations
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct CostAnalysis {
    pub recommendations: Vec<CostRecommendation>,
    pub total_current_monthly: f64,
    pub total_recommended_monthly: f64,
    pub total_savings_monthly: f64,
    pub analysis_date: String,
    pub summary: Option<String>,
}

/// Individual security finding from audit
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct SecurityFinding {
    pub id: String,
    /// "critical", "warning", or "info"
    pub severity: String,
    pub title: String,
    pub description: String,
    pub affected_field: String,
    pub fix_suggestion: Option<String>,
}

/// Full security audit result
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct SecurityAudit {
    pub findings: Vec<SecurityFinding>,
    /// "secure", "warnings", or "critical"
    pub overall_score: String,
    pub critical_count: u32,
    pub warning_count: u32,
    pub audit_date: String,
}

/// LLM model pricing information
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct LlmModelPricing {
    pub provider: String,
    pub model: String,
    pub input_per_million: f64,
    pub output_per_million: f64,
    pub context_window: Option<u32>,
    pub notes: Option<String>,
}

/// LLM pricing response with all available models
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct LlmPricingResponse {
    pub models: Vec<LlmModelPricing>,
    pub last_updated: String,
}

// ===== Multi-Server Types =====

/// A target server for multi-server deployment
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ServerTarget {
    pub id: String,
    pub name: String,
    pub host: String,
    pub username: String,
    pub key_path: String,
    /// "pending", "connected", "failed", "deployed"
    pub status: String,
}

/// Response containing list of server targets
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ServerListResponse {
    pub servers: Vec<ServerTarget>,
}

/// Result of testing a server connection
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ServerTestResult {
    pub server_id: String,
    pub success: bool,
    pub message: String,
}

/// Request to deploy to multiple servers
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct MultiServerDeployRequest {
    pub server_ids: Vec<String>,
}

/// Progress update for a single server during multi-server deployment
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct MultiServerProgress {
    pub server_id: String,
    pub server_name: String,
    pub stage: String,
    pub status: String,
    pub message: String,
    pub error: Option<String>,
    pub timestamp: u64,
}

/// Result of deploying to a single server
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct ServerDeployResult {
    pub server_id: String,
    pub server_name: String,
    pub success: bool,
    pub error: Option<String>,
    pub completed_stages: Vec<String>,
}

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

// ===== Rollback Types =====

/// A single stage in the rollback process
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct RollbackStage {
    pub name: String,
    /// "pending", "success", "skipped", "failed"
    pub status: String,
    pub message: String,
}

/// Result of a rollback operation
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct RollbackResult {
    pub success: bool,
    pub stages: Vec<RollbackStage>,
    pub error: Option<String>,
}
