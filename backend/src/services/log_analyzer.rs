//! # Log Analyzer - AI-Powered Error Analysis
//!
//! Uses the user's configured AI provider (Anthropic or OpenAI) to analyze
//! log errors and suggest fixes. Enforces rate limiting and redacts secrets
//! before sending log context to external APIs.

use crate::error::AppError;
use crate::models::types::LogAnalysis;
use crate::services::config::ConfigWriter;
use anyhow::Result;
use regex::Regex;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

/// Rate limit: minimum 10 seconds between analysis requests
const RATE_LIMIT_SECONDS: u64 = 10;

/// Maximum log lines to send to AI provider
const MAX_LOG_LINES: usize = 50;

/// Global rate limiter: tracks last request timestamp
static LAST_ANALYSIS: AtomicU64 = AtomicU64::new(0);

pub struct LogAnalyzer {
    provider: String,
    api_key: String,
    http_client: reqwest::Client,
}

impl LogAnalyzer {
    /// Create a LogAnalyzer from the user's saved openclaw.json config
    ///
    /// Tries multiple field path patterns for provider and API key:
    /// 1. ai.provider / ai.apiKey
    /// 2. provider / api_key
    /// 3. provider / apiKey (root level)
    pub fn from_config() -> Option<Self> {
        let home = std::env::var("HOME").ok()?;
        let config_path = PathBuf::from(format!("{}/.openclaw/openclaw.json", home));

        let config: serde_json::Value = ConfigWriter::read_json(&config_path).ok()?;

        // Try different field path patterns
        let (provider, api_key) = Self::extract_ai_config(&config)?;

        if provider.is_empty() || api_key.is_empty() {
            return None;
        }

        Some(Self {
            provider,
            api_key,
            http_client: reqwest::Client::new(),
        })
    }

    /// Analyze error logs using the configured AI provider
    pub async fn analyze_error(
        &self,
        log_context: &str,
        service: &str,
    ) -> std::result::Result<LogAnalysis, AppError> {
        // Check rate limit
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let last = LAST_ANALYSIS.load(Ordering::Relaxed);

        if now.saturating_sub(last) < RATE_LIMIT_SECONDS {
            return Err(AppError::AnalysisRateLimited(format!(
                "Please wait {} seconds between analysis requests",
                RATE_LIMIT_SECONDS - (now - last)
            )));
        }

        // Update last request timestamp
        LAST_ANALYSIS.store(now, Ordering::Relaxed);

        // Redact secrets and truncate
        let redacted = Self::redact_secrets(log_context);
        let truncated: String = redacted
            .lines()
            .take(MAX_LOG_LINES)
            .collect::<Vec<_>>()
            .join("\n");

        let prompt = format!(
            "You are a system administrator helping debug OpenClaw, an AI assistant platform.\n\
             Analyze this {} service log output and provide:\n\
             1. A brief error summary\n\
             2. The likely cause\n\
             3. Step-by-step fix instructions\n\n\
             Log output:\n```\n{}\n```\n\n\
             Respond ONLY with valid JSON (no markdown):\n\
             {{\"error_summary\": \"...\", \"cause\": \"...\", \"fix_steps\": [\"step1\", \"step2\"], \"confidence\": \"high|medium|low\"}}",
            service, truncated
        );

        let result = match self.provider.to_lowercase().as_str() {
            "anthropic" => self.call_anthropic(&prompt).await,
            "openai" => self.call_openai(&prompt).await,
            _ => Err(anyhow::anyhow!(
                "Unsupported AI provider: {}",
                self.provider
            )),
        };

        result.map_err(|e| AppError::InternalError(format!("AI analysis failed: {}", e)))
    }

    /// Redact sensitive information from log text
    ///
    /// Replaces API keys, tokens, and other secrets with [REDACTED].
    pub fn redact_secrets(text: &str) -> String {
        let mut result = text.to_string();

        // Anthropic API keys: sk-ant-...
        let sk_ant = Regex::new(r"sk-ant-[a-zA-Z0-9_-]+").unwrap();
        result = sk_ant.replace_all(&result, "[REDACTED]").to_string();

        // OpenAI-style API keys: sk-...
        let sk = Regex::new(r"sk-[a-zA-Z0-9_-]{20,}").unwrap();
        result = sk.replace_all(&result, "[REDACTED]").to_string();

        // Slack bot tokens: xoxb-...
        let xoxb = Regex::new(r"xoxb-[a-zA-Z0-9-]+").unwrap();
        result = xoxb.replace_all(&result, "[REDACTED]").to_string();

        // Slack user tokens: xoxp-...
        let xoxp = Regex::new(r"xoxp-[a-zA-Z0-9-]+").unwrap();
        result = xoxp.replace_all(&result, "[REDACTED]").to_string();

        // bot_token assignments
        let bot_token = Regex::new(r#"bot_token["']?\s*[:=]\s*["']?[a-zA-Z0-9:_-]+"#).unwrap();
        result = bot_token
            .replace_all(&result, "bot_token=[REDACTED]")
            .to_string();

        // JSON apiKey fields
        let api_key_json = Regex::new(r#""apiKey"\s*:\s*"[^"]+""#).unwrap();
        result = api_key_json
            .replace_all(&result, "\"apiKey\":\"[REDACTED]\"")
            .to_string();

        // JSON api_key fields
        let api_key_snake = Regex::new(r#""api_key"\s*:\s*"[^"]+""#).unwrap();
        result = api_key_snake
            .replace_all(&result, "\"api_key\":\"[REDACTED]\"")
            .to_string();

        result
    }

    /// Call Anthropic Messages API for log analysis
    async fn call_anthropic(&self, prompt: &str) -> Result<LogAnalysis> {
        let body = serde_json::json!({
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 1024,
            "messages": [{
                "role": "user",
                "content": prompt
            }]
        });

        let response = self
            .http_client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await?;

        let response_body: serde_json::Value = response.json().await?;

        // Extract text from content array
        let text = response_body["content"][0]["text"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("No text in Anthropic response"))?;

        Self::parse_analysis_response(text)
    }

    /// Call OpenAI Chat Completions API for log analysis
    async fn call_openai(&self, prompt: &str) -> Result<LogAnalysis> {
        let body = serde_json::json!({
            "model": "gpt-4o-mini",
            "max_tokens": 1024,
            "messages": [{
                "role": "user",
                "content": prompt
            }]
        });

        let response = self
            .http_client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await?;

        let response_body: serde_json::Value = response.json().await?;

        let text = response_body["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("No text in OpenAI response"))?;

        Self::parse_analysis_response(text)
    }

    /// Parse AI response text into LogAnalysis struct
    fn parse_analysis_response(text: &str) -> Result<LogAnalysis> {
        // Try to extract JSON from the response (may be wrapped in markdown code blocks)
        let json_str = if let Some(start) = text.find('{') {
            if let Some(end) = text.rfind('}') {
                &text[start..=end]
            } else {
                text
            }
        } else {
            text
        };

        match serde_json::from_str::<LogAnalysis>(json_str) {
            Ok(analysis) => Ok(analysis),
            Err(_) => {
                // Fallback: create a basic analysis from the raw text
                Ok(LogAnalysis {
                    error_summary: text.chars().take(200).collect(),
                    cause: "Unable to parse structured analysis".to_string(),
                    fix_steps: vec!["Review the log output manually".to_string()],
                    confidence: "low".to_string(),
                })
            }
        }
    }

    /// Extract AI provider and API key from config, trying multiple field patterns
    fn extract_ai_config(config: &serde_json::Value) -> Option<(String, String)> {
        // Pattern 1: ai.provider / ai.apiKey
        if let (Some(provider), Some(key)) = (
            config
                .get("ai")
                .and_then(|ai| ai.get("provider"))
                .and_then(|v| v.as_str()),
            config
                .get("ai")
                .and_then(|ai| ai.get("apiKey"))
                .and_then(|v| v.as_str()),
        ) {
            return Some((provider.to_string(), key.to_string()));
        }

        // Pattern 2: ai.provider / ai.api_key
        if let (Some(provider), Some(key)) = (
            config
                .get("ai")
                .and_then(|ai| ai.get("provider"))
                .and_then(|v| v.as_str()),
            config
                .get("ai")
                .and_then(|ai| ai.get("api_key"))
                .and_then(|v| v.as_str()),
        ) {
            return Some((provider.to_string(), key.to_string()));
        }

        // Pattern 3: root-level provider / apiKey
        if let (Some(provider), Some(key)) = (
            config.get("provider").and_then(|v| v.as_str()),
            config.get("apiKey").and_then(|v| v.as_str()),
        ) {
            return Some((provider.to_string(), key.to_string()));
        }

        // Pattern 4: root-level provider / api_key
        if let (Some(provider), Some(key)) = (
            config.get("provider").and_then(|v| v.as_str()),
            config.get("api_key").and_then(|v| v.as_str()),
        ) {
            return Some((provider.to_string(), key.to_string()));
        }

        None
    }

    /// Reset rate limiter (for testing)
    #[cfg(test)]
    pub fn reset_rate_limit() {
        LAST_ANALYSIS.store(0, Ordering::Relaxed);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_redact_anthropic_keys() {
        let text = "Using key sk-ant-api03-abc123xyz for authentication";
        let redacted = LogAnalyzer::redact_secrets(text);
        assert!(redacted.contains("[REDACTED]"));
        assert!(!redacted.contains("sk-ant-api03"));
    }

    #[test]
    fn test_redact_openai_keys() {
        let text = "API key: sk-proj-1234567890abcdefghijklmn";
        let redacted = LogAnalyzer::redact_secrets(text);
        assert!(redacted.contains("[REDACTED]"));
        assert!(!redacted.contains("sk-proj-1234567890"));
    }

    #[test]
    fn test_redact_slack_tokens() {
        let text = "Slack token xoxb-123456-789012-abcdef connected";
        let redacted = LogAnalyzer::redact_secrets(text);
        assert!(redacted.contains("[REDACTED]"));
        assert!(!redacted.contains("xoxb-"));
    }

    #[test]
    fn test_redact_slack_user_tokens() {
        let text = "User token xoxp-123456-789012-abcdef";
        let redacted = LogAnalyzer::redact_secrets(text);
        assert!(redacted.contains("[REDACTED]"));
        assert!(!redacted.contains("xoxp-"));
    }

    #[test]
    fn test_redact_bot_token_assignment() {
        let text = r#"bot_token = "123456:ABC-DEF""#;
        let redacted = LogAnalyzer::redact_secrets(text);
        assert!(redacted.contains("[REDACTED]"));
    }

    #[test]
    fn test_redact_json_api_key() {
        let text = r#"{"apiKey": "sk-secret-value-here", "provider": "anthropic"}"#;
        let redacted = LogAnalyzer::redact_secrets(text);
        assert!(redacted.contains("\"apiKey\":\"[REDACTED]\""));
        assert!(!redacted.contains("sk-secret-value-here"));
    }

    #[test]
    fn test_redact_preserves_normal_text() {
        let text = "2026-02-16 [ERROR] Connection refused to localhost:3000";
        let redacted = LogAnalyzer::redact_secrets(text);
        assert_eq!(text, redacted);
    }

    #[test]
    fn test_rate_limit_enforcement() {
        LogAnalyzer::reset_rate_limit();

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Set last analysis to now
        LAST_ANALYSIS.store(now, Ordering::Relaxed);

        // Check that rate limit would trigger
        let last = LAST_ANALYSIS.load(Ordering::Relaxed);
        let elapsed = now.saturating_sub(last);
        assert!(elapsed < RATE_LIMIT_SECONDS);
    }

    #[test]
    fn test_rate_limit_allows_after_window() {
        LogAnalyzer::reset_rate_limit();

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Set last analysis to 11 seconds ago
        LAST_ANALYSIS.store(now - 11, Ordering::Relaxed);

        let last = LAST_ANALYSIS.load(Ordering::Relaxed);
        let elapsed = now.saturating_sub(last);
        assert!(elapsed >= RATE_LIMIT_SECONDS);
    }

    #[test]
    fn test_parse_analysis_response_valid_json() {
        let json = r#"{"error_summary": "Connection refused", "cause": "Gateway not running", "fix_steps": ["Start gateway"], "confidence": "high"}"#;
        let result = LogAnalyzer::parse_analysis_response(json);
        assert!(result.is_ok());
        let analysis = result.unwrap();
        assert_eq!(analysis.error_summary, "Connection refused");
        assert_eq!(analysis.confidence, "high");
    }

    #[test]
    fn test_parse_analysis_response_with_markdown_wrapper() {
        let text = "```json\n{\"error_summary\": \"Test\", \"cause\": \"Test cause\", \"fix_steps\": [\"Fix it\"], \"confidence\": \"medium\"}\n```";
        let result = LogAnalyzer::parse_analysis_response(text);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().error_summary, "Test");
    }

    #[test]
    fn test_parse_analysis_response_invalid_fallback() {
        let text = "This is not JSON at all";
        let result = LogAnalyzer::parse_analysis_response(text);
        assert!(result.is_ok());
        let analysis = result.unwrap();
        assert_eq!(analysis.confidence, "low");
    }

    #[test]
    fn test_extract_ai_config_pattern_1() {
        let config = serde_json::json!({
            "ai": {
                "provider": "anthropic",
                "apiKey": "sk-test-key"
            }
        });
        let result = LogAnalyzer::extract_ai_config(&config);
        assert!(result.is_some());
        let (provider, key) = result.unwrap();
        assert_eq!(provider, "anthropic");
        assert_eq!(key, "sk-test-key");
    }

    #[test]
    fn test_extract_ai_config_pattern_3() {
        let config = serde_json::json!({
            "provider": "openai",
            "apiKey": "sk-openai-key"
        });
        let result = LogAnalyzer::extract_ai_config(&config);
        assert!(result.is_some());
        let (provider, key) = result.unwrap();
        assert_eq!(provider, "openai");
        assert_eq!(key, "sk-openai-key");
    }

    #[test]
    fn test_extract_ai_config_missing_returns_none() {
        let config = serde_json::json!({
            "other": "data"
        });
        let result = LogAnalyzer::extract_ai_config(&config);
        assert!(result.is_none());
    }
}
