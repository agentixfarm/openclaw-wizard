//! # OpenClaw Detection Service
//!
//! Detects existing OpenClaw installations and configurations.

use anyhow::Result;
use std::path::PathBuf;

use crate::models::OpenClawDetection;
use crate::services::{command::SafeCommand, config::ConfigWriter, platform::Platform};

/// OpenClaw detection utilities
pub struct DetectionService;

impl DetectionService {
    /// Detect OpenClaw installation and configuration
    ///
    /// Checks for openclaw binary on PATH, version, and existing config files.
    pub fn detect_openclaw() -> OpenClawDetection {
        // Check if openclaw binary exists on PATH
        let which_cmd = if cfg!(target_os = "windows") {
            "where"
        } else {
            "which"
        };

        let (installed, version, install_path) = match SafeCommand::run(which_cmd, &["openclaw"]) {
            Ok(output) if output.exit_code == 0 => {
                let path = output.stdout.trim().to_string();
                let install_path = if !path.is_empty() {
                    Some(path)
                } else {
                    None
                };

                // Get version
                let version = match SafeCommand::run("openclaw", &["--version"]) {
                    Ok(ver_output) if ver_output.exit_code == 0 => {
                        Some(ver_output.stdout.trim().to_string())
                    }
                    _ => None,
                };

                (true, version, install_path)
            }
            _ => (false, None, None),
        };

        // Check common config locations
        let config_locations = vec![
            Platform::home_dir().ok().map(|h| h.join(".openclaw").join("openclaw.json")),
            Some(PathBuf::from("./openclaw.json")),
        ];

        let (config_found, config_path, existing_config) = config_locations
            .into_iter()
            .flatten()
            .find_map(|path| {
                if path.exists() {
                    let config_value = ConfigWriter::read_json::<serde_json::Value>(&path).ok();
                    Some((true, Some(path.display().to_string()), config_value))
                } else {
                    None
                }
            })
            .unwrap_or((false, None, None));

        OpenClawDetection {
            installed,
            version,
            install_path,
            config_found,
            config_path,
            existing_config,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_openclaw_runs() {
        // Just verify the method runs without panicking
        let result = DetectionService::detect_openclaw();
        // Result will vary by system, so we just check it returns
        println!("OpenClaw detection: {:?}", result);
    }
}
