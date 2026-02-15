mod error;
mod models;
mod routes;
mod services;

use axum::{routing::{get, post, put}, Router};
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
        .route("/api/channels/validate", post(routes::channels::validate_channel_token))
        // Dashboard routes
        .route("/api/dashboard/daemon/status", get(routes::dashboard::daemon_status))
        .route("/api/dashboard/daemon/start", post(routes::dashboard::daemon_start))
        .route("/api/dashboard/daemon/stop", post(routes::dashboard::daemon_stop))
        .route("/api/dashboard/daemon/restart", post(routes::dashboard::daemon_restart))
        .route("/api/dashboard/health", get(routes::dashboard::get_health))
        .route("/api/dashboard/config", get(routes::dashboard::get_config).put(routes::dashboard::save_config_handler))
        .route("/api/dashboard/config/import", post(routes::dashboard::import_config))
        .route("/api/dashboard/config/export", get(routes::dashboard::export_config))
        .route("/ws", get(routes::ws::ws_handler))
        // Remote setup routes
        .route("/api/remote/test-connection", post(routes::remote::test_ssh_connection))
        .route("/ws/remote/install", get(routes::remote::ws_remote_install))
        // Docker routes
        .route("/api/docker/status", get(routes::docker::docker_status))
        .route("/api/docker/containers", get(routes::docker::list_containers))
        .route("/api/docker/create", post(routes::docker::create_container))
        .route("/api/docker/{id}/stop", post(routes::docker::stop_container))
        .route("/api/docker/{id}", axum::routing::delete(routes::docker::remove_container))
        .route("/api/docker/{id}/logs", get(routes::docker::container_logs))
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
