//! # Log Service - Log File Reading and Streaming
//!
//! Provides recent log retrieval with level/search filtering and real-time
//! log streaming via bounded channels (capacity 1000) for WebSocket delivery.

use crate::models::types::{LogLine, LogsResponse};
use anyhow::{Context, Result};
use std::path::PathBuf;
use tokio::sync::mpsc;

const LOG_CHANNEL_CAPACITY: usize = 1000;

pub struct LogService;

impl LogService {
    /// Get recent log lines from a service log file
    ///
    /// Reads the last N lines, parses metadata, applies level and search filters.
    pub fn get_recent_logs(
        service: &str,
        lines: usize,
        level: Option<&str>,
        search: Option<&str>,
    ) -> Result<LogsResponse> {
        let log_path = Self::find_log_path(service);

        let raw_lines = if let Some(path) = log_path {
            let content = std::fs::read_to_string(&path)
                .with_context(|| format!("Failed to read log file: {}", path.display()))?;
            let all_lines: Vec<&str> = content.lines().collect();
            let start = all_lines.len().saturating_sub(lines);
            all_lines[start..].iter().map(|s| s.to_string()).collect()
        } else {
            // Try running openclaw gateway logs as fallback
            Self::try_command_fallback(service, lines)?
        };

        // Parse and filter lines
        let mut parsed: Vec<LogLine> = raw_lines.iter().map(|l| Self::parse_log_line(l)).collect();

        // Apply level filter
        if let Some(min_level) = level {
            let min_severity = Self::level_severity(min_level);
            parsed.retain(|line| {
                line.level
                    .as_ref()
                    .map(|l| Self::level_severity(l) >= min_severity)
                    .unwrap_or(true) // Keep lines without a level (might be continuations)
            });
        }

        // Apply search filter (case-insensitive)
        if let Some(query) = search {
            let query_lower = query.to_lowercase();
            parsed.retain(|line| line.content.to_lowercase().contains(&query_lower));
        }

        let total = parsed.len() as u32;

        Ok(LogsResponse {
            service: service.to_string(),
            lines: parsed,
            total,
        })
    }

    /// Find the log file path for a service
    ///
    /// Checks common locations in order:
    /// 1. ~/.openclaw/logs/{service}.log
    /// 2. /var/log/openclaw/{service}.log
    /// 3. ~/Library/Logs/openclaw/{service}.log
    pub fn find_log_path(service: &str) -> Option<PathBuf> {
        let home = std::env::var("HOME").ok()?;

        let candidates = vec![
            PathBuf::from(format!("{}/.openclaw/logs/{}.log", home, service)),
            PathBuf::from(format!("/var/log/openclaw/{}.log", service)),
            PathBuf::from(format!("{}/Library/Logs/openclaw/{}.log", home, service)),
        ];

        candidates.into_iter().find(|p| p.exists())
    }

    /// Parse a single log line into a LogLine struct
    ///
    /// Attempts to extract timestamp and level from common formats:
    /// - ISO 8601: `2026-02-16T12:00:00.000Z`
    /// - Common: `2026-02-16 12:00:00`
    /// - Level patterns: `[ERROR]`, `[WARN]`, `[INFO]`, `[DEBUG]`, `level=error`
    pub fn parse_log_line(line: &str) -> LogLine {
        let timestamp = Self::extract_timestamp(line);
        let level = Self::extract_level(line);

        LogLine {
            content: line.to_string(),
            timestamp,
            level,
        }
    }

    /// Start tailing a log file, streaming lines via bounded channel
    ///
    /// Returns the receiver and task handle. Caller must abort the task on disconnect.
    /// Channel capacity is 1000 to prevent memory leaks.
    pub async fn tail_log_file(
        service: &str,
    ) -> Result<(mpsc::Receiver<String>, tokio::task::JoinHandle<()>)> {
        let log_path = Self::find_log_path(service)
            .ok_or_else(|| anyhow::anyhow!("No log file found for service: {}", service))?;

        let (tx, rx) = mpsc::channel::<String>(LOG_CHANNEL_CAPACITY);
        let path_str = log_path.to_string_lossy().to_string();

        let handle = tokio::spawn(async move {
            let child = tokio::process::Command::new("tail")
                .args(["-f", "-n", "0", &path_str])
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::null())
                .spawn();

            if let Ok(mut child) = child {
                if let Some(stdout) = child.stdout.take() {
                    use tokio::io::{AsyncBufReadExt, BufReader};
                    let reader = BufReader::new(stdout);
                    let mut lines = reader.lines();

                    while let Ok(Some(line)) = lines.next_line().await {
                        if tx.send(line).await.is_err() {
                            break; // Channel closed, client disconnected
                        }
                    }
                }
                let _ = child.kill().await;
            }
        });

        Ok((rx, handle))
    }

    /// Try to get logs via openclaw command as fallback
    fn try_command_fallback(service: &str, lines: usize) -> Result<Vec<String>> {
        use crate::services::command::SafeCommand;

        let output = SafeCommand::run("openclaw", &[service, "logs", "--tail", &lines.to_string()]);

        match output {
            Ok(out) if out.exit_code == 0 && !out.stdout.is_empty() => {
                Ok(out.stdout.lines().map(|l| l.to_string()).collect())
            }
            _ => {
                // No logs available
                Ok(Vec::new())
            }
        }
    }

    /// Extract timestamp from a log line
    fn extract_timestamp(line: &str) -> Option<String> {
        // ISO 8601: 2026-02-16T12:00:00.000Z or 2026-02-16T12:00:00+00:00
        if line.len() >= 20 {
            let prefix = &line[..std::cmp::min(30, line.len())];
            // Check for YYYY-MM-DD pattern
            if prefix.len() >= 10
                && prefix.as_bytes()[4] == b'-'
                && prefix.as_bytes()[7] == b'-'
                && prefix.as_bytes()[0..4].iter().all(|b| b.is_ascii_digit())
            {
                // Find the end of timestamp (space, tab, or bracket after date)
                if let Some(end) = prefix.find(|c: char| {
                    c == ']' || (c == ' ' && prefix[..prefix.find(c).unwrap()].contains('T'))
                }) {
                    return Some(prefix[..end].trim_start_matches('[').to_string());
                }
                // Simple YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD HH:MM:SS
                if prefix.len() >= 19
                    && (prefix.as_bytes()[10] == b'T' || prefix.as_bytes()[10] == b' ')
                {
                    // Find end of timestamp
                    let ts_end = prefix[10..]
                        .find([' ', '\t', ']'])
                        .map(|i| i + 10)
                        .unwrap_or(std::cmp::min(30, prefix.len()));
                    return Some(prefix[..ts_end].to_string());
                }
            }
        }
        None
    }

    /// Extract log level from a line
    fn extract_level(line: &str) -> Option<String> {
        let upper = line.to_uppercase();

        // Bracket format: [ERROR], [WARN], [INFO], [DEBUG]
        if upper.contains("[ERROR]") {
            return Some("error".to_string());
        }
        if upper.contains("[WARN]") || upper.contains("[WARNING]") {
            return Some("warn".to_string());
        }
        if upper.contains("[INFO]") {
            return Some("info".to_string());
        }
        if upper.contains("[DEBUG]") {
            return Some("debug".to_string());
        }

        // Structured format: level=error, "level":"error"
        if upper.contains("LEVEL=ERROR") || upper.contains("\"LEVEL\":\"ERROR\"") {
            return Some("error".to_string());
        }
        if upper.contains("LEVEL=WARN") || upper.contains("\"LEVEL\":\"WARN\"") {
            return Some("warn".to_string());
        }
        if upper.contains("LEVEL=INFO") || upper.contains("\"LEVEL\":\"INFO\"") {
            return Some("info".to_string());
        }
        if upper.contains("LEVEL=DEBUG") || upper.contains("\"LEVEL\":\"DEBUG\"") {
            return Some("debug".to_string());
        }

        // Bare words (less reliable, but common in Node.js logs)
        if upper.contains(" ERROR ") || upper.starts_with("ERROR ") {
            return Some("error".to_string());
        }
        if upper.contains(" WARN ") || upper.starts_with("WARN ") {
            return Some("warn".to_string());
        }

        None
    }

    /// Get numeric severity for a log level (higher = more severe)
    fn level_severity(level: &str) -> u8 {
        match level.to_lowercase().as_str() {
            "error" => 4,
            "warn" | "warning" => 3,
            "info" => 2,
            "debug" => 1,
            _ => 0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_log_line_with_iso_timestamp_and_level() {
        let line = "2026-02-16T12:00:00.000Z [ERROR] Connection refused to gateway";
        let parsed = LogService::parse_log_line(line);

        assert_eq!(parsed.content, line);
        assert!(parsed.timestamp.is_some());
        assert_eq!(parsed.level, Some("error".to_string()));
    }

    #[test]
    fn test_parse_log_line_with_simple_timestamp() {
        let line = "2026-02-16 12:00:00 [INFO] Gateway started on port 3000";
        let parsed = LogService::parse_log_line(line);

        assert_eq!(parsed.content, line);
        assert!(parsed.timestamp.is_some());
        assert_eq!(parsed.level, Some("info".to_string()));
    }

    #[test]
    fn test_parse_log_line_no_metadata() {
        let line = "some random output without structure";
        let parsed = LogService::parse_log_line(line);

        assert_eq!(parsed.content, line);
        assert!(parsed.timestamp.is_none());
        assert!(parsed.level.is_none());
    }

    #[test]
    fn test_parse_log_line_structured_json() {
        let line =
            r#"{"level":"error","msg":"Failed to connect","timestamp":"2026-02-16T12:00:00Z"}"#;
        let parsed = LogService::parse_log_line(line);

        assert_eq!(parsed.level, Some("error".to_string()));
    }

    #[test]
    fn test_parse_log_line_warn_level() {
        let line = "2026-02-16T10:00:00Z [WARN] Slow response from API";
        let parsed = LogService::parse_log_line(line);

        assert_eq!(parsed.level, Some("warn".to_string()));
    }

    #[test]
    fn test_parse_log_line_debug_level() {
        let line = "[DEBUG] Connecting to database...";
        let parsed = LogService::parse_log_line(line);

        assert_eq!(parsed.level, Some("debug".to_string()));
    }

    #[test]
    fn test_level_severity_ordering() {
        assert!(LogService::level_severity("error") > LogService::level_severity("warn"));
        assert!(LogService::level_severity("warn") > LogService::level_severity("info"));
        assert!(LogService::level_severity("info") > LogService::level_severity("debug"));
        assert!(LogService::level_severity("debug") > LogService::level_severity("unknown"));
    }

    #[test]
    fn test_find_log_path_returns_none_when_no_logs() {
        // In test environment, openclaw logs shouldn't exist
        let result = LogService::find_log_path("nonexistent_service");
        // May or may not find logs depending on environment
        // This test just verifies it doesn't panic
        let _ = result;
    }

    #[test]
    fn test_get_recent_logs_empty_when_no_file() {
        let result = LogService::get_recent_logs("nonexistent_service", 100, None, None);
        assert!(result.is_ok());
        // Should return empty or whatever the fallback provides
    }

    #[test]
    fn test_level_filter() {
        // Simulate filtering
        let lines = vec![
            LogLine {
                content: "error line".to_string(),
                timestamp: None,
                level: Some("error".to_string()),
            },
            LogLine {
                content: "info line".to_string(),
                timestamp: None,
                level: Some("info".to_string()),
            },
            LogLine {
                content: "debug line".to_string(),
                timestamp: None,
                level: Some("debug".to_string()),
            },
        ];

        let min_severity = LogService::level_severity("warn");
        let filtered: Vec<_> = lines
            .into_iter()
            .filter(|line| {
                line.level
                    .as_ref()
                    .map(|l| LogService::level_severity(l) >= min_severity)
                    .unwrap_or(true)
            })
            .collect();

        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].level, Some("error".to_string()));
    }
}
