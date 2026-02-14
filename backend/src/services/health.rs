//! # Health Monitoring Service
//!
//! Monitors OpenClaw gateway health by executing `openclaw health --json`
//! and parsing the output. Returns structured health data including channel status.

use crate::models::types::{ChannelHealth, HealthSnapshot};
use crate::services::command::SafeCommand;

pub struct HealthService;

impl HealthService {
    /// Get current health snapshot of the OpenClaw gateway
    ///
    /// Executes `openclaw health --json` and parses the output.
    /// If the command fails or daemon is not running, returns an unreachable snapshot.
    /// This method NEVER errors - it always returns a valid HealthSnapshot.
    pub fn get_health() -> HealthSnapshot {
        // Try to execute health check
        let output = match SafeCommand::run("openclaw", &["health", "--json"]) {
            Ok(out) => out,
            Err(_) => {
                // openclaw CLI not found or failed to execute
                return Self::unreachable_snapshot("OpenClaw CLI not found or not executable");
            }
        };

        // Check if command succeeded
        if output.exit_code != 0 {
            // Daemon not running or health check failed
            let error_msg = if output.stderr.is_empty() {
                "Gateway daemon not running or unreachable"
            } else {
                output.stderr.trim()
            };
            return Self::unreachable_snapshot(error_msg);
        }

        // Try to parse JSON output
        match serde_json::from_str::<serde_json::Value>(&output.stdout) {
            Ok(json) => Self::parse_health_json(json),
            Err(e) => {
                // Invalid JSON response
                Self::unreachable_snapshot(&format!("Invalid health JSON: {}", e))
            }
        }
    }

    /// Parse health JSON from openclaw CLI
    ///
    /// Expected format:
    /// {
    ///   "gateway_reachable": true,
    ///   "gateway_mode": "authenticated",
    ///   "channels": [
    ///     {
    ///       "platform": "telegram",
    ///       "status": "connected",
    ///       "last_active": "2024-01-15T10:30:00Z",
    ///       "error_message": null
    ///     }
    ///   ],
    ///   "session_count": 3,
    ///   "probe_duration_ms": 145
    /// }
    fn parse_health_json(json: serde_json::Value) -> HealthSnapshot {
        let gateway_reachable = json.get("gateway_reachable")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let gateway_mode = json.get("gateway_mode")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();

        let session_count = json.get("session_count")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;

        let probe_duration_ms = json.get("probe_duration_ms")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;

        // Parse channels array
        let channels = json.get("channels")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|ch| Self::parse_channel_health(ch))
                    .collect()
            })
            .unwrap_or_default();

        HealthSnapshot {
            gateway_reachable,
            gateway_mode,
            channels,
            session_count,
            probe_duration_ms,
        }
    }

    /// Parse individual channel health from JSON
    fn parse_channel_health(json: &serde_json::Value) -> Option<ChannelHealth> {
        let platform = json.get("platform")?.as_str()?.to_string();
        let status = json.get("status")?.as_str()?.to_string();

        let last_active = json.get("last_active")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let error_message = json.get("error_message")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        Some(ChannelHealth {
            platform,
            status,
            last_active,
            error_message,
        })
    }

    /// Create unreachable health snapshot with error message
    fn unreachable_snapshot(error: &str) -> HealthSnapshot {
        HealthSnapshot {
            gateway_reachable: false,
            gateway_mode: "unreachable".to_string(),
            channels: vec![],
            session_count: 0,
            probe_duration_ms: 0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_health_never_panics() {
        // Should always return a valid HealthSnapshot, even if daemon not running
        let health = HealthService::get_health();

        // Should have valid fields
        assert!(!health.gateway_mode.is_empty());
    }

    #[test]
    fn test_parse_valid_health_json() {
        let json = serde_json::json!({
            "gateway_reachable": true,
            "gateway_mode": "authenticated",
            "channels": [
                {
                    "platform": "telegram",
                    "status": "connected",
                    "last_active": "2024-01-15T10:30:00Z",
                    "error_message": null
                }
            ],
            "session_count": 3,
            "probe_duration_ms": 145
        });

        let health = HealthService::parse_health_json(json);

        assert!(health.gateway_reachable);
        assert_eq!(health.gateway_mode, "authenticated");
        assert_eq!(health.session_count, 3);
        assert_eq!(health.probe_duration_ms, 145);
        assert_eq!(health.channels.len(), 1);
        assert_eq!(health.channels[0].platform, "telegram");
        assert_eq!(health.channels[0].status, "connected");
    }

    #[test]
    fn test_parse_empty_channels() {
        let json = serde_json::json!({
            "gateway_reachable": true,
            "gateway_mode": "unauthenticated",
            "channels": [],
            "session_count": 0,
            "probe_duration_ms": 50
        });

        let health = HealthService::parse_health_json(json);

        assert!(health.gateway_reachable);
        assert_eq!(health.channels.len(), 0);
    }

    #[test]
    fn test_unreachable_snapshot() {
        let snapshot = HealthService::unreachable_snapshot("Test error");

        assert!(!snapshot.gateway_reachable);
        assert_eq!(snapshot.gateway_mode, "unreachable");
        assert_eq!(snapshot.channels.len(), 0);
        assert_eq!(snapshot.session_count, 0);
    }
}
