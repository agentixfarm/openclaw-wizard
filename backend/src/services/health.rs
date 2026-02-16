//! # Health Monitoring Service
//!
//! Monitors OpenClaw gateway health by executing `openclaw health --json`
//! and parsing the output. Returns structured health data including channel status.

use crate::models::types::{ChannelHealth, HealthSnapshot};
use crate::services::command::SafeCommand;
use crate::services::config::ConfigWriter;
use std::path::PathBuf;

pub struct HealthService;

impl HealthService {
    /// Get current health snapshot of the OpenClaw gateway
    ///
    /// Executes `openclaw health --json` and parses the output.
    /// If the command fails or daemon is not running, returns an unreachable snapshot
    /// with channels populated from the saved config file as fallback.
    /// This method NEVER errors - it always returns a valid HealthSnapshot.
    pub fn get_health() -> HealthSnapshot {
        // Try to execute health check
        let output = match SafeCommand::run("openclaw", &["health", "--json"]) {
            Ok(out) => out,
            Err(_) => {
                return Self::unreachable_with_config_channels();
            }
        };

        // Check if command succeeded
        if output.exit_code != 0 {
            return Self::unreachable_with_config_channels();
        }

        // Try to parse JSON output
        match serde_json::from_str::<serde_json::Value>(&output.stdout) {
            Ok(json) => Self::parse_health_json(json),
            Err(_) => Self::unreachable_with_config_channels(),
        }
    }

    /// Create unreachable snapshot but populate channels from saved config
    fn unreachable_with_config_channels() -> HealthSnapshot {
        let channels = Self::channels_from_config();
        HealthSnapshot {
            gateway_reachable: false,
            gateway_mode: "unreachable".to_string(),
            channels,
            session_count: 0,
            probe_duration_ms: 0,
        }
    }

    /// Read configured channels from openclaw.json as offline fallback
    fn channels_from_config() -> Vec<ChannelHealth> {
        let home = std::env::var("HOME").unwrap_or_default();
        let path = PathBuf::from(&home).join(".openclaw/openclaw.json");

        let config = match ConfigWriter::read_json::<serde_json::Value>(&path) {
            Ok(c) => c,
            Err(_) => return vec![],
        };

        let Some(channels) = config.get("channels").and_then(|v| v.as_object()) else {
            return vec![];
        };

        channels
            .iter()
            .filter_map(|(_, ch)| {
                let platform = ch.get("platform")?.as_str()?.to_string();
                let enabled = ch.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true);
                Some(ChannelHealth {
                    platform,
                    status: if enabled {
                        "offline".to_string()
                    } else {
                        "disabled".to_string()
                    },
                    last_active: None,
                    error_message: None,
                })
            })
            .collect()
    }

    /// Parse health JSON from openclaw CLI
    ///
    /// Actual format from `openclaw health --json`:
    /// {
    ///   "ok": true,
    ///   "ts": 1771242097704,
    ///   "durationMs": 0,
    ///   "channels": { "telegram": { ... }, "slack": { ... } },
    ///   "channelOrder": ["telegram", "slack"],
    ///   "sessions": { "count": 1, ... },
    ///   "agents": [ ... ]
    /// }
    fn parse_health_json(json: serde_json::Value) -> HealthSnapshot {
        // "ok" field indicates gateway is reachable
        let gateway_reachable = json.get("ok").and_then(|v| v.as_bool()).unwrap_or(false);

        // No explicit mode field; derive from reachability
        let gateway_mode = if gateway_reachable {
            "connected".to_string()
        } else {
            "unreachable".to_string()
        };

        // Session count is nested under sessions.count
        let session_count = json
            .get("sessions")
            .and_then(|s| s.get("count"))
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;

        let probe_duration_ms = json.get("durationMs").and_then(|v| v.as_u64()).unwrap_or(0) as u32;

        // Channels is an object keyed by platform name, not an array
        let channels = json
            .get("channels")
            .and_then(|v| v.as_object())
            .map(|obj| {
                obj.iter()
                    .map(|(platform, ch)| {
                        let status = ch
                            .get("status")
                            .and_then(|v| v.as_str())
                            .unwrap_or(
                                if ch.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true) {
                                    "connected"
                                } else {
                                    "disabled"
                                },
                            )
                            .to_string();

                        let last_active = ch
                            .get("last_active")
                            .or_else(|| ch.get("lastActive"))
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());

                        let error_message = ch
                            .get("error_message")
                            .or_else(|| ch.get("error"))
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());

                        ChannelHealth {
                            platform: platform.clone(),
                            status,
                            last_active,
                            error_message,
                        }
                    })
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
    #[allow(dead_code)]
    fn parse_channel_health(json: &serde_json::Value) -> Option<ChannelHealth> {
        let platform = json.get("platform")?.as_str()?.to_string();
        let status = json.get("status")?.as_str()?.to_string();

        let last_active = json
            .get("last_active")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let error_message = json
            .get("error_message")
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
    #[allow(dead_code)]
    fn unreachable_snapshot(_error: &str) -> HealthSnapshot {
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
            "ok": true,
            "ts": 1771242097704_u64,
            "durationMs": 145,
            "channels": {
                "telegram": {
                    "status": "connected",
                    "last_active": "2024-01-15T10:30:00Z"
                }
            },
            "channelOrder": ["telegram"],
            "sessions": {
                "count": 3
            }
        });

        let health = HealthService::parse_health_json(json);

        assert!(health.gateway_reachable);
        assert_eq!(health.gateway_mode, "connected");
        assert_eq!(health.session_count, 3);
        assert_eq!(health.probe_duration_ms, 145);
        assert_eq!(health.channels.len(), 1);
        assert_eq!(health.channels[0].platform, "telegram");
        assert_eq!(health.channels[0].status, "connected");
    }

    #[test]
    fn test_parse_empty_channels() {
        let json = serde_json::json!({
            "ok": true,
            "durationMs": 50,
            "channels": {},
            "sessions": {
                "count": 0
            }
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
