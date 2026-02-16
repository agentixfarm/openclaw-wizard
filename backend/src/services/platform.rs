//! # Cross-Platform Utilities
//!
//! Provides OS detection, architecture detection, WSL2 detection,
//! and cross-platform path resolution.

use anyhow::{Context, Result};
use std::env;
use std::fs;
use std::path::PathBuf;

use crate::models::{RequirementCheck, SystemInfo, SystemRequirements};
use crate::services::command::SafeCommand;

/// Platform detection and path utilities
pub struct Platform;

impl Platform {
    /// Returns the operating system name
    ///
    /// Values: "macos", "linux", "windows"
    pub fn os() -> &'static str {
        env::consts::OS
    }

    /// Returns the system architecture
    ///
    /// Values: "x86_64", "aarch64", etc.
    pub fn arch() -> &'static str {
        env::consts::ARCH
    }

    /// Detects if running in WSL2 (Windows Subsystem for Linux)
    ///
    /// Checks /proc/version for "microsoft" string on Linux systems.
    /// Always returns false on non-Linux systems.
    #[cfg(target_os = "linux")]
    #[allow(dead_code)]
    pub fn is_wsl() -> bool {
        if let Ok(version) = fs::read_to_string("/proc/version") {
            version.to_lowercase().contains("microsoft")
        } else {
            false
        }
    }

    #[cfg(not(target_os = "linux"))]
    #[allow(dead_code)]
    pub fn is_wsl() -> bool {
        false
    }

    /// Returns the user's home directory
    ///
    /// Tries HOME env var (Unix), then USERPROFILE (Windows).
    pub fn home_dir() -> Result<PathBuf> {
        env::var("HOME")
            .or_else(|_| env::var("USERPROFILE"))
            .context("Failed to determine home directory (HOME or USERPROFILE not set)")
            .map(PathBuf::from)
    }

    /// Returns the application config directory
    ///
    /// Platform-specific locations:
    /// - macOS: ~/Library/Application Support/openclaw-wizard
    /// - Linux: $XDG_CONFIG_HOME/openclaw-wizard or ~/.config/openclaw-wizard
    /// - Windows: %APPDATA%/openclaw-wizard
    ///
    /// Creates the directory if it doesn't exist.
    pub fn config_dir() -> Result<PathBuf> {
        let path = if cfg!(target_os = "macos") {
            Self::home_dir()?
                .join("Library")
                .join("Application Support")
                .join("openclaw-wizard")
        } else if cfg!(target_os = "linux") {
            if let Ok(xdg_config) = env::var("XDG_CONFIG_HOME") {
                PathBuf::from(xdg_config).join("openclaw-wizard")
            } else {
                Self::home_dir()?.join(".config").join("openclaw-wizard")
            }
        } else if cfg!(target_os = "windows") {
            if let Ok(appdata) = env::var("APPDATA") {
                PathBuf::from(appdata).join("openclaw-wizard")
            } else {
                Self::home_dir()?
                    .join("AppData")
                    .join("Roaming")
                    .join("openclaw-wizard")
            }
        } else {
            // Fallback for unknown platforms
            Self::home_dir()?.join(".openclaw-wizard")
        };

        fs::create_dir_all(&path)
            .with_context(|| format!("Failed to create config directory: {}", path.display()))?;

        Ok(path)
    }

    /// Returns the application data directory
    ///
    /// Platform-specific locations:
    /// - macOS: ~/Library/Application Support/openclaw-wizard/data
    /// - Linux: $XDG_DATA_HOME/openclaw-wizard or ~/.local/share/openclaw-wizard
    /// - Windows: %LOCALAPPDATA%/openclaw-wizard
    ///
    /// Creates the directory if it doesn't exist.
    #[allow(dead_code)]
    pub fn data_dir() -> Result<PathBuf> {
        let path = if cfg!(target_os = "macos") {
            Self::config_dir()?.join("data")
        } else if cfg!(target_os = "linux") {
            if let Ok(xdg_data) = env::var("XDG_DATA_HOME") {
                PathBuf::from(xdg_data).join("openclaw-wizard")
            } else {
                Self::home_dir()?
                    .join(".local")
                    .join("share")
                    .join("openclaw-wizard")
            }
        } else if cfg!(target_os = "windows") {
            if let Ok(local_appdata) = env::var("LOCALAPPDATA") {
                PathBuf::from(local_appdata).join("openclaw-wizard")
            } else {
                Self::home_dir()?
                    .join("AppData")
                    .join("Local")
                    .join("openclaw-wizard")
            }
        } else {
            // Fallback for unknown platforms
            Self::home_dir()?.join(".openclaw-wizard").join("data")
        };

        fs::create_dir_all(&path)
            .with_context(|| format!("Failed to create data directory: {}", path.display()))?;

        Ok(path)
    }

    /// Returns comprehensive system information
    ///
    /// Combines OS, arch, Node.js version detection, and OpenClaw detection.
    pub fn system_info() -> SystemInfo {
        SystemInfo {
            os: Self::os().to_string(),
            arch: Self::arch().to_string(),
            node_version: SafeCommand::check_node_version().ok().flatten(),
            openclaw_installed: false, // TODO: Implement OpenClaw binary detection
        }
    }

    /// Returns detailed system requirements check results
    ///
    /// Checks OS, Node.js version, npm, and disk space.
    pub fn system_requirements() -> SystemRequirements {
        let mut checks = Vec::new();

        // OS check: always passes, reports actual OS
        checks.push(RequirementCheck {
            name: "Operating System".to_string(),
            required: "macOS, Linux, or Windows".to_string(),
            actual: format!("{} ({})", Self::os(), Self::arch()),
            passed: true,
            help_text: None,
        });

        // Node.js check: passes if version >= 22.0.0
        let node_version_opt = SafeCommand::check_node_version().ok().flatten();
        let node_installed = node_version_opt.is_some();
        let node_passed = if let Some(ref version) = node_version_opt {
            // Parse version string (e.g., "v22.1.0" -> 22.1.0)
            let version_clean = version.trim_start_matches('v');
            if let Some((major_str, _)) = version_clean.split_once('.') {
                major_str
                    .parse::<u32>()
                    .ok()
                    .is_some_and(|major| major >= 22)
            } else {
                false
            }
        } else {
            false
        };

        checks.push(RequirementCheck {
            name: "Node.js".to_string(),
            required: "v22.0.0 or higher".to_string(),
            actual: node_version_opt
                .clone()
                .unwrap_or_else(|| "Not installed".to_string()),
            passed: node_passed,
            help_text: if !node_passed {
                Some("Install Node.js from https://nodejs.org/".to_string())
            } else {
                None
            },
        });

        // npm check: passes if present
        let npm_version_opt = SafeCommand::check_npm_version().ok().flatten();
        let npm_passed = npm_version_opt.is_some();

        checks.push(RequirementCheck {
            name: "npm".to_string(),
            required: "Any version".to_string(),
            actual: npm_version_opt
                .clone()
                .unwrap_or_else(|| "Not installed".to_string()),
            passed: npm_passed,
            help_text: if !npm_passed {
                Some("npm is bundled with Node.js".to_string())
            } else {
                None
            },
        });

        // Disk space check: passes if >= 500MB available
        let _disk_passed = if let Ok(home) = Self::home_dir() {
            let mut disks = sysinfo::Disks::new_with_refreshed_list();
            if let Some(disk) = disks.iter_mut().find(|d| home.starts_with(d.mount_point())) {
                let available_bytes = disk.available_space();
                let required_bytes = 500_000_000u64; // 500MB
                let passed = available_bytes >= required_bytes;

                let available_gb = available_bytes as f64 / 1_000_000_000.0;
                checks.push(RequirementCheck {
                    name: "Disk Space".to_string(),
                    required: "500 MB available".to_string(),
                    actual: format!("{:.1} GB available", available_gb),
                    passed,
                    help_text: if !passed {
                        Some("Free up disk space before continuing".to_string())
                    } else {
                        None
                    },
                });

                passed
            } else {
                // Couldn't find disk, assume it's okay
                checks.push(RequirementCheck {
                    name: "Disk Space".to_string(),
                    required: "500 MB available".to_string(),
                    actual: "Unable to check".to_string(),
                    passed: true,
                    help_text: None,
                });
                true
            }
        } else {
            // Couldn't determine home directory, assume it's okay
            checks.push(RequirementCheck {
                name: "Disk Space".to_string(),
                required: "500 MB available".to_string(),
                actual: "Unable to check".to_string(),
                passed: true,
                help_text: None,
            });
            true
        };

        let all_passed = checks.iter().all(|check| check.passed);

        SystemRequirements {
            checks,
            all_passed,
            node_installed,
            node_version: node_version_opt,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_os_not_empty() {
        let os = Platform::os();
        assert!(!os.is_empty());
        println!("Detected OS: {}", os);
    }

    #[test]
    fn test_arch_not_empty() {
        let arch = Platform::arch();
        assert!(!arch.is_empty());
        println!("Detected arch: {}", arch);
    }

    #[test]
    fn test_home_dir_exists() {
        let home = Platform::home_dir().unwrap();
        assert!(home.exists());
        println!("Home directory: {}", home.display());
    }

    #[test]
    fn test_config_dir_creates() {
        let config_dir = Platform::config_dir().unwrap();
        assert!(config_dir.exists());
        println!("Config directory: {}", config_dir.display());
    }

    #[test]
    fn test_system_info_populated() {
        let info = Platform::system_info();
        assert!(!info.os.is_empty());
        assert!(!info.arch.is_empty());
        println!("System info: {:?}", info);
    }
}
