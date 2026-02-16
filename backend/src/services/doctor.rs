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
    /// 1. Run `openclaw doctor` (plain text TUI output)
    /// 2. Parse sectioned output into structured checks
    /// 3. If command not found, return upgrade suggestion
    pub fn run_diagnostics() -> Result<DoctorReport> {
        let output = match SafeCommand::run("openclaw", &["doctor"]) {
            Ok(output) => output,
            Err(_) => {
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

        let text = if !output.stdout.is_empty() {
            &output.stdout
        } else {
            &output.stderr
        };

        Ok(Self::parse_text_output(text))
    }

    /// Parse openclaw doctor TUI output into a DoctorReport
    ///
    /// The output uses box-drawing characters with named sections:
    /// ```text
    /// ◇  Section Name ──────╮
    /// │                     │
    /// │  - CRITICAL: ...    │
    /// │  - Some warning ... │
    /// │                     │
    /// ├─────────────────────╯
    /// ```
    /// Also handles legacy bracket/colon/unicode formats and plain status lines.
    pub fn parse_text_output(text: &str) -> DoctorReport {
        let mut checks = Vec::new();
        let mut current_section: Option<String> = None;
        let mut section_lines: Vec<String> = Vec::new();

        // Strip ANSI escape codes for clean parsing
        let clean = Self::strip_ansi(text);

        for line in clean.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            // Detect section header: "◇  Section Name ───"
            if let Some(name) = Self::extract_section_name(trimmed) {
                // Flush previous section
                if let Some(ref sec) = current_section {
                    Self::flush_section(sec, &section_lines, &mut checks);
                }
                current_section = Some(name);
                section_lines.clear();
                continue;
            }

            // Detect section close: "├───" or "└───"
            if trimmed.starts_with('├') || trimmed.starts_with('└') {
                if let Some(ref sec) = current_section {
                    Self::flush_section(sec, &section_lines, &mut checks);
                }
                current_section = None;
                section_lines.clear();
                continue;
            }

            // Inside a section - collect content lines (strip leading │ and box chars)
            if current_section.is_some() {
                let content = trimmed
                    .trim_start_matches('│')
                    .trim_start_matches('|')
                    .trim();
                if !content.is_empty() {
                    section_lines.push(content.to_string());
                }
                continue;
            }

            // Outside sections - parse standalone status lines
            // Legacy bracket format: [PASS], [FAIL], [WARN]
            if let Some(check) = Self::parse_legacy_line(trimmed) {
                checks.push(check);
                continue;
            }

            // Plain status lines like "Telegram: not configured"
            if let Some(check) = Self::parse_status_line(trimmed) {
                checks.push(check);
            }
        }

        // Flush any remaining section
        if let Some(ref sec) = current_section {
            Self::flush_section(sec, &section_lines, &mut checks);
        }

        if checks.is_empty() {
            checks.push(DiagnosticCheck {
                name: "Doctor".to_string(),
                status: "pass".to_string(),
                message: "No issues detected".to_string(),
                fix_suggestion: None,
            });
        }

        let overall_status = Self::compute_overall_status(&checks);

        DoctorReport {
            checks,
            overall_status,
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    /// Strip ANSI escape sequences from text
    fn strip_ansi(text: &str) -> String {
        let mut result = String::with_capacity(text.len());
        let mut chars = text.chars().peekable();
        while let Some(ch) = chars.next() {
            if ch == '\x1b' {
                // Skip until we hit a letter (end of escape sequence)
                while let Some(&next) = chars.peek() {
                    chars.next();
                    if next.is_ascii_alphabetic() {
                        break;
                    }
                }
            } else {
                result.push(ch);
            }
        }
        result
    }

    /// Extract section name from a header line like "◇  Section Name ───╮"
    fn extract_section_name(line: &str) -> Option<String> {
        // Look for ◇ followed by section name, or just a line ending with ─╮
        let stripped = line.trim_start_matches('◇').trim_start_matches('◆');
        if stripped.len() == line.len() {
            return None; // No section marker found
        }
        // Extract the name before the ── delimiter
        if let Some(dash_pos) = stripped.find('─') {
            let name = stripped[..dash_pos].trim();
            if !name.is_empty() {
                return Some(name.to_string());
            }
        }
        None
    }

    /// Convert section content into diagnostic checks
    fn flush_section(section: &str, lines: &[String], checks: &mut Vec<DiagnosticCheck>) {
        let section_lower = section.to_lowercase();

        // Skip purely informational/prompt sections
        if section_lower.contains("doctor changes") || section_lower == "doctor" {
            // These are just instructions like "run openclaw doctor --fix"
            return;
        }

        for line in lines {
            let line_lower = line.to_lowercase();

            // Detect severity from content
            let (status, message) = if line_lower.contains("critical:") {
                ("fail", line.trim_start_matches("- ").to_string())
            } else if line_lower.starts_with("- ")
                && (line_lower.contains("recommend")
                    || line_lower.contains("too open")
                    || line_lower.contains("missing"))
            {
                ("warn", line.trim_start_matches("- ").to_string())
            } else if line_lower.contains("no ") && line_lower.contains("warning") {
                ("pass", line.trim_start_matches("- ").to_string())
            } else if line_lower.starts_with("eligible:")
                || line_lower.starts_with("loaded:")
                || line_lower.starts_with("disabled:")
                || line_lower.starts_with("errors: 0")
                || line_lower.starts_with("missing requirements:")
                || line_lower.starts_with("blocked by")
            {
                // Informational stats - bundle as a single pass check per section
                continue; // Handled below as section summary
            } else if line_lower.starts_with("errors:") && !line_lower.contains("errors: 0") {
                ("warn", format!("{}: {}", section, line))
            } else if line_lower.starts_with("- ") {
                ("warn", line.trim_start_matches("- ").to_string())
            } else if line_lower.starts_with("run ") || line_lower.starts_with("run:") {
                // Suggestion line like "Run: openclaw security audit --deep"
                continue;
            } else {
                continue;
            };

            checks.push(DiagnosticCheck {
                name: section.to_string(),
                status: status.to_string(),
                message,
                fix_suggestion: None,
            });
        }

        // For stats sections (Skills, Plugins), emit a summary check
        if section_lower.contains("skills") || section_lower.contains("plugins") {
            let summary: Vec<&str> = lines.iter().map(|l| l.as_str()).collect();
            if !summary.is_empty() {
                let has_errors = lines.iter().any(|l| {
                    let lower = l.to_lowercase();
                    lower.starts_with("errors:") && !lower.contains("errors: 0")
                });
                checks.push(DiagnosticCheck {
                    name: section.to_string(),
                    status: if has_errors { "warn" } else { "pass" }.to_string(),
                    message: summary.join(", "),
                    fix_suggestion: None,
                });
            }
        }
    }

    /// Parse legacy format lines: [PASS], [FAIL], [WARN], PASS:, ✓, etc.
    fn parse_legacy_line(trimmed: &str) -> Option<DiagnosticCheck> {
        let (status, rest) = if trimmed.starts_with("[PASS]") || trimmed.starts_with("[pass]") {
            ("pass", &trimmed[6..])
        } else if trimmed.starts_with("[FAIL]") || trimmed.starts_with("[fail]") {
            ("fail", &trimmed[6..])
        } else if trimmed.starts_with("[WARN]") || trimmed.starts_with("[warn]") {
            ("warn", &trimmed[6..])
        } else if let Some(rest) = trimmed.strip_prefix("PASS:") {
            ("pass", rest)
        } else if let Some(rest) = trimmed.strip_prefix("FAIL:") {
            ("fail", rest)
        } else if let Some(rest) = trimmed.strip_prefix("WARN:") {
            ("warn", rest)
        } else if trimmed.starts_with('\u{2713}') || trimmed.starts_with('\u{2714}') {
            ("pass", &trimmed[3..])
        } else if trimmed.starts_with('\u{2717}') || trimmed.starts_with('\u{2718}') {
            ("fail", &trimmed[3..])
        } else if let Some(rest) = trimmed.strip_prefix('\u{26A0}') {
            ("warn", rest)
        } else {
            return None;
        };

        let name = rest.trim().to_string();
        Some(DiagnosticCheck {
            name: name.clone(),
            status: status.to_string(),
            message: name,
            fix_suggestion: None,
        })
    }

    /// Parse plain status lines like "Telegram: not configured"
    fn parse_status_line(trimmed: &str) -> Option<DiagnosticCheck> {
        // Match "Service: status" pattern
        if let Some(colon_pos) = trimmed.find(':') {
            let key = trimmed[..colon_pos].trim();
            let value = trimmed[colon_pos + 1..].trim();

            // Only match known service/status patterns
            let known = ["Telegram", "Slack", "Discord", "Agents", "Heartbeat"];
            if known.iter().any(|k| key.eq_ignore_ascii_case(k)) {
                let status = if value.to_lowercase().contains("not configured") {
                    "warn"
                } else {
                    "pass"
                };
                return Some(DiagnosticCheck {
                    name: key.to_string(),
                    status: status.to_string(),
                    message: format!("{}: {}", key, value),
                    fix_suggestion: None,
                });
            }
        }
        None
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
    fn test_parse_tui_output() {
        let text = r#"
◇  State integrity ─────────────────────────────────────────────────────╮
│                                                                       │
│  - State directory permissions are too open (~/.openclaw). Recommend  │
│    chmod 700.                                                         │
│  - CRITICAL: OAuth dir missing (~/.openclaw/credentials).             │
│                                                                       │
├───────────────────────────────────────────────────────────────────────╯

◇  Security ─────────────────────────────────╮
│                                            │
│  - No channel security warnings detected.  │
│                                            │
├────────────────────────────────────────────╯

◇  Skills status ────────────╮
│                            │
│  Eligible: 9               │
│  Missing requirements: 40  │
│  Blocked by allowlist: 0   │
│                            │
├────────────────────────────╯

◇  Plugins ──────╮
│                │
│  Loaded: 5     │
│  Disabled: 31  │
│  Errors: 0     │
│                │
├────────────────╯
Telegram: not configured
Agents: main (default)
"#;
        let report = DoctorService::parse_text_output(text);

        // State integrity: 1 warn (permissions) + 1 fail (CRITICAL: OAuth)
        let state_checks: Vec<_> = report
            .checks
            .iter()
            .filter(|c| c.name == "State integrity")
            .collect();
        assert_eq!(state_checks.len(), 2);
        assert!(state_checks.iter().any(|c| c.status == "fail"));
        assert!(state_checks.iter().any(|c| c.status == "warn"));

        // Security: 1 pass
        let security_checks: Vec<_> = report
            .checks
            .iter()
            .filter(|c| c.name == "Security")
            .collect();
        assert_eq!(security_checks.len(), 1);
        assert_eq!(security_checks[0].status, "pass");

        // Skills: 1 pass summary
        assert!(
            report
                .checks
                .iter()
                .any(|c| c.name == "Skills status" && c.status == "pass")
        );

        // Plugins: 1 pass summary (errors: 0)
        assert!(
            report
                .checks
                .iter()
                .any(|c| c.name == "Plugins" && c.status == "pass")
        );

        // Telegram: warn (not configured)
        assert!(
            report
                .checks
                .iter()
                .any(|c| c.name == "Telegram" && c.status == "warn")
        );

        // Agents: pass
        assert!(
            report
                .checks
                .iter()
                .any(|c| c.name == "Agents" && c.status == "pass")
        );

        // Overall: critical (because of CRITICAL in state integrity)
        assert_eq!(report.overall_status, "critical");
    }

    #[test]
    fn test_parse_legacy_bracket_format() {
        let text = "[PASS] Node.js version check\n[FAIL] Config exists\n[WARN] Port available\n";
        let report = DoctorService::parse_text_output(text);

        assert_eq!(report.checks.len(), 3);
        assert_eq!(report.checks[0].status, "pass");
        assert_eq!(report.checks[1].status, "fail");
        assert_eq!(report.checks[2].status, "warn");
        assert_eq!(report.overall_status, "critical");
    }

    #[test]
    fn test_parse_colon_format() {
        let text = "PASS: Node installed\nFAIL: Config missing\n";
        let report = DoctorService::parse_text_output(text);

        assert_eq!(report.checks.len(), 2);
        assert_eq!(report.checks[0].status, "pass");
        assert_eq!(report.checks[1].status, "fail");
        assert_eq!(report.overall_status, "critical");
    }

    #[test]
    fn test_parse_unicode_format() {
        let text = "✓ Node.js 22 installed\n✗ API key configured\n";
        let report = DoctorService::parse_text_output(text);

        assert_eq!(report.checks.len(), 2);
        assert_eq!(report.checks[0].status, "pass");
        assert_eq!(report.checks[1].status, "fail");
    }

    #[test]
    fn test_empty_output_returns_pass() {
        let text = "Some unrecognized output format\nAnother line\n";
        let report = DoctorService::parse_text_output(text);

        // No recognized checks → defaults to "No issues detected" pass
        assert_eq!(report.checks.len(), 1);
        assert_eq!(report.checks[0].status, "pass");
        assert_eq!(report.overall_status, "healthy");
    }

    #[test]
    fn test_all_pass_is_healthy() {
        let text = "[PASS] Check 1\n[PASS] Check 2\n";
        let report = DoctorService::parse_text_output(text);
        assert_eq!(report.overall_status, "healthy");
    }

    #[test]
    fn test_warn_without_fail_is_warning() {
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

    #[test]
    fn test_strip_ansi() {
        let text = "\x1b[32mPASS\x1b[0m: Node installed";
        let clean = DoctorService::strip_ansi(text);
        assert_eq!(clean, "PASS: Node installed");
    }

    #[test]
    fn test_extract_section_name() {
        assert_eq!(
            DoctorService::extract_section_name("◇  State integrity ─────╮"),
            Some("State integrity".to_string())
        );
        assert_eq!(
            DoctorService::extract_section_name("◇  Plugins ──────╮"),
            Some("Plugins".to_string())
        );
        assert_eq!(
            DoctorService::extract_section_name("│  some content  │"),
            None
        );
        assert_eq!(DoctorService::extract_section_name("random text"), None);
    }

    #[test]
    fn test_doctor_changes_section_skipped() {
        let text = r#"
◇  Doctor changes ───────────────────────────╮
│                                            │
│  Slack configured, enabled automatically.  │
│                                            │
├────────────────────────────────────────────╯

◇  Doctor ──────────────────────────────────────────────╮
│                                                       │
│  Run "openclaw doctor --fix" to apply these changes.  │
│                                                       │
├───────────────────────────────────────────────────────╯
"#;
        let report = DoctorService::parse_text_output(text);
        // Doctor changes and Doctor sections should be skipped
        assert_eq!(report.checks.len(), 1);
        assert_eq!(report.checks[0].message, "No issues detected");
    }
}
