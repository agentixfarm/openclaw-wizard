mod error;
mod models;
mod routes;
mod services;

use axum::{
    Router,
    routing::{get, post},
};
use clap::Parser;
use tower_http::services::ServeDir;
use tracing::info;

#[derive(Parser)]
#[command(name = "openclaw-wizard", about = "OpenClaw Setup Wizard")]
struct Args {
    /// Port to listen on
    #[arg(short, long, default_value_t = 3030)]
    port: u16,

    /// Don't open browser automatically
    #[arg(long)]
    no_open: bool,
}

#[tokio::main]
async fn main() {
    let args = Args::parse();

    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Build application router
    let app = Router::new()
        .route("/api/health", get(routes::api::health))
        .route("/api/system/info", get(routes::api::system_info))
        .route(
            "/api/system/requirements",
            get(routes::api::system_requirements),
        )
        .route(
            "/api/system/detect-openclaw",
            get(routes::api::detect_openclaw),
        )
        .route(
            "/api/wizard/validate-key",
            post(routes::wizard::validate_api_key),
        )
        .route("/api/wizard/save-config", post(routes::wizard::save_config))
        .route("/api/wizard/install", post(routes::wizard::start_install))
        .route(
            "/api/wizard/rollback",
            post(routes::wizard::rollback_installation),
        )
        .route(
            "/api/channels/validate",
            post(routes::channels::validate_channel_token),
        )
        // Dashboard routes
        .route(
            "/api/dashboard/daemon/status",
            get(routes::dashboard::daemon_status),
        )
        .route(
            "/api/dashboard/daemon/start",
            post(routes::dashboard::daemon_start),
        )
        .route(
            "/api/dashboard/daemon/stop",
            post(routes::dashboard::daemon_stop),
        )
        .route(
            "/api/dashboard/daemon/restart",
            post(routes::dashboard::daemon_restart),
        )
        .route("/api/dashboard/health", get(routes::dashboard::get_health))
        .route(
            "/api/dashboard/config",
            get(routes::dashboard::get_config).put(routes::dashboard::save_config_handler),
        )
        .route(
            "/api/dashboard/config/import",
            post(routes::dashboard::import_config),
        )
        .route(
            "/api/dashboard/config/export",
            get(routes::dashboard::export_config),
        )
        .route(
            "/api/dashboard/chat-url",
            get(routes::dashboard::get_chat_url),
        )
        .route(
            "/api/dashboard/version",
            get(routes::dashboard::get_version_info),
        )
        .route("/ws", get(routes::ws::ws_handler))
        // Remote setup routes
        .route(
            "/api/remote/test-connection",
            post(routes::remote::test_ssh_connection),
        )
        .route("/ws/remote/install", get(routes::remote::ws_remote_install))
        // Docker routes
        .route("/api/docker/status", get(routes::docker::docker_status))
        .route(
            "/api/docker/containers",
            get(routes::docker::list_containers),
        )
        .route("/api/docker/create", post(routes::docker::create_container))
        .route(
            "/api/docker/{id}/stop",
            post(routes::docker::stop_container),
        )
        .route(
            "/api/docker/{id}",
            axum::routing::delete(routes::docker::remove_container),
        )
        .route("/api/docker/{id}/logs", get(routes::docker::container_logs))
        // Skills routes (literal paths BEFORE {name} parameter route)
        .route("/api/skills/search", get(routes::skills::search_skills))
        .route("/api/skills/installed", get(routes::skills::list_installed))
        .route("/api/skills/install", post(routes::skills::install_skill))
        .route("/api/skills/scan", post(routes::skills::scan_skill))
        .route("/api/skills/{name}", get(routes::skills::skill_details))
        .route(
            "/api/skills/{name}",
            axum::routing::delete(routes::skills::uninstall_skill),
        )
        // Service management routes
        .route(
            "/api/services/status",
            get(routes::services::services_status),
        )
        .route(
            "/api/services/gateway/start",
            post(routes::services::start_gateway),
        )
        .route(
            "/api/services/gateway/stop",
            post(routes::services::stop_gateway),
        )
        .route(
            "/api/services/gateway/restart",
            post(routes::services::restart_gateway),
        )
        .route(
            "/api/services/daemon/start",
            post(routes::services::start_daemon),
        )
        .route(
            "/api/services/daemon/stop",
            post(routes::services::stop_daemon),
        )
        .route(
            "/api/services/daemon/restart",
            post(routes::services::restart_daemon),
        )
        .route("/api/services/doctor", get(routes::services::run_doctor))
        // Log routes
        .route("/api/logs/recent", get(routes::logs::get_recent_logs))
        .route("/api/logs/analyze", post(routes::logs::analyze_logs))
        .route("/ws/logs", get(routes::logs::ws_log_stream))
        // WhatsApp connection
        .route(
            "/ws/whatsapp/connect",
            get(routes::dashboard::whatsapp_connect_ws),
        )
        // Intelligence routes
        .route(
            "/api/intelligence/cost-analysis",
            post(routes::intelligence::analyze_cost),
        )
        .route(
            "/api/intelligence/security-audit",
            get(routes::intelligence::security_audit),
        )
        .route(
            "/api/intelligence/pricing",
            get(routes::intelligence::get_pricing),
        )
        // Multi-server routes
        .route(
            "/api/multi-server/servers",
            get(routes::multi_server::get_servers).post(routes::multi_server::add_server),
        )
        .route(
            "/api/multi-server/servers/{id}",
            axum::routing::delete(routes::multi_server::remove_server),
        )
        .route(
            "/api/multi-server/servers/{id}/test",
            post(routes::multi_server::test_server),
        )
        .route(
            "/api/multi-server/rollback/{id}",
            post(routes::multi_server::rollback_server),
        )
        .route(
            "/ws/multi-server/deploy",
            get(routes::multi_server::ws_multi_server_deploy),
        )
        .fallback_service(ServeDir::new("static"));

    let addr = format!("127.0.0.1:{}", args.port);
    let url = format!("http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|_| panic!("Failed to bind to port {}", args.port));

    info!("🐾 OpenClaw Wizard running at {}", url);

    if !args.no_open {
        let url_clone = url.clone();
        tokio::task::spawn_blocking(move || {
            println!("  Opening browser → {}", url_clone);
            if let Err(e) = open::that(&url_clone) {
                eprintln!("Could not open browser: {e}. Open {url_clone} manually.");
            }
        });
    }

    axum::serve(listener, app)
        .await
        .expect("Server failed to start");
}
