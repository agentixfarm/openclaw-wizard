//! # Doctor Diagnostics Service
//!
//! Wraps `openclaw doctor` to provide structured diagnostic results.
//! Tries JSON output first, falls back to plain text parsing, handles
//! missing command gracefully for older OpenClaw versions.

use crate::models::types::{DiagnosticCheck, DoctorReport};
use crate::services::command::SafeCommand;
use anyhow::Result;
use chrono::Utc;

pub struct DoctorService;

impl DoctorService {
    /// Run openclaw doctor diagnostics
    ///
    /// Strategy:
    /// 1. Try `openclaw doctor --json` for structured output
    /// 2. If JSON parse fails, fall back to text parsing
    /// 3. If command not found / "unknown command", return upgrade suggestion
    pub fn run_diagnostics() -> Result<DoctorReport> {
        let output = match SafeCommand::run("openclaw", &["doctor", "--json"]) {
            Ok(output) => output,
            Err(_) => {
                // Command not found at all (openclaw not installed)
                return Ok(Self::command_not_available(
                    "OpenClaw is not installed or not in PATH",
                ));
            }
        };

        // Check for "unknown command" in stderr (older versions)
        if output.stderr.contains("unknown command")
            || output.stderr.contains("Unknown command")
            || output.stderr.contains("not a recognized")
        {
            return Ok(Self::command_not_available(
                "The 'doctor' command is not available in your OpenClaw version",
            ));
        }

        // Try parsing stdout as JSON first
        let stdout = output.stdout.trim();
        if !stdout.is_empty() {
            if let Ok(report) = serde_json::from_str::<DoctorReport>(stdout) {
                return Ok(report);
            }

            // Try parsing as array of checks
            if let Ok(checks) = serde_json::from_str::<Vec<DiagnosticCheck>>(stdout) {
                let overall_status = Self::compute_overall_status(&checks);
                return Ok(DoctorReport {
                    checks,
                    overall_status,
                    timestamp: Utc::now().to_rfc3339(),
                });
            }
        }

        // Fall back to text parsing
        let text = if !output.stdout.is_empty() {
            &output.stdout
        } else {
            &output.stderr
        };

        Ok(Self::parse_text_output(text))
    }

    /// Parse plain text doctor output into a DoctorReport
    ///
    /// Recognizes patterns like:
    /// - "[PASS] Check name" / "[FAIL] Check name" / "[WARN] Check name"
    /// - "✓ Check name" / "✗ Check name" / "⚠ Check name"
    /// - "PASS: Check name" / "FAIL: Check name"
    pub fn parse_text_output(text: &str) -> DoctorReport {
        let mut checks = Vec::new();

        for line in text.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            let (status, rest) = if trimmed.starts_with("[PASS]") || trimmed.starts_with("[pass]") {
                ("pass", trimmed[6..].trim())
            } else if trimmed.starts_with("[FAIL]") || trimmed.starts_with("[fail]") {
                ("fail", trimmed[6..].trim())
            } else if trimmed.starts_with("[WARN]") || trimmed.starts_with("[warn]") {
                ("warn", trimmed[6..].trim())
            } else if trimmed.starts_with("PASS:") {
                ("pass", trimmed[5..].trim())
            } else if trimmed.starts_with("FAIL:") {
                ("fail", trimmed[5..].trim())
            } else if trimmed.starts_with("WARN:") {
                ("warn", trimmed[5..].trim())
            } else if trimmed.starts_with('\u{2713}') || trimmed.starts_with('\u{2714}') {
                // ✓ or ✔
                ("pass", trimmed[3..].trim())
            } else if trimmed.starts_with('\u{2717}') || trimmed.starts_with('\u{2718}') {
                // ✗ or ✘
                ("fail", trimmed[3..].trim())
            } else if trimmed.starts_with('\u{26A0}') {
                // ⚠
                ("warn", trimmed[3..].trim())
            } else {
                continue;
            };

            checks.push(DiagnosticCheck {
                name: rest.to_string(),
                status: status.to_string(),
                message: rest.to_string(),
                fix_suggestion: None,
            });
        }

        if checks.is_empty() {
            // Could not parse any checks - return the raw text as a single check
            checks.push(DiagnosticCheck {
                name: "Doctor output".to_string(),
                status: "warn".to_string(),
                message: text.trim().to_string(),
                fix_suggestion: Some(
                    "Could not parse doctor output. Check OpenClaw version.".to_string(),
                ),
            });
        }

        let overall_status = Self::compute_overall_status(&checks);

        DoctorReport {
            checks,
            overall_status,
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    /// Create a report for when the doctor command is not available
    fn command_not_available(message: &str) -> DoctorReport {
        DoctorReport {
            checks: vec![DiagnosticCheck {
                name: "openclaw doctor".to_string(),
                status: "fail".to_string(),
                message: message.to_string(),
                fix_suggestion: Some(
                    "Upgrade OpenClaw to the latest version: npm update -g @anthropic/openclaw"
                        .to_string(),
                ),
            }],
            overall_status: "critical".to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    /// Compute overall status from individual checks
    fn compute_overall_status(checks: &[DiagnosticCheck]) -> String {
        if checks.iter().any(|c| c.status == "fail") {
            "critical".to_string()
        } else if checks.iter().any(|c| c.status == "warn") {
            "warning".to_string()
        } else {
            "healthy".to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_text_output_bracket_format() {
        let text = r#"[PASS] Node.js version check
[FAIL] OpenClaw config exists
[WARN] Gateway port available
"#;
        let report = DoctorService::parse_text_output(text);

        assert_eq!(report.checks.len(), 3);
        assert_eq!(report.checks[0].status, "pass");
        assert_eq!(report.checks[0].name, "Node.js version check");
        assert_eq!(report.checks[1].status, "fail");
        assert_eq!(report.checks[1].name, "OpenClaw config exists");
        assert_eq!(report.checks[2].status, "warn");
        assert_eq!(report.checks[2].name, "Gateway port available");
        assert_eq!(report.overall_status, "critical");
    }

    #[test]
    fn test_parse_text_output_colon_format() {
        let text = "PASS: Node installed\nFAIL: Config missing\n";
        let report = DoctorService::parse_text_output(text);

        assert_eq!(report.checks.len(), 2);
        assert_eq!(report.checks[0].status, "pass");
        assert_eq!(report.checks[1].status, "fail");
        assert_eq!(report.overall_status, "critical");
    }

    #[test]
    fn test_parse_text_output_unicode_format() {
        let text = "✓ Node.js 22 installed\n✗ API key configured\n";
        let report = DoctorService::parse_text_output(text);

        assert_eq!(report.checks.len(), 2);
        assert_eq!(report.checks[0].status, "pass");
        assert_eq!(report.checks[1].status, "fail");
    }

    #[test]
    fn test_parse_text_output_empty_returns_fallback() {
        let text = "Some unrecognized output format\nAnother line\n";
        let report = DoctorService::parse_text_output(text);

        // Should fall back to a single warn check with raw text
        assert_eq!(report.checks.len(), 1);
        assert_eq!(report.checks[0].status, "warn");
        assert!(report.checks[0].fix_suggestion.is_some());
    }

    #[test]
    fn test_parse_text_output_all_pass_is_healthy() {
        let text = "[PASS] Check 1\n[PASS] Check 2\n";
        let report = DoctorService::parse_text_output(text);

        assert_eq!(report.overall_status, "healthy");
    }

    #[test]
    fn test_parse_text_output_warn_without_fail_is_warning() {
        let text = "[PASS] Check 1\n[WARN] Check 2\n";
        let report = DoctorService::parse_text_output(text);

        assert_eq!(report.overall_status, "warning");
    }

    #[test]
    fn test_command_not_available() {
        let report = DoctorService::command_not_available("Test message");

        assert_eq!(report.checks.len(), 1);
        assert_eq!(report.checks[0].name, "openclaw doctor");
        assert_eq!(report.checks[0].status, "fail");
        assert_eq!(report.overall_status, "critical");
        assert!(report.checks[0].fix_suggestion.is_some());
    }

    #[test]
    fn test_compute_overall_status() {
        let pass_only = vec![DiagnosticCheck {
            name: "test".to_string(),
            status: "pass".to_string(),
            message: "ok".to_string(),
            fix_suggestion: None,
        }];
        assert_eq!(DoctorService::compute_overall_status(&pass_only), "healthy");

        let with_warn = vec![
            DiagnosticCheck {
                name: "test".to_string(),
                status: "pass".to_string(),
                message: "ok".to_string(),
                fix_suggestion: None,
            },
            DiagnosticCheck {
                name: "test2".to_string(),
                status: "warn".to_string(),
                message: "warning".to_string(),
                fix_suggestion: None,
            },
        ];
        assert_eq!(DoctorService::compute_overall_status(&with_warn), "warning");

        let with_fail = vec![DiagnosticCheck {
            name: "test".to_string(),
            status: "fail".to_string(),
            message: "bad".to_string(),
            fix_suggestion: None,
        }];
        assert_eq!(
            DoctorService::compute_overall_status(&with_fail),
            "critical"
        );
    }
}
