//! # Safe Command Execution
//!
//! SECURITY: All commands MUST use argument-based execution.
//! NEVER use Command::new("sh").arg("-c").arg(format!(...))
//! This prevents shell injection attacks.

use anyhow::{Context, Result};
use std::process::Command;

/// Output from a command execution
#[derive(Debug, Clone)]
pub struct CommandOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// Safe command executor that prevents shell injection
pub struct SafeCommand;

impl SafeCommand {
    /// Execute a command with arguments
    ///
    /// Returns CommandOutput even on non-zero exit codes (caller decides if that's an error).
    /// Returns Err only if the process fails to start.
    pub fn run(program: &str, args: &[&str]) -> Result<CommandOutput> {
        if program.is_empty() {
            anyhow::bail!("Program name cannot be empty");
        }

        let output = Command::new(program)
            .args(args)
            .output()
            .with_context(|| format!("Failed to execute command: {}", program))?;

        Ok(CommandOutput {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code().unwrap_or(-1),
        })
    }

    /// Execute a command and expect success (exit code 0)
    ///
    /// Returns Err if exit code is non-zero, including stderr in error message.
    pub fn run_expect_success(program: &str, args: &[&str]) -> Result<String> {
        let output = Self::run(program, args)?;

        if output.exit_code != 0 {
            anyhow::bail!(
                "Command '{}' failed with exit code {}: {}",
                program,
                output.exit_code,
                output.stderr.trim()
            );
        }

        Ok(output.stdout)
    }

    /// Check if Node.js is installed and return version
    ///
    /// Returns Ok(Some(version)) if found, Ok(None) if not found.
    /// Does NOT return Err for "node not found" - that's expected during setup.
    pub fn check_node_version() -> Result<Option<String>> {
        match Self::run("node", &["--version"]) {
            Ok(output) => {
                if output.exit_code == 0 {
                    Ok(Some(output.stdout.trim().to_string()))
                } else {
                    Ok(None)
                }
            }
            Err(_) => Ok(None), // Command not found is expected
        }
    }

    /// Check if npm is installed and return version
    ///
    /// Returns Ok(Some(version)) if found, Ok(None) if not found.
    /// Does NOT return Err for "npm not found" - that's expected during setup.
    pub fn check_npm_version() -> Result<Option<String>> {
        match Self::run("npm", &["--version"]) {
            Ok(output) => {
                if output.exit_code == 0 {
                    Ok(Some(output.stdout.trim().to_string()))
                } else {
                    Ok(None)
                }
            }
            Err(_) => Ok(None), // Command not found is expected
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_run_echo() {
        let result = SafeCommand::run("echo", &["hello"]);
        assert!(result.is_ok());
        let output = result.unwrap();
        assert!(output.stdout.contains("hello"));
        assert_eq!(output.exit_code, 0);
    }

    #[test]
    fn test_run_empty_program() {
        let result = SafeCommand::run("", &[]);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("empty"));
    }

    #[test]
    fn test_run_nonexistent_program() {
        let result = SafeCommand::run("nonexistent_program_xyz", &[]);
        assert!(result.is_err());
    }

    #[test]
    fn test_run_expect_success_on_failure() {
        let result = SafeCommand::run_expect_success("false", &[]);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.to_string().contains("failed") || err.to_string().contains("exit code"));
    }

    #[test]
    fn test_check_node_version() {
        let result = SafeCommand::check_node_version();
        assert!(result.is_ok());
        // Result is either Some(version) or None depending on system
        // Both are valid outcomes - we're testing the method doesn't error
    }
}
