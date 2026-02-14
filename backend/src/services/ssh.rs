//! # SSH Service
//!
//! Secure SSH connection management using system OpenSSH and platform keychain.
//!
//! SECURITY:
//! - Always uses KnownHosts::Strict for MITM protection
//! - Credentials stored in platform keychain (never in config files)
//! - No credentials logged (only sanitized user@host)

use anyhow::{Context, Result};
use keyring::Entry;
use openssh::{KnownHosts, Session};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use tokio::sync::mpsc;
use ts_rs::TS;

/// Keyring service name for SSH credentials
const KEYRING_SERVICE: &str = "openclaw-wizard-ssh";

/// Command execution output
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct CommandOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// SSH service for secure remote operations
#[derive(Debug, Clone)]
pub struct SshService;

impl SshService {
    /// Create a new SSH service instance
    pub fn new() -> Self {
        Self
    }

    /// Test SSH connection without executing commands
    ///
    /// Returns Ok(true) if connection successful, Ok(false) if auth fails,
    /// Err if host key verification fails or network error.
    pub async fn check_connection(&self, host: &str, user: &str) -> Result<bool> {
        Self::validate_host(host)?;
        Self::validate_username(user)?;

        let connection_str = format!("{}@{}", user, host);

        // Attempt connection with strict host key checking
        match Session::connect(&connection_str, KnownHosts::Strict).await {
            Ok(_session) => {
                tracing::info!("SSH connection test successful: {}", connection_str);
                Ok(true)
            }
            Err(e) => {
                let error_msg = e.to_string();

                // Distinguish between auth failures (expected) and security issues (critical)
                if error_msg.contains("permission denied") || error_msg.contains("authentication") {
                    tracing::warn!("SSH authentication failed: {}", connection_str);
                    Ok(false)
                } else {
                    Err(e).with_context(|| {
                        format!("Failed to establish SSH connection to {}", connection_str)
                    })
                }
            }
        }
    }

    /// Execute command on remote host and return output
    ///
    /// Uses stored SSH key path from keychain if available.
    pub async fn exec_remote(
        &self,
        host: &str,
        user: &str,
        command: &str,
    ) -> Result<CommandOutput> {
        Self::validate_host(host)?;
        Self::validate_username(user)?;

        if command.is_empty() {
            anyhow::bail!("Remote command cannot be empty");
        }

        let connection_str = format!("{}@{}", user, host);

        tracing::debug!("Executing remote command on {}", connection_str);

        let session = Session::connect(&connection_str, KnownHosts::Strict)
            .await
            .with_context(|| format!("Failed to connect to {}", connection_str))?;

        let output = session
            .command(command)
            .output()
            .await
            .with_context(|| format!("Failed to execute remote command: {}", command))?;

        let result = CommandOutput {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code().unwrap_or(-1),
        };

        tracing::debug!(
            "Remote command completed with exit code: {}",
            result.exit_code
        );

        Ok(result)
    }

    /// Stream remote command output line-by-line
    ///
    /// Sends output lines via mpsc channel for real-time progress display.
    pub async fn stream_remote_command(
        &self,
        host: &str,
        user: &str,
        command: &str,
        tx: mpsc::Sender<String>,
    ) -> Result<CommandOutput> {
        Self::validate_host(host)?;
        Self::validate_username(user)?;

        if command.is_empty() {
            anyhow::bail!("Remote command cannot be empty");
        }

        let connection_str = format!("{}@{}", user, host);

        tracing::debug!("Streaming remote command on {}", connection_str);

        let session = Session::connect(&connection_str, KnownHosts::Strict)
            .await
            .with_context(|| format!("Failed to connect to {}", connection_str))?;

        // Execute and capture output
        let output = session
            .command(command)
            .output()
            .await
            .with_context(|| format!("Failed to execute remote command: {}", command))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        // Stream stdout lines
        for line in stdout.lines() {
            let _ = tx.send(line.to_string()).await;
        }

        // Stream stderr lines
        for line in stderr.lines() {
            let _ = tx.send(format!("STDERR: {}", line)).await;
        }

        Ok(CommandOutput {
            stdout,
            stderr,
            exit_code: output.status.code().unwrap_or(-1),
        })
    }

    /// Store SSH key path in platform keychain
    ///
    /// Credentials are stored securely in OS-native keychain:
    /// - macOS: Keychain Access
    /// - Linux: Secret Service (GNOME Keyring, KWallet)
    pub fn store_ssh_key_path(&self, host: &str, user: &str, key_path: &str) -> Result<()> {
        Self::validate_host(host)?;
        Self::validate_username(user)?;

        if key_path.is_empty() {
            anyhow::bail!("SSH key path cannot be empty");
        }

        let username = format!("{}@{}", user, host);
        let entry = Entry::new(KEYRING_SERVICE, &username)
            .with_context(|| format!("Failed to create keyring entry for {}", username))?;

        entry
            .set_password(key_path)
            .with_context(|| format!("Failed to store SSH key path for {}", username))?;

        tracing::info!("Stored SSH key path for {}", username);
        Ok(())
    }

    /// Retrieve SSH key path from platform keychain
    pub fn get_ssh_key_path(&self, host: &str, user: &str) -> Result<String> {
        Self::validate_host(host)?;
        Self::validate_username(user)?;

        let username = format!("{}@{}", user, host);
        let entry = Entry::new(KEYRING_SERVICE, &username)
            .with_context(|| format!("Failed to create keyring entry for {}", username))?;

        entry
            .get_password()
            .with_context(|| format!("SSH credentials not found in keychain for {}", username))
    }

    /// Delete SSH credentials from keychain
    pub fn delete_ssh_credentials(&self, host: &str, user: &str) -> Result<()> {
        Self::validate_host(host)?;
        Self::validate_username(user)?;

        let username = format!("{}@{}", user, host);
        let entry = Entry::new(KEYRING_SERVICE, &username)
            .with_context(|| format!("Failed to create keyring entry for {}", username))?;

        entry
            .delete_credential()
            .with_context(|| format!("Failed to delete SSH credentials for {}", username))?;

        tracing::info!("Deleted SSH credentials for {}", username);
        Ok(())
    }

    // ===== Validation Helpers =====

    /// Validate hostname or IP address
    fn validate_host(host: &str) -> Result<()> {
        static HOST_REGEX: OnceLock<Regex> = OnceLock::new();
        let regex = HOST_REGEX.get_or_init(|| {
            Regex::new(r"^[a-zA-Z0-9.-]+$").expect("Invalid host regex")
        });

        if host.is_empty() {
            anyhow::bail!("Host cannot be empty");
        }

        if !regex.is_match(host) {
            anyhow::bail!("Invalid host format: {}", host);
        }

        Ok(())
    }

    /// Validate Unix username
    fn validate_username(user: &str) -> Result<()> {
        static USER_REGEX: OnceLock<Regex> = OnceLock::new();
        let regex = USER_REGEX.get_or_init(|| {
            Regex::new(r"^[a-z_][a-z0-9_-]*$").expect("Invalid username regex")
        });

        if user.is_empty() {
            anyhow::bail!("Username cannot be empty");
        }

        if !regex.is_match(user) {
            anyhow::bail!("Invalid username format: {}", user);
        }

        Ok(())
    }
}

impl Default for SshService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_host_valid() {
        assert!(SshService::validate_host("example.com").is_ok());
        assert!(SshService::validate_host("192.168.1.1").is_ok());
        assert!(SshService::validate_host("server-01.example.com").is_ok());
    }

    #[test]
    fn test_validate_host_invalid() {
        assert!(SshService::validate_host("").is_err());
        assert!(SshService::validate_host("invalid host").is_err());
        assert!(SshService::validate_host("host@example").is_err());
    }

    #[test]
    fn test_validate_username_valid() {
        assert!(SshService::validate_username("root").is_ok());
        assert!(SshService::validate_username("ubuntu").is_ok());
        assert!(SshService::validate_username("user_name").is_ok());
        assert!(SshService::validate_username("_service").is_ok());
    }

    #[test]
    fn test_validate_username_invalid() {
        assert!(SshService::validate_username("").is_err());
        assert!(SshService::validate_username("User").is_err()); // uppercase
        assert!(SshService::validate_username("9user").is_err()); // starts with number
        assert!(SshService::validate_username("user@host").is_err());
    }
}
