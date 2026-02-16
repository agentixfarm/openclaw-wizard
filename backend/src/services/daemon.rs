//! # Daemon Process Management Service
//!
//! Manages the OpenClaw gateway daemon process: start, stop, restart, status checking.
//! Uses sysinfo for cross-platform process detection and SafeCommand for CLI execution.

use crate::models::types::DaemonStatus;
use crate::services::command::SafeCommand;
use anyhow::{Context, Result};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use sysinfo::{ProcessesToUpdate, System};

pub struct DaemonService;

impl DaemonService {
    /// Get current status of the OpenClaw gateway daemon
    ///
    /// Searches for a running process that matches the OpenClaw gateway pattern:
    /// - Process name contains "node"
    /// - Command args contain "openclaw" or "gateway"
    pub fn status() -> DaemonStatus {
        let mut sys = System::new_all();
        sys.refresh_processes(ProcessesToUpdate::All, true);

        // Find OpenClaw gateway process
        for (pid, process) in sys.processes() {
            let name = process.name().to_string_lossy().to_lowercase();
            let cmd_args: Vec<String> = process
                .cmd()
                .iter()
                .map(|s| s.to_string_lossy().to_lowercase())
                .collect();

            // Match pattern: node process running openclaw gateway
            if name.contains("node") {
                let cmd_str = cmd_args.join(" ");
                if cmd_str.contains("openclaw") || cmd_str.contains("gateway") {
                    // Found it - gather metrics
                    let start_time = process.start_time();
                    let current_time = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();

                    let uptime_seconds = if start_time > 0 {
                        Some(current_time - start_time)
                    } else {
                        None
                    };

                    return DaemonStatus {
                        running: true,
                        pid: Some(pid.as_u32()),
                        uptime_seconds,
                        memory_mb: Some(process.memory() / 1024 / 1024),
                        cpu_percent: Some(process.cpu_usage()),
                    };
                }
            }
        }

        // Not found
        DaemonStatus {
            running: false,
            pid: None,
            uptime_seconds: None,
            memory_mb: None,
            cpu_percent: None,
        }
    }

    /// Start the OpenClaw gateway daemon
    ///
    /// Executes `openclaw gateway start` using SafeCommand.
    /// Returns Ok on successful start, Err if command fails.
    pub fn start() -> Result<()> {
        let output = SafeCommand::run("openclaw", &["gateway", "start"])
            .context("Failed to execute 'openclaw gateway start'")?;

        if output.exit_code != 0 {
            anyhow::bail!(
                "Failed to start daemon (exit code {}): {}",
                output.exit_code,
                output.stderr.trim()
            );
        }

        Ok(())
    }

    /// Stop the OpenClaw gateway daemon
    ///
    /// Executes `openclaw gateway stop` using SafeCommand.
    /// Returns Ok on successful stop, Err if command fails.
    pub fn stop() -> Result<()> {
        let output = SafeCommand::run("openclaw", &["gateway", "stop"])
            .context("Failed to execute 'openclaw gateway stop'")?;

        if output.exit_code != 0 {
            anyhow::bail!(
                "Failed to stop daemon (exit code {}): {}",
                output.exit_code,
                output.stderr.trim()
            );
        }

        Ok(())
    }

    /// Restart the OpenClaw gateway daemon
    ///
    /// Stops, waits 2 seconds, then starts the daemon.
    /// Returns Ok on successful restart, Err if either operation fails.
    pub fn restart() -> Result<()> {
        // Stop first (ignore error if already stopped)
        let _ = Self::stop();

        // Wait for graceful shutdown
        std::thread::sleep(Duration::from_secs(2));

        // Start again
        Self::start().context("Failed to start daemon after stop")?;

        Ok(())
    }

    /// Install the OpenClaw gateway as a system service
    ///
    /// Executes `openclaw onboard --install-daemon` using SafeCommand.
    /// Returns Ok on successful installation, Err if command fails.
    #[allow(dead_code)]
    pub fn install_service() -> Result<()> {
        let output = SafeCommand::run("openclaw", &["onboard", "--install-daemon"])
            .context("Failed to execute 'openclaw onboard --install-daemon'")?;

        if output.exit_code != 0 {
            anyhow::bail!(
                "Failed to install daemon service (exit code {}): {}",
                output.exit_code,
                output.stderr.trim()
            );
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_status_returns_valid_struct() {
        // Should always return a valid DaemonStatus, even if daemon not running
        let status = DaemonService::status();

        if status.running {
            assert!(status.pid.is_some());
            assert!(status.memory_mb.is_some());
        } else {
            assert!(status.pid.is_none());
            assert!(status.uptime_seconds.is_none());
        }
    }
}
