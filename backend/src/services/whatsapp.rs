use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;
use tokio::sync::mpsc;

use crate::services::command::SafeCommand;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhatsAppProgress {
    pub stage: String,
    pub status: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub qr_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

pub struct WhatsAppService;

impl WhatsAppService {
    /// Initialize WhatsApp connection and stream QR code + status updates
    pub async fn connect(tx: mpsc::Sender<WhatsAppProgress>) -> Result<()> {
        let _ = tx
            .send(WhatsAppProgress {
                stage: "init".into(),
                status: "running".into(),
                message: "Initializing WhatsApp connection...".into(),
                qr_code: None,
                error: None,
            })
            .await;

        // First, ensure WhatsApp channel is added to config
        let _ = tx
            .send(WhatsAppProgress {
                stage: "config".into(),
                status: "running".into(),
                message: "Configuring WhatsApp channel...".into(),
                qr_code: None,
                error: None,
            })
            .await;

        // Add WhatsApp channel if not already configured
        match SafeCommand::run("openclaw", &["channels", "add", "--channel", "whatsapp"]) {
            Ok(output) if output.exit_code == 0 => {
                let _ = tx
                    .send(WhatsAppProgress {
                        stage: "config".into(),
                        status: "completed".into(),
                        message: "WhatsApp channel configured".into(),
                        qr_code: None,
                        error: None,
                    })
                    .await;
            }
            Ok(output)
                if output.stderr.contains("already") || output.stdout.contains("already") =>
            {
                let _ = tx
                    .send(WhatsAppProgress {
                        stage: "config".into(),
                        status: "completed".into(),
                        message: "WhatsApp channel already configured".into(),
                        qr_code: None,
                        error: None,
                    })
                    .await;
            }
            Ok(output) => {
                let error_msg = format!("Failed to add WhatsApp channel: {}", output.stderr.trim());
                let _ = tx
                    .send(WhatsAppProgress {
                        stage: "config".into(),
                        status: "failed".into(),
                        message: "Configuration failed".into(),
                        qr_code: None,
                        error: Some(error_msg.clone()),
                    })
                    .await;
                anyhow::bail!("{}", error_msg);
            }
            Err(e) => {
                let error_msg = format!("Could not run channels add: {}", e);
                let _ = tx
                    .send(WhatsAppProgress {
                        stage: "config".into(),
                        status: "failed".into(),
                        message: "Configuration failed".into(),
                        qr_code: None,
                        error: Some(error_msg.clone()),
                    })
                    .await;
                anyhow::bail!("{}", error_msg);
            }
        }

        // Start login process to get QR code
        eprintln!("About to start WhatsApp login");
        let _ = tx
            .send(WhatsAppProgress {
                stage: "login".into(),
                status: "running".into(),
                message: "Starting WhatsApp login...".into(),
                qr_code: None,
                error: None,
            })
            .await;

        eprintln!("Calling start_login");
        match Self::start_login(tx.clone()).await {
            Ok(_) => {
                eprintln!("start_login completed successfully");
                Ok(())
            }
            Err(e) => {
                eprintln!("start_login failed: {}", e);
                let _ = tx
                    .send(WhatsAppProgress {
                        stage: "login".into(),
                        status: "failed".into(),
                        message: "Failed to start login".into(),
                        qr_code: None,
                        error: Some(e.to_string()),
                    })
                    .await;
                Err(e)
            }
        }
    }

    async fn start_login(tx: mpsc::Sender<WhatsAppProgress>) -> Result<()> {
        eprintln!("Spawning openclaw channels login command");
        // Spawn openclaw channels login with verbose output
        let mut child = TokioCommand::new("openclaw")
            .args(["channels", "login", "--channel", "whatsapp", "--verbose"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .context("Failed to start WhatsApp login")?;

        eprintln!("Command spawned successfully");
        let stdout = child.stdout.take().context("Failed to capture stdout")?;
        let stderr = child.stderr.take().context("Failed to capture stderr")?;
        eprintln!("Stdout and stderr captured");

        let tx_clone = tx.clone();
        let stdout_task = tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            let mut qr_lines: Vec<String> = Vec::new();
            let mut collecting_qr = false;

            loop {
                if collecting_qr {
                    // Use a timeout: if no new line in 500ms, send what we have
                    match tokio::time::timeout(
                        std::time::Duration::from_millis(500),
                        lines.next_line(),
                    )
                    .await
                    {
                        Ok(Ok(Some(line))) => {
                            let has_blocks =
                                line.contains('█') || line.contains('▄') || line.contains('▀');
                            if has_blocks {
                                qr_lines.push(line);
                            } else {
                                // Non-QR line: flush QR and process this line
                                if !qr_lines.is_empty() {
                                    let qr_code = qr_lines.join("\n");
                                    let _ = tx_clone
                                        .send(WhatsAppProgress {
                                            stage: "qr".into(),
                                            status: "running".into(),
                                            message: "Scan this QR code with WhatsApp".into(),
                                            qr_code: Some(qr_code),
                                            error: None,
                                        })
                                        .await;
                                    qr_lines.clear();
                                }
                                collecting_qr = false;
                                if line.contains("connected") || line.contains("Connected") {
                                    let _ = tx_clone
                                        .send(WhatsAppProgress {
                                            stage: "connected".into(),
                                            status: "completed".into(),
                                            message: "WhatsApp connected successfully!".into(),
                                            qr_code: None,
                                            error: None,
                                        })
                                        .await;
                                }
                            }
                        }
                        Err(_) => {
                            // Timeout: no new line in 500ms — flush collected QR code
                            if !qr_lines.is_empty() {
                                let qr_code = qr_lines.join("\n");
                                eprintln!(
                                    "QR code flushed after timeout! {} lines",
                                    qr_lines.len()
                                );
                                let _ = tx_clone
                                    .send(WhatsAppProgress {
                                        stage: "qr".into(),
                                        status: "running".into(),
                                        message: "Scan this QR code with WhatsApp".into(),
                                        qr_code: Some(qr_code),
                                        error: None,
                                    })
                                    .await;
                                qr_lines.clear();
                            }
                            collecting_qr = false;
                            // Keep reading normally
                        }
                        _ => break, // Stream ended or error
                    }
                } else {
                    // Normal (non-QR) line reading
                    match lines.next_line().await {
                        Ok(Some(line)) => {
                            if line.contains("Scan this QR") {
                                collecting_qr = true;
                                qr_lines.clear();
                                let _ = tx_clone
                                    .send(WhatsAppProgress {
                                        stage: "qr".into(),
                                        status: "running".into(),
                                        message: "QR code ready - scan with WhatsApp".into(),
                                        qr_code: None,
                                        error: None,
                                    })
                                    .await;
                            } else if line.contains("connected") || line.contains("Connected") {
                                let _ = tx_clone
                                    .send(WhatsAppProgress {
                                        stage: "connected".into(),
                                        status: "completed".into(),
                                        message: "WhatsApp connected successfully!".into(),
                                        qr_code: None,
                                        error: None,
                                    })
                                    .await;
                            } else if line.contains("waiting") || line.contains("Waiting") {
                                let _ = tx_clone
                                    .send(WhatsAppProgress {
                                        stage: "qr".into(),
                                        status: "running".into(),
                                        message: line.clone(),
                                        qr_code: None,
                                        error: None,
                                    })
                                    .await;
                            } else if !line.trim().is_empty() && !line.contains("Registered plugin")
                            {
                                let _ = tx_clone
                                    .send(WhatsAppProgress {
                                        stage: "login".into(),
                                        status: "running".into(),
                                        message: line.clone(),
                                        qr_code: None,
                                        error: None,
                                    })
                                    .await;
                            }
                        }
                        _ => break,
                    }
                }
            }
        });

        let tx_clone = tx.clone();
        let stderr_task = tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                if line.contains("Error") || line.contains("error") || line.contains("failed") {
                    let _ = tx_clone
                        .send(WhatsAppProgress {
                            stage: "login".into(),
                            status: "failed".into(),
                            message: "Login failed".into(),
                            qr_code: None,
                            error: Some(line.clone()),
                        })
                        .await;
                }
            }
        });

        let _ = tokio::join!(stdout_task, stderr_task);

        let status = child.wait().await?;

        if status.success() {
            let _ = tx
                .send(WhatsAppProgress {
                    stage: "connected".into(),
                    status: "completed".into(),
                    message: "WhatsApp connected successfully!".into(),
                    qr_code: None,
                    error: None,
                })
                .await;
        } else {
            let _ = tx
                .send(WhatsAppProgress {
                    stage: "login".into(),
                    status: "failed".into(),
                    message: "Login process failed".into(),
                    qr_code: None,
                    error: Some(format!("Process exited with code: {:?}", status.code())),
                })
                .await;
        }

        Ok(())
    }

    /// Disconnect WhatsApp channel
    #[allow(dead_code)]
    pub async fn disconnect() -> Result<()> {
        SafeCommand::run("openclaw", &["channels", "logout", "--channel", "whatsapp"])
            .context("Failed to logout WhatsApp")?;
        Ok(())
    }
}
