mod error;
mod models;
mod routes;
mod services;

use axum::{routing::{get, post}, Router};
use tower_http::services::ServeDir;
use tracing::info;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Build application router
    let app = Router::new()
        .route("/api/health", get(routes::api::health))
        .route("/api/system/info", get(routes::api::system_info))
        .route("/api/system/requirements", get(routes::api::system_requirements))
        .route("/api/system/detect-openclaw", get(routes::api::detect_openclaw))
        .route("/api/wizard/validate-key", post(routes::wizard::validate_api_key))
        .route("/api/wizard/save-config", post(routes::wizard::save_config))
        .route("/api/wizard/install", post(routes::wizard::start_install))
        .route("/ws", get(routes::ws::ws_handler))
        .fallback_service(ServeDir::new("static"));

    // Bind server to localhost:3030
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3030")
        .await
        .expect("Failed to bind to port 3030");

    info!("Server running at http://127.0.0.1:3030");

    // Start server
    axum::serve(listener, app)
        .await
        .expect("Server failed to start");
}
