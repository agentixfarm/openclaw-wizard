//! # Intelligence REST Routes
//!
//! HTTP endpoints for AI-powered cost analysis, security auditing,
//! and LLM pricing data.
//!
//! Endpoints:
//! - POST /api/intelligence/cost-analysis — Analyze config for cost optimization
//! - GET  /api/intelligence/security-audit — Run 8 rule-based security checks
//! - GET  /api/intelligence/pricing — Get static LLM pricing data

use axum::Json;

use crate::error::AppError;
use crate::models::types::{ApiResponse, CostAnalysis, LlmPricingResponse, SecurityAudit};
use crate::services::config::ConfigWriter;
use crate::services::config_analyzer::ConfigAnalyzer;
use crate::services::security_auditor::SecurityAuditor;

/// POST /api/intelligence/cost-analysis
///
/// Analyzes the user's OpenClaw configuration for cost optimization
/// opportunities using the configured AI provider.
pub async fn analyze_cost() -> Result<Json<ApiResponse<CostAnalysis>>, AppError> {
    let analyzer = ConfigAnalyzer::from_config()
        .ok_or_else(|| AppError::AiProviderNotConfigured(
            "No AI provider configured. Complete the setup wizard first.".to_string(),
        ))?;

    // Read the current config
    let home = std::env::var("HOME")
        .map_err(|_| AppError::InternalError("HOME not set".to_string()))?;
    let config_path = std::path::PathBuf::from(format!("{}/.openclaw/openclaw.json", home));
    let config: serde_json::Value = ConfigWriter::read_json(&config_path)
        .map_err(|e| AppError::InternalError(format!("Failed to read config: {}", e)))?;

    let analysis = analyzer.analyze_cost(&config).await
        .map_err(|e| AppError::ConfigAnalysisFailed(e.to_string()))?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(analysis),
        error: None,
    }))
}

/// GET /api/intelligence/security-audit
///
/// Runs 8 deterministic rule-based security checks against the config.
pub async fn security_audit() -> Result<Json<ApiResponse<SecurityAudit>>, AppError> {
    let audit = SecurityAuditor::audit()
        .map_err(|e| AppError::InternalError(format!("Security audit failed: {}", e)))?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(audit),
        error: None,
    }))
}

/// GET /api/intelligence/pricing
///
/// Returns static LLM pricing data for all supported models.
/// Always succeeds (static data, no external calls).
pub async fn get_pricing() -> Json<ApiResponse<LlmPricingResponse>> {
    let pricing = ConfigAnalyzer::get_pricing();

    Json(ApiResponse {
        success: true,
        data: Some(pricing),
        error: None,
    })
}
