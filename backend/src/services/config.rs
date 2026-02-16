//! # Atomic Config Writer
//!
//! SAFETY: All writes use temp file + sync + atomic rename.
//! If the process crashes during write, the original file is unchanged.
//! The config file always contains valid, complete data.

use anyhow::{Context, Result};
use serde::{Serialize, de::DeserializeOwned};
use std::fs;
use std::io::Write;
use std::path::Path;

/// Atomic configuration file writer
pub struct ConfigWriter;

impl ConfigWriter {
    /// Write data as JSON to a file atomically
    ///
    /// Creates parent directories if needed.
    /// Uses temp file + sync + atomic rename to prevent corruption.
    pub fn write_json<T: Serialize>(path: &Path, data: &T) -> Result<()> {
        let json =
            serde_json::to_string_pretty(data).context("Failed to serialize data to JSON")?;

        Self::write_text(path, &json)
    }

    /// Read JSON data from a file
    pub fn read_json<T: DeserializeOwned>(path: &Path) -> Result<T> {
        let content = fs::read_to_string(path)
            .with_context(|| format!("Failed to read file: {}", path.display()))?;

        serde_json::from_str(&content)
            .with_context(|| format!("Failed to parse JSON from: {}", path.display()))
    }

    /// Write text content to a file atomically
    ///
    /// Creates parent directories if needed.
    /// Uses temp file + sync + atomic rename to prevent corruption.
    pub fn write_text(path: &Path, content: &str) -> Result<()> {
        // Create parent directories if they don't exist
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).with_context(|| {
                format!("Failed to create parent directory: {}", parent.display())
            })?;
        }

        // Write to temporary file
        let temp_path = path.with_extension("tmp");
        let mut file = fs::File::create(&temp_path)
            .with_context(|| format!("Failed to create temp file: {}", temp_path.display()))?;

        file.write_all(content.as_bytes())
            .with_context(|| format!("Failed to write to temp file: {}", temp_path.display()))?;

        // Ensure data is written to disk
        file.sync_all()
            .with_context(|| format!("Failed to sync temp file: {}", temp_path.display()))?;

        // Drop the file handle before rename
        drop(file);

        // Atomic rename
        fs::rename(&temp_path, path)
            .with_context(|| format!("Failed to rename temp file to: {}", path.display()))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use tempfile::TempDir;

    #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
    struct TestConfig {
        name: String,
        value: i32,
    }

    #[test]
    fn test_write_read_json() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("config.json");

        let original = TestConfig {
            name: "test".to_string(),
            value: 42,
        };

        // Write and read back
        ConfigWriter::write_json(&config_path, &original).unwrap();
        let loaded: TestConfig = ConfigWriter::read_json(&config_path).unwrap();

        assert_eq!(original, loaded);
    }

    #[test]
    fn test_atomic_write_creates_no_temp_on_success() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("config.json");

        let data = TestConfig {
            name: "test".to_string(),
            value: 42,
        };

        ConfigWriter::write_json(&config_path, &data).unwrap();

        // Temp file should not exist after successful write
        let temp_path = config_path.with_extension("tmp");
        assert!(
            !temp_path.exists(),
            "Temp file should be removed after successful write"
        );
    }

    #[test]
    fn test_write_creates_parent_dirs() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir
            .path()
            .join("nested")
            .join("path")
            .join("config.json");

        let data = TestConfig {
            name: "test".to_string(),
            value: 42,
        };

        // Should create nested/path/ directories
        ConfigWriter::write_json(&config_path, &data).unwrap();

        assert!(config_path.exists());
        let loaded: TestConfig = ConfigWriter::read_json(&config_path).unwrap();
        assert_eq!(data, loaded);
    }

    #[test]
    fn test_read_nonexistent() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("nonexistent.json");

        let result: Result<TestConfig> = ConfigWriter::read_json(&config_path);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("Failed to read file")
        );
    }

    #[test]
    fn test_write_text() {
        let temp_dir = TempDir::new().unwrap();
        let text_path = temp_dir.path().join("test.txt");

        let content = "Hello, world!\nThis is a test.";
        ConfigWriter::write_text(&text_path, content).unwrap();

        let loaded = fs::read_to_string(&text_path).unwrap();
        assert_eq!(content, loaded);
    }
}
