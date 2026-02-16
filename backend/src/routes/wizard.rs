//! # Wizard API Routes
//!
//! Endpoints for the setup wizard: API key validation and config save.

use axum::Json;

use crate::models::{ApiKeyValidationRequest, ApiKeyValidationResponse, ApiResponse, EmptyResponse, WizardConfig, InstallRequest, RollbackResult};
use crate::services::{config::ConfigWriter, platform::Platform, RollbackService};
use crate::error::AppError;

/// Validate API key or setup token by testing against provider API.
/// Anthropic and OpenAI get full API validation; all other providers get format validation only.
pub async fn validate_api_key(Json(request): Json<ApiKeyValidationRequest>) -> Json<ApiResponse<ApiKeyValidationResponse>> {
    let response = match (request.provider.as_str(), request.auth_type.as_str()) {
        // Skip and OAuth don't need validation
        ("skip", _) | (_, "oauth") | (_, "skip") => ApiKeyValidationResponse {
            valid: true,
            error: None,
        },
        // Anthropic: full API validation
        ("anthropic", "setup-token") => validate_anthropic_setup_token(&request.api_key),
        ("anthropic", _) => validate_anthropic_key(&request.api_key).await,
        // OpenAI: full API validation
        ("openai", _) => validate_openai_key(&request.api_key).await,
        // All other providers: format validation (non-empty, min length)
        _ => validate_generic_key(&request.api_key),
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

/// Generic API key format validation (non-empty, min length)
fn validate_generic_key(api_key: &str) -> ApiKeyValidationResponse {
    if api_key.trim().is_empty() {
        return ApiKeyValidationResponse {
            valid: false,
            error: Some("API key is required".to_string()),
        };
    }
    if api_key.len() < 10 {
        return ApiKeyValidationResponse {
            valid: false,
            error: Some("API key appears too short".to_string()),
        };
    }
    ApiKeyValidationResponse {
        valid: true,
        error: None,
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
    // Build wizard's internal config (preserves all wizard fields)
    let wizard_config = serde_json::json!({
        "provider": config.provider,
        "auth_type": config.auth_type,
        "api_key": config.api_key,
        "gateway_port": config.gateway_port,
        "gateway_bind": config.gateway_bind,
        "auth_mode": config.auth_mode,
        "auth_credential": config.auth_credential,
        "channels": config.channels,
        "base_url": config.base_url,
        "model_id": config.model_id,
        "compatibility": config.compatibility,
        "account_id": config.account_id,
        "gateway_id": config.gateway_id,
    });

    // Save to wizard's own config dir
    let config_dir = match Platform::config_dir() {
        Ok(dir) => dir,
        Err(e) => return Json(ApiResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to determine config directory: {}", e)),
        }),
    };

    let config_path = config_dir.join("openclaw.json");
    if let Err(e) = ConfigWriter::write_json(&config_path, &wizard_config) {
        return Json(ApiResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to write config: {}", e)),
        });
    }

    // Build OpenClaw gateway-compatible config format
    // gateway.bind must be "loopback" not "127.0.0.1", gateway.auth uses "token" not "credential"
    let bind_value = match config.gateway_bind.as_str() {
        "127.0.0.1" | "localhost" | "loopback" => "loopback",
        "0.0.0.0" | "all" => "all",
        other => other,
    };

    let mut gateway_config = serde_json::json!({
        "gateway": {
            "mode": "local",
            "port": config.gateway_port,
            "bind": bind_value,
            "auth": {
                "mode": config.auth_mode,
                "token": config.auth_credential,
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
        gateway_config.as_object_mut().unwrap()
            .insert("channels".to_string(), serde_json::Value::Object(channels_obj));
    }

    // Deploy to ~/.openclaw/openclaw.json, merging with existing config
    if let Ok(home) = Platform::home_dir() {
        let openclaw_dir = home.join(".openclaw");
        let _ = std::fs::create_dir_all(&openclaw_dir);
        let target_path = openclaw_dir.join("openclaw.json");

        // Read existing config to preserve meta/commands/agents sections
        let mut existing: serde_json::Value = ConfigWriter::read_json(&target_path)
            .unwrap_or_else(|_| serde_json::json!({}));

        // Merge gateway and channels into existing config
        if let (Some(existing_obj), Some(new_obj)) = (existing.as_object_mut(), gateway_config.as_object()) {
            for (key, value) in new_obj {
                existing_obj.insert(key.clone(), value.clone());
            }
        }

        let _ = ConfigWriter::write_json(&target_path, &existing);
    }

    Json(ApiResponse {
        success: true,
        data: Some(EmptyResponse {
            success: true,
            error: None,
        }),
        error: None,
    })
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
