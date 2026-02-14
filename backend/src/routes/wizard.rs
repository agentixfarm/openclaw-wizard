//! # Wizard API Routes
//!
//! Endpoints for the setup wizard: API key validation and config save.

use axum::Json;

use crate::models::{ApiKeyValidationRequest, ApiKeyValidationResponse, ApiResponse, EmptyResponse, WizardConfig, InstallRequest};
use crate::services::{config::ConfigWriter, platform::Platform};

/// Validate API key by testing against provider API
pub async fn validate_api_key(Json(request): Json<ApiKeyValidationRequest>) -> Json<ApiResponse<ApiKeyValidationResponse>> {
    let response = match request.provider.as_str() {
        "anthropic" => validate_anthropic_key(&request.api_key).await,
        "openai" => validate_openai_key(&request.api_key).await,
        _ => ApiKeyValidationResponse {
            valid: false,
            error: Some("Unsupported provider".to_string()),
        },
    };

    Json(ApiResponse {
        success: true,
        data: Some(response),
        error: None,
    })
}

/// Validate Anthropic API key
async fn validate_anthropic_key(api_key: &str) -> ApiKeyValidationResponse {
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "model": "claude-3-haiku-20240307",
        "max_tokens": 1,
        "messages": [{"role": "user", "content": "hi"}]
    });

    match client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                ApiKeyValidationResponse {
                    valid: true,
                    error: None,
                }
            } else if response.status() == 401 || response.status() == 403 {
                ApiKeyValidationResponse {
                    valid: false,
                    error: Some("Invalid API key".to_string()),
                }
            } else {
                ApiKeyValidationResponse {
                    valid: false,
                    error: Some(format!("API error: {}", response.status())),
                }
            }
        }
        Err(e) => ApiKeyValidationResponse {
            valid: false,
            error: Some(format!("Network error: {}", e)),
        },
    }
}

/// Validate OpenAI API key
async fn validate_openai_key(api_key: &str) -> ApiKeyValidationResponse {
    let client = reqwest::Client::new();

    match client
        .get("https://api.openai.com/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                ApiKeyValidationResponse {
                    valid: true,
                    error: None,
                }
            } else if response.status() == 401 || response.status() == 403 {
                ApiKeyValidationResponse {
                    valid: false,
                    error: Some("Invalid API key".to_string()),
                }
            } else {
                ApiKeyValidationResponse {
                    valid: false,
                    error: Some(format!("API error: {}", response.status())),
                }
            }
        }
        Err(e) => ApiKeyValidationResponse {
            valid: false,
            error: Some(format!("Network error: {}", e)),
        },
    }
}

/// Save wizard configuration to openclaw.json
pub async fn save_config(Json(config): Json<WizardConfig>) -> Json<ApiResponse<EmptyResponse>> {
    // Build OpenClaw-compatible JSON config
    let openclaw_config = serde_json::json!({
        "ai": {
            "provider": config.provider,
            "apiKey": config.api_key,
        },
        "gateway": {
            "port": config.gateway_port,
            "bind": config.gateway_bind,
            "auth": {
                "mode": config.auth_mode,
                "credential": config.auth_credential,
            }
        }
    });

    // Get config path
    match Platform::config_dir() {
        Ok(config_dir) => {
            let config_path = config_dir.join("openclaw.json");

            match ConfigWriter::write_json(&config_path, &openclaw_config) {
                Ok(_) => Json(ApiResponse {
                    success: true,
                    data: Some(EmptyResponse {
                        success: true,
                        error: None,
                    }),
                    error: None,
                }),
                Err(e) => Json(ApiResponse {
                    success: false,
                    data: None,
                    error: Some(format!("Failed to write config: {}", e)),
                }),
            }
        }
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to determine config directory: {}", e)),
        }),
    }
}

/// Start installation (returns acknowledgment, actual progress via WebSocket)
pub async fn start_install(Json(_request): Json<InstallRequest>) -> Json<ApiResponse<EmptyResponse>> {
    Json(ApiResponse {
        success: true,
        data: Some(EmptyResponse {
            success: true,
            error: None,
        }),
        error: None,
    })
}
