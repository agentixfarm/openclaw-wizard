//! # Config Analyzer - AI-Powered Cost Optimization
//!
//! Uses the user's configured AI provider (Anthropic or OpenAI) to analyze
//! their OpenClaw configuration for cost optimization opportunities.
//! Reuses LogAnalyzer's secret redaction before sending config to external APIs.

use crate::models::types::{CostAnalysis, LlmModelPricing, LlmPricingResponse};
use crate::services::config::ConfigWriter;
use crate::services::log_analyzer::LogAnalyzer;
use anyhow::Result;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

/// Rate limit: minimum 10 seconds between cost analysis requests
const RATE_LIMIT_SECONDS: u64 = 10;

/// Global rate limiter: tracks last cost analysis request timestamp
static LAST_COST_ANALYSIS: AtomicU64 = AtomicU64::new(0);

pub struct ConfigAnalyzer {
    provider: String,
    api_key: String,
    http_client: reqwest::Client,
}

impl ConfigAnalyzer {
    /// Create a ConfigAnalyzer from the user's saved openclaw.json config
    ///
    /// Reads from the wizard's config which contains the provider and API key.
    /// Returns None if no AI provider is configured.
    pub fn from_config() -> Option<Self> {
        use crate::services::platform::Platform;

        // Try wizard config first (has provider + API key)
        let wizard_config_path = Platform::config_dir().ok()?.join("openclaw.json");

        if let Ok(config) = ConfigWriter::read_json(&wizard_config_path)
            && let Some((provider, api_key)) = Self::extract_ai_config(&config)
            && !provider.is_empty()
            && !api_key.is_empty()
        {
            return Some(Self {
                provider,
                api_key,
                http_client: reqwest::Client::new(),
            });
        }

        // Fallback to OpenClaw config (for backwards compatibility)
        let home = std::env::var("HOME").ok()?;
        let openclaw_config_path = PathBuf::from(format!("{}/.openclaw/openclaw.json", home));

        let config: serde_json::Value = ConfigWriter::read_json(&openclaw_config_path).ok()?;
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

    /// Analyze configuration for cost optimization opportunities
    ///
    /// Redacts secrets before sending to AI provider. Rate-limited to
    /// prevent abuse (10 seconds between requests).
    pub async fn analyze_cost(&self, config: &serde_json::Value) -> Result<CostAnalysis> {
        // Check rate limit
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let last = LAST_COST_ANALYSIS.load(Ordering::Relaxed);

        if now.saturating_sub(last) < RATE_LIMIT_SECONDS {
            anyhow::bail!(
                "Please wait {} seconds between cost analysis requests",
                RATE_LIMIT_SECONDS - (now - last)
            );
        }

        // Update last request timestamp
        LAST_COST_ANALYSIS.store(now, Ordering::Relaxed);

        // Redact secrets using LogAnalyzer's shared method
        let config_str = serde_json::to_string_pretty(config).unwrap_or_else(|_| "{}".to_string());
        let redacted = LogAnalyzer::redact_secrets(&config_str);

        // Get pricing reference
        let pricing = Self::get_pricing();
        let pricing_str =
            serde_json::to_string(&pricing.models).unwrap_or_else(|_| "[]".to_string());

        let prompt = format!(
            "You are a cloud cost optimization expert. Analyze this OpenClaw AI assistant \
             configuration and recommend cost-saving model substitutions.\n\n\
             Configuration (secrets redacted):\n```json\n{}\n```\n\n\
             Available LLM pricing (per million tokens):\n```json\n{}\n```\n\n\
             For each recommendation, provide:\n\
             - current_model: the model currently in use\n\
             - recommended_model: a cheaper alternative\n\
             - current_cost_monthly: estimated monthly cost (assume 1M input + 500K output tokens/month)\n\
             - recommended_cost_monthly: estimated cost with the alternative\n\
             - savings_monthly: dollar savings per month\n\
             - savings_percent: percentage savings\n\
             - use_case: what the model is used for\n\
             - rationale: why the substitution is safe\n\n\
             Respond ONLY with valid JSON (no markdown):\n\
             {{\"recommendations\": [...], \"total_current_monthly\": N, \
             \"total_recommended_monthly\": N, \"total_savings_monthly\": N, \
             \"analysis_date\": \"YYYY-MM-DD\", \"summary\": \"...\"}}",
            redacted, pricing_str
        );

        match self.provider.to_lowercase().as_str() {
            "anthropic" => self.call_anthropic(&prompt).await,
            "openai" => self.call_openai(&prompt).await,
            _ => Err(anyhow::anyhow!(
                "Unsupported AI provider: {}",
                self.provider
            )),
        }
    }

    /// Return static LLM pricing data for reference
    pub fn get_pricing() -> LlmPricingResponse {
        LlmPricingResponse {
            models: vec![
                LlmModelPricing {
                    provider: "Anthropic".to_string(),
                    model: "claude-sonnet-4-20250514".to_string(),
                    input_per_million: 3.0,
                    output_per_million: 15.0,
                    context_window: Some(200000),
                    notes: Some("Best for complex reasoning tasks".to_string()),
                },
                LlmModelPricing {
                    provider: "Anthropic".to_string(),
                    model: "claude-haiku-35".to_string(),
                    input_per_million: 0.80,
                    output_per_million: 4.0,
                    context_window: Some(200000),
                    notes: Some("Fast and cost-effective for simple tasks".to_string()),
                },
                LlmModelPricing {
                    provider: "OpenAI".to_string(),
                    model: "gpt-4o".to_string(),
                    input_per_million: 2.50,
                    output_per_million: 10.0,
                    context_window: Some(128000),
                    notes: Some("Flagship model with vision capabilities".to_string()),
                },
                LlmModelPricing {
                    provider: "OpenAI".to_string(),
                    model: "gpt-4o-mini".to_string(),
                    input_per_million: 0.15,
                    output_per_million: 0.60,
                    context_window: Some(128000),
                    notes: Some("Most cost-effective OpenAI model".to_string()),
                },
                LlmModelPricing {
                    provider: "DeepSeek".to_string(),
                    model: "deepseek-chat".to_string(),
                    input_per_million: 0.14,
                    output_per_million: 0.28,
                    context_window: Some(64000),
                    notes: Some("Ultra low-cost general purpose model".to_string()),
                },
                LlmModelPricing {
                    provider: "DeepSeek".to_string(),
                    model: "deepseek-reasoner".to_string(),
                    input_per_million: 0.55,
                    output_per_million: 2.19,
                    context_window: Some(64000),
                    notes: Some("Strong reasoning at low cost".to_string()),
                },
                LlmModelPricing {
                    provider: "Groq".to_string(),
                    model: "llama-3.3-70b".to_string(),
                    input_per_million: 0.59,
                    output_per_million: 0.79,
                    context_window: Some(131072),
                    notes: Some("Open source, fast inference via Groq".to_string()),
                },
            ],
            last_updated: "2026-Q1".to_string(),
        }
    }

    /// Call Anthropic Messages API for cost analysis
    async fn call_anthropic(&self, prompt: &str) -> Result<CostAnalysis> {
        let body = serde_json::json!({
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 2048,
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

        let text = response_body["content"][0]["text"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("No text in Anthropic response"))?;

        Self::parse_cost_response(text)
    }

    /// Call OpenAI Chat Completions API for cost analysis
    async fn call_openai(&self, prompt: &str) -> Result<CostAnalysis> {
        let body = serde_json::json!({
            "model": "gpt-4o-mini",
            "max_tokens": 2048,
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

        Self::parse_cost_response(text)
    }

    /// Parse AI response text into CostAnalysis struct
    ///
    /// Handles JSON wrapped in markdown code blocks and provides
    /// graceful fallback on parse failure.
    pub fn parse_cost_response(text: &str) -> Result<CostAnalysis> {
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

        match serde_json::from_str::<CostAnalysis>(json_str) {
            Ok(analysis) => Ok(analysis),
            Err(_) => {
                // Fallback: return empty analysis with error summary
                let now = chrono::Utc::now().format("%Y-%m-%d").to_string();
                Ok(CostAnalysis {
                    recommendations: vec![],
                    total_current_monthly: 0.0,
                    total_recommended_monthly: 0.0,
                    total_savings_monthly: 0.0,
                    analysis_date: now,
                    summary: Some(format!(
                        "Unable to parse AI response. Raw response: {}",
                        text.chars().take(200).collect::<String>()
                    )),
                })
            }
        }
    }

    /// Extract AI provider and API key from config (same pattern as LogAnalyzer)
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
        LAST_COST_ANALYSIS.store(0, Ordering::Relaxed);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_pricing_has_models() {
        let pricing = ConfigAnalyzer::get_pricing();
        assert!(
            pricing.models.len() >= 7,
            "Should have at least 7 pricing models"
        );
        assert_eq!(pricing.last_updated, "2026-Q1");

        // Verify a known model exists
        let has_sonnet = pricing.models.iter().any(|m| m.model.contains("sonnet"));
        assert!(has_sonnet, "Should include Claude Sonnet pricing");
    }

    #[test]
    fn test_parse_cost_response_valid() {
        let json = r#"{
            "recommendations": [{
                "current_model": "claude-sonnet-4-20250514",
                "recommended_model": "deepseek-chat",
                "current_cost_monthly": 10.50,
                "recommended_cost_monthly": 0.28,
                "savings_monthly": 10.22,
                "savings_percent": 97.3,
                "use_case": "Sub-agent tasks",
                "rationale": "Simple tasks don't need frontier model"
            }],
            "total_current_monthly": 10.50,
            "total_recommended_monthly": 0.28,
            "total_savings_monthly": 10.22,
            "analysis_date": "2026-02-16",
            "summary": "Save $10.22/month by switching sub-agent to DeepSeek"
        }"#;

        let result = ConfigAnalyzer::parse_cost_response(json);
        assert!(result.is_ok());
        let analysis = result.unwrap();
        assert_eq!(analysis.recommendations.len(), 1);
        assert_eq!(
            analysis.recommendations[0].current_model,
            "claude-sonnet-4-20250514"
        );
        assert!((analysis.total_savings_monthly - 10.22).abs() < 0.01);
    }

    #[test]
    fn test_parse_cost_response_fallback() {
        let text = "This is not valid JSON at all";
        let result = ConfigAnalyzer::parse_cost_response(text);
        assert!(result.is_ok());
        let analysis = result.unwrap();
        assert!(analysis.recommendations.is_empty());
        assert!(analysis.summary.unwrap().contains("Unable to parse"));
    }

    #[test]
    fn test_parse_cost_response_with_markdown_wrapper() {
        let text = r#"```json
{
    "recommendations": [],
    "total_current_monthly": 0.0,
    "total_recommended_monthly": 0.0,
    "total_savings_monthly": 0.0,
    "analysis_date": "2026-02-16",
    "summary": "No recommendations"
}
```"#;
        let result = ConfigAnalyzer::parse_cost_response(text);
        assert!(result.is_ok());
        assert_eq!(
            result.unwrap().summary,
            Some("No recommendations".to_string())
        );
    }
}
