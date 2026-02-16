//! # Service Manager - Gateway Lifecycle Control
//!
//! Manages the OpenClaw gateway service (launchd/systemd/schtasks).
//! Note: `openclaw daemon` is a legacy alias for `openclaw gateway` -
//! there is only one service to manage.

use crate::models::types::{ServiceActionResponse, ServiceProcessStatus, ServicesStatus};
use crate::services::command::SafeCommand;
use anyhow::{Context, Result};
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{ProcessesToUpdate, System};

pub struct ServiceManager;

impl ServiceManager {
    /// Get status for gateway with system metrics.
    /// The `daemon` field mirrors gateway (they are the same service).
    pub fn services_status() -> ServicesStatus {
        let mut sys = System::new_all();
        sys.refresh_processes(ProcessesToUpdate::All, true);

        let gateway = Self::find_gateway_process(&sys);
        let error_count_24h = Self::count_recent_errors();

        let system_cpu_percent = Some(sys.global_cpu_usage());
        let system_memory_total_mb = Some(sys.total_memory() / 1024 / 1024);
        let system_memory_used_mb = Some(sys.used_memory() / 1024 / 1024);

        ServicesStatus {
            gateway: gateway.clone(),
            daemon: gateway, // daemon is a legacy alias for gateway
            error_count_24h,
            system_cpu_percent,
            system_memory_total_mb,
            system_memory_used_mb,
        }
    }

    /// Check if the gateway service is installed (launchd/systemd/schtasks)
    fn is_gateway_installed() -> bool {
        match SafeCommand::run("openclaw", &["gateway", "status"]) {
            Ok(output) => {
                let combined = format!("{}{}", output.stdout, output.stderr);
                // If the status output says "not installed", it's not installed
                !combined.contains("Service not installed")
                    && !combined.contains("not loaded")
                    && !combined.contains("Service unit not found")
            }
            Err(_) => false,
        }
    }

    /// Install the gateway service (launchd/systemd/schtasks)
    fn install_gateway() -> Result<()> {
        let output = SafeCommand::run("openclaw", &["gateway", "install"])
            .context("Failed to execute 'openclaw gateway install'")?;

        if output.exit_code != 0 {
            anyhow::bail!(
                "Failed to install gateway service (exit code {}): {}",
                output.exit_code,
                output.stderr.trim()
            );
        }
        Ok(())
    }

    /// Start the OpenClaw gateway. Auto-installs the service if not installed.
    pub fn start_gateway() -> Result<ServiceActionResponse> {
        // Auto-install if service is not installed
        if !Self::is_gateway_installed()
            && let Err(e) = Self::install_gateway()
        {
            return Ok(ServiceActionResponse {
                success: false,
                service: "gateway".to_string(),
                message: format!(
                    "Gateway service not installed and auto-install failed: {}",
                    e
                ),
            });
        }

        let output = SafeCommand::run("openclaw", &["gateway", "start"])
            .context("Failed to execute 'openclaw gateway start'")?;

        if output.exit_code != 0 {
            return Ok(ServiceActionResponse {
                success: false,
                service: "gateway".to_string(),
                message: format!(
                    "Failed to start gateway (exit code {}): {}",
                    output.exit_code,
                    output.stderr.trim()
                ),
            });
        }

        Ok(ServiceActionResponse {
            success: true,
            service: "gateway".to_string(),
            message: "Gateway started successfully".to_string(),
        })
    }

    /// Stop the OpenClaw gateway
    pub fn stop_gateway() -> Result<ServiceActionResponse> {
        let output = SafeCommand::run("openclaw", &["gateway", "stop"])
            .context("Failed to execute 'openclaw gateway stop'")?;

        if output.exit_code != 0 {
            return Ok(ServiceActionResponse {
                success: false,
                service: "gateway".to_string(),
                message: format!(
                    "Failed to stop gateway (exit code {}): {}",
                    output.exit_code,
                    output.stderr.trim()
                ),
            });
        }

        Ok(ServiceActionResponse {
            success: true,
            service: "gateway".to_string(),
            message: "Gateway stopped successfully".to_string(),
        })
    }

    /// Restart the OpenClaw gateway
    pub fn restart_gateway() -> Result<ServiceActionResponse> {
        let output = SafeCommand::run("openclaw", &["gateway", "restart"])
            .context("Failed to execute 'openclaw gateway restart'")?;

        if output.exit_code != 0 {
            return Ok(ServiceActionResponse {
                success: false,
                service: "gateway".to_string(),
                message: format!(
                    "Failed to restart gateway (exit code {}): {}",
                    output.exit_code,
                    output.stderr.trim()
                ),
            });
        }

        Ok(ServiceActionResponse {
            success: true,
            service: "gateway".to_string(),
            message: "Gateway restarted successfully".to_string(),
        })
    }

    /// Daemon methods are aliases for gateway (daemon is a legacy alias)
    pub fn start_daemon() -> Result<ServiceActionResponse> {
        Self::start_gateway()
    }

    pub fn stop_daemon() -> Result<ServiceActionResponse> {
        Self::stop_gateway()
    }

    pub fn restart_daemon() -> Result<ServiceActionResponse> {
        Self::restart_gateway()
    }

    /// Find the gateway process by looking for node processes running openclaw gateway
    fn find_gateway_process(sys: &System) -> ServiceProcessStatus {
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        for (pid, process) in sys.processes() {
            let name = process.name().to_string_lossy().to_lowercase();
            let cmd_args: Vec<String> = process
                .cmd()
                .iter()
                .map(|s| s.to_string_lossy().to_lowercase())
                .collect();

            if name.contains("node") {
                let cmd_str = cmd_args.join(" ");

                // Skip wizard processes
                if cmd_str.contains("vite")
                    || cmd_str.contains("openclaw-wizard")
                    || cmd_str.contains("vitest")
                {
                    continue;
                }

                // Must contain "gateway" to match the gateway process
                if cmd_str.contains("gateway") {
                    let start_time = process.start_time();
                    let uptime_seconds = if start_time > 0 {
                        Some(current_time.saturating_sub(start_time))
                    } else {
                        None
                    };

                    return ServiceProcessStatus {
                        running: true,
                        pid: Some(pid.as_u32()),
                        uptime_seconds,
                        memory_mb: Some(process.memory() / 1024 / 1024),
                        cpu_percent: Some(process.cpu_usage()),
                    };
                }
            }
        }

        ServiceProcessStatus {
            running: false,
            pid: None,
            uptime_seconds: None,
            memory_mb: None,
            cpu_percent: None,
        }
    }

    /// Count ERROR lines in log files from the last 24 hours
    fn count_recent_errors() -> u32 {
        let home = match std::env::var("HOME") {
            Ok(h) => h,
            Err(_) => return 0,
        };

        let log_paths = vec![
            format!("{}/.openclaw/logs", home),
            "/var/log/openclaw".to_string(),
            format!("{}/Library/Logs/openclaw", home),
            "/tmp/openclaw".to_string(),
        ];

        let twenty_four_hours_ago = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .saturating_sub(86400);

        let mut total_errors: u32 = 0;

        for log_dir in &log_paths {
            let dir = std::path::Path::new(log_dir);
            if !dir.exists() {
                continue;
            }

            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|e| e.to_str()) != Some("log") {
                        continue;
                    }

                    if let Ok(metadata) = path.metadata()
                        && let Ok(modified) = metadata.modified()
                    {
                        let modified_secs = modified
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs();
                        if modified_secs < twenty_four_hours_ago {
                            continue;
                        }
                    }

                    if let Ok(content) = std::fs::read_to_string(&path) {
                        let count = content
                            .lines()
                            .filter(|line| {
                                line.contains("ERROR") || line.contains("\"level\":\"error\"")
                            })
                            .count();
                        total_errors = total_errors.saturating_add(count as u32);
                    }
                }
            }
        }

        total_errors
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_services_status_returns_valid_struct() {
        let status = ServiceManager::services_status();

        if status.gateway.running {
            assert!(status.gateway.pid.is_some());
        } else {
            assert!(status.gateway.pid.is_none());
        }

        // daemon mirrors gateway
        assert_eq!(status.gateway.running, status.daemon.running);

        assert!(status.system_cpu_percent.is_some());
        assert!(status.system_memory_total_mb.is_some());
        assert!(status.system_memory_used_mb.is_some());
    }

    #[test]
    fn test_count_recent_errors_returns_zero_when_no_logs() {
        let count = ServiceManager::count_recent_errors();
        assert!(count < u32::MAX);
    }

    #[test]
    fn test_find_gateway_process() {
        let mut sys = System::new_all();
        sys.refresh_processes(ProcessesToUpdate::All, true);

        let status = ServiceManager::find_gateway_process(&sys);
        if !status.running {
            assert!(status.pid.is_none());
            assert!(status.uptime_seconds.is_none());
        }
    }
}
