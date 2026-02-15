use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use thiserror::Error;

use crate::models::ApiResponse;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Internal error: {0}")]
    InternalError(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("SSH connection failed: {0}")]
    SshConnectionFailed(String),

    #[error("SSH authentication failed: {0}")]
    SshAuthFailed(String),

    #[error("Remote command failed: {0}")]
    SshCommandFailed(String),

    #[error("SSH credentials not found: {0}")]
    SshCredentialsNotFound(String),

    #[error("Keyring error: {0}")]
    KeyringError(String),

    #[error("Docker not available: {0}")]
    DockerNotAvailable(String),

    #[error("Docker operation failed: {0}")]
    DockerOperationFailed(String),

    #[error("Container not found: {0}")]
    ContainerNotFound(String),

    #[error("Container limit exceeded: {0}")]
    ContainerLimitExceeded(String),

    #[error("Skill not found: {0}")]
    SkillNotFound(String),

    #[error("Skill install failed: {0}")]
    SkillInstallFailed(String),

    #[error("VirusTotal error: {0}")]
    VirusTotalError(String),

    #[error("Skill blocked: {0}")]
    SkillBlocked(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::SshConnectionFailed(msg) => (StatusCode::BAD_GATEWAY, msg),
            AppError::SshAuthFailed(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::SshCommandFailed(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::SshCredentialsNotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::KeyringError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::DockerNotAvailable(msg) => (StatusCode::SERVICE_UNAVAILABLE, msg),
            AppError::DockerOperationFailed(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::ContainerNotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::ContainerLimitExceeded(msg) => (StatusCode::TOO_MANY_REQUESTS, msg),
            AppError::SkillNotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::SkillInstallFailed(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::VirusTotalError(msg) => (StatusCode::BAD_GATEWAY, msg),
            AppError::SkillBlocked(msg) => (StatusCode::FORBIDDEN, msg),
        };

        let body = Json(ApiResponse::<()> {
            success: false,
            data: None,
            error: Some(error_message),
        });

        (status, body).into_response()
    }
}
