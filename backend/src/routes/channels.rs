use axum::{extract::Json, http::StatusCode};
use serde_json::Value;

use crate::models::types::{ApiResponse, ChannelValidationRequest, ChannelValidationResponse};

/// POST /api/channels/validate - Validate a channel bot token
pub async fn validate_channel_token(
    Json(request): Json<ChannelValidationRequest>,
) -> (StatusCode, Json<ApiResponse<ChannelValidationResponse>>) {
    let platform = request.platform.to_lowercase();

    let result = match platform.as_str() {
        "telegram" => validate_telegram(&request.token).await,
        "discord" => validate_discord(&request.token).await,
        "slack" => validate_slack(&request.token, request.app_token.as_deref()).await,
        _ => ChannelValidationResponse {
            valid: false,
            error: Some("Unsupported platform".to_string()),
            bot_name: None,
            bot_username: None,
        },
    };

    let response = ApiResponse {
        success: result.valid,
        data: Some(result),
        error: None,
    };

    (StatusCode::OK, Json(response))
}

/// Validate Telegram bot token
async fn validate_telegram(token: &str) -> ChannelValidationResponse {
    let url = format!("https://api.telegram.org/bot{}/getMe", token);

    let client = reqwest::Client::new();
    match client.get(&url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<Value>().await {
                    Ok(json) => {
                        if let Some(result) = json.get("result") {
                            let bot_name = result
                                .get("first_name")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string());
                            let bot_username = result
                                .get("username")
                                .and_then(|v| v.as_str())
                                .map(|s| format!("@{}", s));

                            ChannelValidationResponse {
                                valid: true,
                                error: None,
                                bot_name,
                                bot_username,
                            }
                        } else {
                            ChannelValidationResponse {
                                valid: false,
                                error: Some("Invalid response from Telegram API".to_string()),
                                bot_name: None,
                                bot_username: None,
                            }
                        }
                    }
                    Err(_) => ChannelValidationResponse {
                        valid: false,
                        error: Some("Failed to parse Telegram API response".to_string()),
                        bot_name: None,
                        bot_username: None,
                    },
                }
            } else if response.status() == StatusCode::UNAUTHORIZED
                || response.status() == StatusCode::FORBIDDEN
            {
                ChannelValidationResponse {
                    valid: false,
                    error: Some("Invalid Telegram bot token".to_string()),
                    bot_name: None,
                    bot_username: None,
                }
            } else {
                ChannelValidationResponse {
                    valid: false,
                    error: Some(format!(
                        "Telegram API error: {}",
                        response.status()
                    )),
                    bot_name: None,
                    bot_username: None,
                }
            }
        }
        Err(e) => ChannelValidationResponse {
            valid: false,
            error: Some(format!("Network error: {}", e)),
            bot_name: None,
            bot_username: None,
        },
    }
}

/// Validate Discord bot token
async fn validate_discord(token: &str) -> ChannelValidationResponse {
    let url = "https://discord.com/api/v10/users/@me";

    let client = reqwest::Client::new();
    match client
        .get(url)
        .header("Authorization", format!("Bot {}", token))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<Value>().await {
                    Ok(json) => {
                        let username = json
                            .get("username")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        let discriminator = json
                            .get("discriminator")
                            .and_then(|v| v.as_str())
                            .and_then(|d| if d == "0" { None } else { Some(d) });

                        let bot_username = match discriminator {
                            Some(disc) => username
                                .as_ref()
                                .map(|u| format!("{}#{}", u, disc)),
                            None => username.clone(),
                        };

                        ChannelValidationResponse {
                            valid: true,
                            error: None,
                            bot_name: username,
                            bot_username,
                        }
                    }
                    Err(_) => ChannelValidationResponse {
                        valid: false,
                        error: Some("Failed to parse Discord API response".to_string()),
                        bot_name: None,
                        bot_username: None,
                    },
                }
            } else if response.status() == StatusCode::UNAUTHORIZED
                || response.status() == StatusCode::FORBIDDEN
            {
                ChannelValidationResponse {
                    valid: false,
                    error: Some("Invalid Discord bot token".to_string()),
                    bot_name: None,
                    bot_username: None,
                }
            } else {
                ChannelValidationResponse {
                    valid: false,
                    error: Some(format!(
                        "Discord API error: {}",
                        response.status()
                    )),
                    bot_name: None,
                    bot_username: None,
                }
            }
        }
        Err(e) => ChannelValidationResponse {
            valid: false,
            error: Some(format!("Network error: {}", e)),
            bot_name: None,
            bot_username: None,
        },
    }
}

/// Validate Slack bot token
async fn validate_slack(bot_token: &str, _app_token: Option<&str>) -> ChannelValidationResponse {
    let url = "https://slack.com/api/auth.test";

    let client = reqwest::Client::new();
    match client
        .post(url)
        .header("Authorization", format!("Bearer {}", bot_token))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<Value>().await {
                    Ok(json) => {
                        let ok = json.get("ok").and_then(|v| v.as_bool()).unwrap_or(false);

                        if ok {
                            let bot_name = json
                                .get("user")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string());

                            ChannelValidationResponse {
                                valid: true,
                                error: None,
                                bot_name: bot_name.clone(),
                                bot_username: bot_name,
                            }
                        } else {
                            let error_msg = json
                                .get("error")
                                .and_then(|v| v.as_str())
                                .unwrap_or("Unknown error");

                            ChannelValidationResponse {
                                valid: false,
                                error: Some(format!("Slack API error: {}", error_msg)),
                                bot_name: None,
                                bot_username: None,
                            }
                        }
                    }
                    Err(_) => ChannelValidationResponse {
                        valid: false,
                        error: Some("Failed to parse Slack API response".to_string()),
                        bot_name: None,
                        bot_username: None,
                    },
                }
            } else if response.status() == StatusCode::UNAUTHORIZED
                || response.status() == StatusCode::FORBIDDEN
            {
                ChannelValidationResponse {
                    valid: false,
                    error: Some("Invalid Slack bot token".to_string()),
                    bot_name: None,
                    bot_username: None,
                }
            } else {
                ChannelValidationResponse {
                    valid: false,
                    error: Some(format!(
                        "Slack API error: {}",
                        response.status()
                    )),
                    bot_name: None,
                    bot_username: None,
                }
            }
        }
        Err(e) => ChannelValidationResponse {
            valid: false,
            error: Some(format!("Network error: {}", e)),
            bot_name: None,
            bot_username: None,
        },
    }
}
