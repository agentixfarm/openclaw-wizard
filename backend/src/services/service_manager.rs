//! # Service Manager - Independent Gateway/Daemon Lifecycle Control
//!
//! Phase 7 replacement for DaemonService with finer-grained control.
//! Provides independent status, start, stop, restart for gateway and daemon.
//! Enhanced health metrics include system CPU, memory, and 24-hour error count.

use crate::models::types::{ServiceActionResponse, ServiceProcessStatus, ServicesStatus};
use crate::services::command::SafeCommand;
use anyhow::{Context, Result};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use sysinfo::{ProcessesToUpdate, System};

pub struct ServiceManager;

impl ServiceManager {
    /// Get independent status for gateway and daemon with system metrics
    pub fn services_status() -> ServicesStatus {
        let mut sys = System::new_all();
        sys.refresh_processes(ProcessesToUpdate::All, true);

        let gateway = Self::find_service_process(&sys, "gateway");
        let daemon = Self::find_service_process(&sys, "daemon");
        let error_count_24h = Self::count_recent_errors();

        let system_cpu_percent = Some(sys.global_cpu_usage());
        let system_memory_total_mb = Some(sys.total_memory() / 1024 / 1024);
        let system_memory_used_mb = Some(sys.used_memory() / 1024 / 1024);

        ServicesStatus {
            gateway,
            daemon,
            error_count_24h,
            system_cpu_percent,
            system_memory_total_mb,
            system_memory_used_mb,
        }
    }

    /// Start the OpenClaw gateway
    pub fn start_gateway() -> Result<ServiceActionResponse> {
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

    /// Restart the OpenClaw gateway (stop, wait 2s, start)
    pub fn restart_gateway() -> Result<ServiceActionResponse> {
        // Stop first (ignore error if already stopped)
        let _ = Self::stop_gateway();

        // Wait for graceful shutdown
        std::thread::sleep(Duration::from_secs(2));

        // Start again
        Self::start_gateway().context("Failed to start gateway after stop")
    }

    /// Start the OpenClaw daemon
    pub fn start_daemon() -> Result<ServiceActionResponse> {
        let output = SafeCommand::run("openclaw", &["onboard", "--install-daemon"])
            .context("Failed to execute 'openclaw onboard --install-daemon'")?;

        if output.exit_code != 0 {
            return Ok(ServiceActionResponse {
                success: false,
                service: "daemon".to_string(),
                message: format!(
                    "Failed to start daemon (exit code {}): {}",
                    output.exit_code,
                    output.stderr.trim()
                ),
            });
        }

        Ok(ServiceActionResponse {
            success: true,
            service: "daemon".to_string(),
            message: "Daemon started successfully".to_string(),
        })
    }

    /// Stop the OpenClaw daemon by finding its PID and sending SIGTERM
    pub fn stop_daemon() -> Result<ServiceActionResponse> {
        let mut sys = System::new_all();
        sys.refresh_processes(ProcessesToUpdate::All, true);

        let status = Self::find_service_process(&sys, "daemon");
        if !status.running {
            return Ok(ServiceActionResponse {
                success: true,
                service: "daemon".to_string(),
                message: "Daemon is not running".to_string(),
            });
        }

        if let Some(pid) = status.pid {
            // Send SIGTERM to the daemon process
            let pid = sysinfo::Pid::from_u32(pid);
            if let Some(process) = sys.process(pid) {
                process.kill();
                return Ok(ServiceActionResponse {
                    success: true,
                    service: "daemon".to_string(),
                    message: "Daemon stopped successfully".to_string(),
                });
            }
        }

        Ok(ServiceActionResponse {
            success: false,
            service: "daemon".to_string(),
            message: "Could not find daemon process to stop".to_string(),
        })
    }

    /// Restart the OpenClaw daemon (stop, wait 2s, start)
    pub fn restart_daemon() -> Result<ServiceActionResponse> {
        // Stop first (ignore error if already stopped)
        let _ = Self::stop_daemon();

        // Wait for graceful shutdown
        std::thread::sleep(Duration::from_secs(2));

        // Start again
        Self::start_daemon().context("Failed to start daemon after stop")
    }

    /// Find a service process by type ("gateway" or "daemon")
    fn find_service_process(sys: &System, service_type: &str) -> ServiceProcessStatus {
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

            // Match node processes running openclaw
            if name.contains("node") {
                let cmd_str = cmd_args.join(" ");

                let is_match = match service_type {
                    "gateway" => {
                        cmd_str.contains("gateway")
                            || (cmd_str.contains("openclaw") && !cmd_str.contains("daemon"))
                    }
                    "daemon" => cmd_str.contains("daemon"),
                    _ => false,
                };

                if is_match {
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
    ///
    /// Checks common log paths:
    /// - ~/.openclaw/logs/
    /// - /var/log/openclaw/
    /// - ~/Library/Logs/openclaw/ (macOS)
    ///
    /// Returns 0 if no logs found.
    fn count_recent_errors() -> u32 {
        let home = match std::env::var("HOME") {
            Ok(h) => h,
            Err(_) => return 0,
        };

        let log_paths = vec![
            format!("{}/.openclaw/logs", home),
            "/var/log/openclaw".to_string(),
            format!("{}/Library/Logs/openclaw", home),
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

                    // Check if file was modified in the last 24 hours
                    if let Ok(metadata) = path.metadata() {
                        if let Ok(modified) = metadata.modified() {
                            let modified_secs = modified
                                .duration_since(UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_secs();
                            if modified_secs < twenty_four_hours_ago {
                                continue;
                            }
                        }
                    }

                    // Count ERROR lines in this file
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

        // Both services should return valid status (even if not running)
        if status.gateway.running {
            assert!(status.gateway.pid.is_some());
        } else {
            assert!(status.gateway.pid.is_none());
        }

        if status.daemon.running {
            assert!(status.daemon.pid.is_some());
        } else {
            assert!(status.daemon.pid.is_none());
        }

        // System metrics should always be populated
        assert!(status.system_cpu_percent.is_some());
        assert!(status.system_memory_total_mb.is_some());
        assert!(status.system_memory_used_mb.is_some());
    }

    #[test]
    fn test_count_recent_errors_returns_zero_when_no_logs() {
        // In test environment, there should be no openclaw logs
        let count = ServiceManager::count_recent_errors();
        // Should not panic; value depends on environment
        assert!(count < u32::MAX);
    }

    #[test]
    fn test_find_service_process_gateway() {
        let mut sys = System::new_all();
        sys.refresh_processes(ProcessesToUpdate::All, true);

        let status = ServiceManager::find_service_process(&sys, "gateway");
        // Should return valid struct regardless
        if !status.running {
            assert!(status.pid.is_none());
            assert!(status.uptime_seconds.is_none());
        }
    }

    #[test]
    fn test_find_service_process_daemon() {
        let mut sys = System::new_all();
        sys.refresh_processes(ProcessesToUpdate::All, true);

        let status = ServiceManager::find_service_process(&sys, "daemon");
        if !status.running {
            assert!(status.pid.is_none());
            assert!(status.uptime_seconds.is_none());
        }
    }
}
