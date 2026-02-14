use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::Response,
};
use tracing::{info, warn};

/// WebSocket upgrade handler
pub async fn ws_handler(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(handle_socket)
}

/// Handle WebSocket connection
async fn handle_socket(mut socket: WebSocket) {
    info!("WebSocket connection established");

    while let Some(Ok(msg)) = socket.recv().await {
        match msg {
            Message::Text(text) => {
                info!("Received text message: {}", text);
                let response = format!("echo: {}", text);
                if socket.send(Message::Text(response.into())).await.is_err() {
                    warn!("Failed to send echo response");
                    break;
                }
            }
            Message::Close(_) => {
                info!("WebSocket connection closed");
                break;
            }
            _ => {}
        }
    }
}
