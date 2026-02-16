//! # Wizard API Routes
//!
//! Endpoints for the setup wizard: API key validation and config save.

use axum::Json;

use crate::models::{ApiKeyValidationRequest, ApiKeyValidationResponse, ApiResponse, EmptyResponse, WizardConfig, InstallRequest, RollbackResult};
use crate::services::{config::ConfigWriter, platform::Platform, RollbackService};
use crate::error::AppError;

/// Validate API key or setup token by testing against provider API
pub async fn validate_api_key(Json(request): Json<ApiKeyValidationRequest>) -> Json<ApiResponse<ApiKeyValidationResponse>> {
    let response = match (request.provider.as_str(), request.auth_type.as_str()) {
        ("anthropic", "setup-token") => validate_anthropic_setup_token(&request.api_key),
        ("anthropic", _) => validate_anthropic_key(&request.api_key).await,
        ("openai", _) => validate_openai_key(&request.api_key).await,
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

/// Validate Anthropic setup token format (sk-ant-oat01-...)
fn validate_anthropic_setup_token(token: &str) -> ApiKeyValidationResponse {
    if !token.starts_with("sk-ant-oat01-") {
        return ApiKeyValidationResponse {
            valid: false,
            error: Some("Setup token must start with 'sk-ant-oat01-'. Generate one with: claude setup-token".to_string()),
        };
    }
    if token.len() < 80 {
        return ApiKeyValidationResponse {
            valid: false,
            error: Some("Setup token appears too short. Generate a new one with: claude setup-token".to_string()),
        };
    }
    ApiKeyValidationResponse {
        valid: true,
        error: None,
    }
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
    // Map auth_type to OpenClaw's config format
    // OpenClaw uses: "api-key" for standard keys, "token" for setup tokens
    let openclaw_auth_type = match config.auth_type.as_str() {
        "setup-token" => "token",
        _ => "api-key",
    };

    // Build OpenClaw-compatible JSON config
    let mut openclaw_config = serde_json::json!({
        "ai": {
            "provider": config.provider,
            "auth": openclaw_auth_type,
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

    // Add channels if present
    if let Some(channels) = &config.channels {
        let mut channels_obj = serde_json::Map::new();
        for channel in channels {
            let mut channel_config = serde_json::Map::new();
            channel_config.insert("enabled".to_string(), serde_json::json!(channel.enabled));
            channel_config.insert("dmPolicy".to_string(), serde_json::json!(channel.dm_policy));
            channel_config.insert("allowFrom".to_string(), serde_json::json!(channel.allowed_users));

            if let Some(ref token) = channel.bot_token {
                channel_config.insert("botToken".to_string(), serde_json::json!(token));
            }
            if let Some(ref token) = channel.app_token {
                channel_config.insert("appToken".to_string(), serde_json::json!(token));
            }

            channels_obj.insert(channel.platform.clone(), serde_json::Value::Object(channel_config));
        }
        openclaw_config.as_object_mut().unwrap()
            .insert("channels".to_string(), serde_json::Value::Object(channels_obj));
    }

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

/// Rollback installation by reversing stages: stop daemon, remove config, uninstall
pub async fn rollback_installation() -> Result<Json<RollbackResult>, AppError> {
    let result = RollbackService::rollback_local()
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;
    Ok(Json(result))
}
