//! # Cross-Platform Utilities
//!
//! Provides OS detection, architecture detection, WSL2 detection,
//! and cross-platform path resolution.

use anyhow::{Context, Result};
use std::env;
use std::fs;
use std::path::PathBuf;

use crate::models::SystemInfo;
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
    pub fn is_wsl() -> bool {
        if let Ok(version) = fs::read_to_string("/proc/version") {
            version.to_lowercase().contains("microsoft")
        } else {
            false
        }
    }

    #[cfg(not(target_os = "linux"))]
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
                Self::home_dir()?.join("AppData").join("Roaming").join("openclaw-wizard")
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
    pub fn data_dir() -> Result<PathBuf> {
        let path = if cfg!(target_os = "macos") {
            Self::config_dir()?.join("data")
        } else if cfg!(target_os = "linux") {
            if let Ok(xdg_data) = env::var("XDG_DATA_HOME") {
                PathBuf::from(xdg_data).join("openclaw-wizard")
            } else {
                Self::home_dir()?.join(".local").join("share").join("openclaw-wizard")
            }
        } else if cfg!(target_os = "windows") {
            if let Ok(local_appdata) = env::var("LOCALAPPDATA") {
                PathBuf::from(local_appdata).join("openclaw-wizard")
            } else {
                Self::home_dir()?.join("AppData").join("Local").join("openclaw-wizard")
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
