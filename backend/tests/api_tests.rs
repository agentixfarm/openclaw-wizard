//! Integration tests for API route handlers.
//!
//! Tests the full request/response cycle through Axum's Router
//! without starting a real server.

use axum::{
    body::Body,
    http::{Request, StatusCode},
    routing::{get, post},
    Router,
};
use http_body_util::BodyExt;
use tower::ServiceExt;

/// Build the application router (same routes as main.rs but without static files)
fn app() -> Router {
    use openclaw_wizard::routes;

    Router::new()
        .route("/api/health", get(routes::api::health))
        .route("/api/system/info", get(routes::api::system_info))
        .route("/api/system/requirements", get(routes::api::system_requirements))
        .route("/api/system/detect-openclaw", get(routes::api::detect_openclaw))
        .route("/api/wizard/validate-key", post(routes::wizard::validate_api_key))
        .route("/api/wizard/rollback", post(routes::wizard::rollback_installation))
        .route("/api/services/status", get(routes::services::services_status))
        .route("/api/intelligence/pricing", get(routes::intelligence::get_pricing))
        .route("/api/intelligence/security-audit", get(routes::intelligence::security_audit))
}

async fn get_response(app: Router, uri: &str) -> (StatusCode, String) {
    let request = Request::builder()
        .uri(uri)
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body_str = String::from_utf8_lossy(&body).to_string();
    (status, body_str)
}

async fn post_response(app: Router, uri: &str, body: &str) -> (StatusCode, String) {
    let request = Request::builder()
        .method("POST")
        .uri(uri)
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body_str = String::from_utf8_lossy(&body).to_string();
    (status, body_str)
}

#[tokio::test]
async fn test_health_endpoint() {
    let (status, body) = get_response(app(), "/api/health").await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("\"success\""));
}

#[tokio::test]
async fn test_system_info() {
    let (status, body) = get_response(app(), "/api/system/info").await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("\"os\""));
    assert!(body.contains("\"arch\""));
}

#[tokio::test]
async fn test_system_requirements() {
    let (status, body) = get_response(app(), "/api/system/requirements").await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("\"checks\"") || body.contains("\"all_passed\""));
}

#[tokio::test]
async fn test_detect_openclaw() {
    let (status, _body) = get_response(app(), "/api/system/detect-openclaw").await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn test_validate_key_missing_body() {
    let (status, _body) = post_response(app(), "/api/wizard/validate-key", "{}").await;
    // Empty body should return 422 (missing required fields) or 400
    assert!(
        status == StatusCode::UNPROCESSABLE_ENTITY || status == StatusCode::BAD_REQUEST,
        "Expected 422 or 400, got {}",
        status
    );
}

#[tokio::test]
async fn test_services_status() {
    let (status, body) = get_response(app(), "/api/services/status").await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("\"gateway\""));
    assert!(body.contains("\"daemon\""));
}

#[tokio::test]
async fn test_intelligence_pricing() {
    let (status, body) = get_response(app(), "/api/intelligence/pricing").await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("\"models\""));
}

#[tokio::test]
async fn test_security_audit() {
    let (status, body) = get_response(app(), "/api/intelligence/security-audit").await;
    // Security audit may fail if no config exists, but should not panic
    // Accept either 200 with findings or error status
    assert!(
        status == StatusCode::OK || status == StatusCode::INTERNAL_SERVER_ERROR,
        "Unexpected status: {}",
        status
    );
    if status == StatusCode::OK {
        assert!(body.contains("\"findings\""));
    }
}

#[tokio::test]
async fn test_rollback_endpoint() {
    let (status, body) = post_response(app(), "/api/wizard/rollback", "").await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("\"stages\""));
    assert!(body.contains("\"stop_daemon\""));
    assert!(body.contains("\"remove_config\""));
    assert!(body.contains("\"uninstall_openclaw\""));
}

#[tokio::test]
async fn test_unknown_route_returns_404() {
    let (status, _body) = get_response(app(), "/api/nonexistent").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_health_returns_json() {
    let (status, body) = get_response(app(), "/api/health").await;
    assert_eq!(status, StatusCode::OK);
    // Should be valid JSON
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&body);
    assert!(parsed.is_ok(), "Health response should be valid JSON");
}
