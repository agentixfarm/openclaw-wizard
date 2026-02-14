# Architecture Research

**Domain:** Axum+React Management Dashboard with Remote Execution & AI Integration
**Researched:** 2026-02-14
**Confidence:** HIGH

## Integration Architecture Overview

This architecture extends the existing Axum 0.8 + React 19 setup wizard to add v1.1 control center capabilities. The existing patterns are maintained while adding new service modules for SSH remote execution, Docker container management, skills browsing, log streaming, and AI-powered auditing.

```
┌─────────────────────────────────────────────────────────────┐
│                    React 19 Frontend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Wizard Flow  │  │  Dashboard   │  │ Control      │       │
│  │ (existing)   │  │  (existing)  │  │ Center (NEW) │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                          │                                  │
│                   REST API + WebSocket                      │
├─────────────────────────────────────────────────────────────┤
│                    Axum 0.8 Backend                          │
│  Existing Routes:                                            │
│  /api/wizard/*       /api/dashboard/*                        │
│  /api/system/*       /api/config/*                           │
│  /ws (install streaming)                                     │
│                                                              │
│  NEW Routes:                                                 │
│  /api/remote/*       - SSH execution & multi-node           │
│  /api/docker/*       - Container management                 │
│  /api/skills/*       - Skills discovery & install           │
│  /ws/logs            - Log streaming                         │
│  /api/audit/*        - AI config & security auditing        │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                             │
│  Existing:               NEW:                                │
│  ┌──────────┐           ┌──────────┐  ┌──────────┐          │
│  │ health   │           │  ssh     │  │  docker  │          │
│  │ daemon   │           │  remote  │  │  manager │          │
│  │ config   │           │  skills  │  │  audit   │          │
│  │ command  │           │  logs    │  │  ai      │          │
│  └──────────┘           └──────────┘  └──────────┘          │
├─────────────────────────────────────────────────────────────┤
│                    External Systems                          │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐    │
│  │ Local OpenClaw│  │ Remote VPS    │  │ Docker API   │    │
│  │ (existing)    │  │ (via SSH)     │  │ (bollard)    │    │
│  └───────────────┘  └───────────────┘  └──────────────┘    │
│  ┌───────────────┐  ┌───────────────┐                       │
│  │ AI APIs       │  │ npm Registry  │                       │
│  │ (OpenAI/      │  │ (skills       │                       │
│  │  Claude)      │  │  discovery)   │                       │
│  └───────────────┘  └───────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Existing Components (DO NOT modify core patterns)

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **HealthService** | Monitor local OpenClaw gateway via `openclaw health --json` | Parses CLI output, returns HealthSnapshot |
| **DaemonService** | Manage local daemon (start/stop/restart) via CLI | Uses sysinfo for process detection, SafeCommand for CLI |
| **ConfigService** | Read/write openclaw.json config files | File I/O with JSON serialization |
| **SafeCommand** | Execute local shell commands safely | Subprocess execution with stdout/stderr capture |
| **WebSocket Handler** | Stream install progress to frontend | tokio::sync::mpsc channel → WebSocket messages |

### New Service Modules (v1.1)

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **SshService** | Execute commands on remote VPS, manage SSH connections | openssh crate for async SSH, connection pooling |
| **RemoteService** | Coordinate multi-node OpenClaw deployments | Uses SshService + state tracking for multiple servers |
| **DockerService** | Create/manage sandboxed OpenClaw containers | bollard crate for Docker API, container lifecycle |
| **SkillsService** | Discover, categorize, install OpenClaw skills from npm | npm registry API client, package.json parsing |
| **LogStreamService** | Tail daemon/gateway logs, stream to frontend via WebSocket | tail -f process + mpsc channel → WebSocket |
| **AuditService** | Call AI APIs to analyze config/security | async HTTP client (reqwest) → OpenAI/Claude API |

## Recommended Project Structure

### Backend Structure (NEW modules)

```
backend/src/
├── main.rs                    # Axum router (ADD new routes)
├── routes/
│   ├── mod.rs                 # Export existing + new route modules
│   ├── api.rs                 # [existing]
│   ├── wizard.rs              # [existing]
│   ├── dashboard.rs           # [existing]
│   ├── channels.rs            # [existing]
│   ├── ws.rs                  # [existing] - EXTEND for /ws/logs
│   ├── remote.rs              # [NEW] - SSH & multi-node endpoints
│   ├── docker.rs              # [NEW] - Container management endpoints
│   ├── skills.rs              # [NEW] - Skills discovery & install
│   └── audit.rs               # [NEW] - AI auditing endpoints
├── services/
│   ├── mod.rs                 # Export existing + new services
│   ├── health.rs              # [existing]
│   ├── daemon.rs              # [existing]
│   ├── config.rs              # [existing]
│   ├── command.rs             # [existing]
│   ├── detection.rs           # [existing]
│   ├── installer.rs           # [existing]
│   ├── platform.rs            # [existing]
│   ├── ssh.rs                 # [NEW] - SSH connection management
│   ├── remote.rs              # [NEW] - Multi-node coordination
│   ├── docker.rs              # [NEW] - Docker container operations
│   ├── skills.rs              # [NEW] - npm skills discovery
│   ├── logs.rs                # [NEW] - Log tailing & streaming
│   └── audit.rs               # [NEW] - AI API integration
├── models/
│   ├── mod.rs
│   └── types.rs               # [EXTEND] - Add new ts-rs types
└── error.rs                   # [existing]
```

### Frontend Structure (NEW components)

```
frontend/src/
├── components/
│   ├── wizard/                # [existing] - No changes
│   ├── dashboard/             # [existing] - No changes
│   ├── steps/                 # [existing] - No changes
│   ├── ui/                    # [existing] - EXTEND with new UI primitives
│   └── control-center/        # [NEW] - v1.1 control center features
│       ├── RemoteSetup.tsx    # SSH credentials, remote VPS setup
│       ├── DockerManager.tsx  # Container list, create, stop, logs
│       ├── SkillsBrowser.tsx  # Browse/search/install skills
│       ├── LogViewer.tsx      # Streaming log viewer with filtering
│       ├── ConfigAuditor.tsx  # AI-powered config suggestions
│       └── SecurityAuditor.tsx # Security scan results
├── hooks/
│   ├── useWizardState.ts      # [existing]
│   ├── useStreamingOutput.ts  # [existing]
│   ├── useWebSocket.ts        # [NEW] - Generic WebSocket hook with reconnect
│   ├── useLogStream.ts        # [NEW] - Log streaming with filtering
│   └── useTheme.ts            # [NEW] - Dark mode theme management
├── lib/
│   ├── api.ts                 # [EXTEND] - Add new API client methods
│   └── theme.ts               # [NEW] - Tailwind v4 theme utilities
└── types/                     # [ts-rs generated] - Auto-updated from Rust
```

### Structure Rationale

- **Backend services layer:** Follows existing pattern of service modules called by route handlers. Each new capability gets its own service module with clear separation of concerns.
- **Route organization:** Group by feature (remote, docker, skills, audit) matching service module structure for consistency.
- **Frontend control-center:** New subdirectory under components/ keeps v1.1 features separate from existing wizard/dashboard code, enabling parallel development.
- **TypeScript type generation:** Continue using ts-rs to auto-generate frontend types from Rust structs, maintaining type safety across the stack.

## Architectural Patterns

### Pattern 1: SSH Remote Execution via Connection Pool

**What:** Local Axum server executes commands on remote VPS using async SSH connections pooled per host.

**When to use:** For remote setup, remote daemon control, multi-node coordination.

**Trade-offs:**
- Pro: Reuses SSH connections, fast command execution
- Pro: Async allows concurrent operations across multiple nodes
- Con: Requires SSH key or password storage (use config file, never logs)
- Con: Connection pool lifecycle management adds complexity

**Example:**

```rust
// backend/src/services/ssh.rs
use openssh::{Session, SessionBuilder};
use std::collections::HashMap;
use tokio::sync::RwLock;
use std::sync::Arc;

pub struct SshService {
    // Connection pool: host -> Session
    connections: Arc<RwLock<HashMap<String, Session>>>,
}

impl SshService {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Execute command on remote host
    pub async fn exec(&self, host: &str, user: &str, command: &str) -> Result<CommandOutput, SshError> {
        let session = self.get_or_create_session(host, user).await?;

        let output = session.command(command)
            .output()
            .await
            .map_err(|e| SshError::ExecutionFailed(e.to_string()))?;

        Ok(CommandOutput {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code().unwrap_or(-1),
        })
    }

    async fn get_or_create_session(&self, host: &str, user: &str) -> Result<Session, SshError> {
        let key = format!("{}@{}", user, host);

        // Try to get existing connection
        {
            let pool = self.connections.read().await;
            if let Some(session) = pool.get(&key) {
                // Check if still alive
                if session.check().await.is_ok() {
                    return Ok(session.clone());
                }
            }
        }

        // Create new connection
        let session = SessionBuilder::default()
            .user_known_hosts_check(openssh::KnownHosts::Accept)
            .connect(&format!("{}@{}", user, host))
            .await
            .map_err(|e| SshError::ConnectionFailed(e.to_string()))?;

        // Store in pool
        let mut pool = self.connections.write().await;
        pool.insert(key, session.clone());

        Ok(session)
    }
}

// Usage in route handler
async fn remote_setup(
    Json(req): Json<RemoteSetupRequest>,
    Extension(ssh_service): Extension<Arc<SshService>>,
) -> Result<Json<RemoteSetupResponse>, ApiError> {
    // Execute setup script on remote VPS
    let output = ssh_service.exec(
        &req.host,
        &req.user,
        "curl -fsSL https://openclaw.ai/install.sh | bash"
    ).await?;

    Ok(Json(RemoteSetupResponse {
        success: output.exit_code == 0,
        output: output.stdout,
        error: if output.exit_code != 0 { Some(output.stderr) } else { None },
    }))
}
```

### Pattern 2: Docker Container Management via Bollard

**What:** Create isolated OpenClaw instances in Docker containers, manage lifecycle via bollard async API.

**When to use:** For sandboxed development environments, multi-tenant deployments, testing different configs.

**Trade-offs:**
- Pro: Full isolation between instances
- Pro: Easy cleanup, reproducible environments
- Con: Requires Docker installed on host
- Con: Container overhead (CPU/memory) for multiple instances

**Example:**

```rust
// backend/src/services/docker.rs
use bollard::{Docker, container::{Config, CreateContainerOptions}};
use bollard::models::{HostConfig, PortBinding};

pub struct DockerService {
    client: Docker,
}

impl DockerService {
    pub fn new() -> Result<Self, DockerError> {
        let client = Docker::connect_with_local_defaults()
            .map_err(|e| DockerError::ConnectionFailed(e.to_string()))?;
        Ok(Self { client })
    }

    /// Create sandboxed OpenClaw container
    pub async fn create_openclaw_container(
        &self,
        name: &str,
        config_json: &str,
    ) -> Result<String, DockerError> {
        let config = Config {
            image: Some("node:20-alpine"),
            cmd: Some(vec!["npx", "openclaw", "gateway", "start"]),
            env: Some(vec![
                format!("OPENCLAW_CONFIG={}", config_json),
            ]),
            host_config: Some(HostConfig {
                port_bindings: Some(HashMap::from([
                    ("3000/tcp".to_string(), Some(vec![PortBinding {
                        host_ip: Some("127.0.0.1".to_string()),
                        host_port: Some("0".to_string()), // Random port
                    }])),
                ])),
                ..Default::default()
            }),
            ..Default::default()
        };

        let options = CreateContainerOptions {
            name,
            platform: None,
        };

        let container = self.client
            .create_container(Some(options), config)
            .await
            .map_err(|e| DockerError::CreateFailed(e.to_string()))?;

        // Start container
        self.client
            .start_container::<String>(&container.id, None)
            .await
            .map_err(|e| DockerError::StartFailed(e.to_string()))?;

        Ok(container.id)
    }

    /// List all OpenClaw containers
    pub async fn list_containers(&self) -> Result<Vec<ContainerInfo>, DockerError> {
        let containers = self.client
            .list_containers::<String>(None)
            .await
            .map_err(|e| DockerError::ListFailed(e.to_string()))?;

        Ok(containers
            .into_iter()
            .filter(|c| c.image.as_ref().map(|i| i.contains("node")).unwrap_or(false))
            .map(|c| ContainerInfo {
                id: c.id.unwrap_or_default(),
                name: c.names.unwrap_or_default().first().cloned().unwrap_or_default(),
                status: c.status.unwrap_or_default(),
            })
            .collect())
    }
}
```

### Pattern 3: Log Streaming via WebSocket + mpsc Channel

**What:** Tail daemon/gateway logs using subprocess, forward lines through mpsc channel to WebSocket.

**When to use:** For real-time log viewing in the dashboard.

**Trade-offs:**
- Pro: Real-time updates, low latency
- Pro: Reuses existing WebSocket infrastructure
- Con: Keeps subprocess running (resource usage)
- Con: Needs cleanup on disconnect

**Example:**

```rust
// backend/src/services/logs.rs
use tokio::process::Command;
use tokio::sync::mpsc;
use tokio::io::{BufReader, AsyncBufReadExt};

pub struct LogStreamService;

impl LogStreamService {
    /// Start tailing log file, send lines to channel
    pub async fn tail_logs(
        log_path: String,
        tx: mpsc::Sender<String>,
    ) -> Result<(), LogError> {
        let mut child = Command::new("tail")
            .args(["-f", "-n", "100", &log_path])
            .stdout(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| LogError::SpawnFailed(e.to_string()))?;

        let stdout = child.stdout.take()
            .ok_or_else(|| LogError::NoStdout)?;

        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();

        while let Some(line) = lines.next_line().await.transpose() {
            match line {
                Ok(text) => {
                    if tx.send(text).await.is_err() {
                        // Receiver dropped, stop tailing
                        break;
                    }
                }
                Err(e) => {
                    eprintln!("Error reading log line: {}", e);
                    break;
                }
            }
        }

        // Kill tail process on exit
        let _ = child.kill().await;

        Ok(())
    }
}

// WebSocket handler for /ws/logs
pub async fn ws_logs_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<LogStreamParams>,
) -> Response {
    ws.on_upgrade(move |socket| handle_log_stream(socket, params))
}

async fn handle_log_stream(mut socket: WebSocket, params: LogStreamParams) {
    let (tx, mut rx) = mpsc::channel::<String>(100);

    // Spawn log tailing task
    tokio::spawn(async move {
        let log_path = if params.log_type == "daemon" {
            "/var/log/openclaw/daemon.log"
        } else {
            "/var/log/openclaw/gateway.log"
        };
        let _ = LogStreamService::tail_logs(log_path.to_string(), tx).await;
    });

    // Forward log lines to WebSocket
    while let Some(line) = rx.recv().await {
        let msg = WsMessage {
            msg_type: "log-line".to_string(),
            payload: serde_json::json!({ "line": line }),
        };

        if socket.send(Message::Text(serde_json::to_string(&msg).unwrap())).await.is_err() {
            break;
        }
    }
}
```

### Pattern 4: Skills Discovery via npm Registry API

**What:** Query npm registry for packages tagged with "openclaw-skill", parse metadata, present browsable catalog.

**When to use:** For discovering and installing community-contributed OpenClaw skills.

**Trade-offs:**
- Pro: No backend database needed, npm is source of truth
- Pro: Standard package manager workflow (npm install)
- Con: npm registry API rate limits
- Con: Requires filtering/validation of third-party packages

**Example:**

```rust
// backend/src/services/skills.rs
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct Skill {
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub keywords: Vec<String>,
    pub downloads_last_month: u32,
}

pub struct SkillsService {
    client: Client,
}

impl SkillsService {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    /// Search npm registry for openclaw skills
    pub async fn search_skills(&self, query: &str) -> Result<Vec<Skill>, SkillsError> {
        let url = format!(
            "https://registry.npmjs.org/-/v1/search?text=keywords:openclaw-skill+{}",
            query
        );

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| SkillsError::RequestFailed(e.to_string()))?;

        let data: NpmSearchResult = response
            .json()
            .await
            .map_err(|e| SkillsError::ParseFailed(e.to_string()))?;

        Ok(data.objects
            .into_iter()
            .map(|obj| Skill {
                name: obj.package.name,
                version: obj.package.version,
                description: obj.package.description.unwrap_or_default(),
                author: obj.package.publisher.username,
                keywords: obj.package.keywords.unwrap_or_default(),
                downloads_last_month: obj.downloads_last_month,
            })
            .collect())
    }

    /// Install skill via npm
    pub async fn install_skill(&self, skill_name: &str) -> Result<(), SkillsError> {
        let output = SafeCommand::run("npm", &["install", "-g", skill_name])?;

        if output.exit_code != 0 {
            return Err(SkillsError::InstallFailed(output.stderr));
        }

        Ok(())
    }
}

#[derive(Deserialize)]
struct NpmSearchResult {
    objects: Vec<NpmPackageObject>,
}

#[derive(Deserialize)]
struct NpmPackageObject {
    package: NpmPackage,
    #[serde(rename = "downloads")]
    downloads_last_month: u32,
}

#[derive(Deserialize)]
struct NpmPackage {
    name: String,
    version: String,
    description: Option<String>,
    keywords: Option<Vec<String>>,
    publisher: NpmPublisher,
}

#[derive(Deserialize)]
struct NpmPublisher {
    username: String,
}
```

### Pattern 5: AI Config Auditing via async HTTP Client

**What:** Send OpenClaw config to AI API (OpenAI/Claude), receive optimization suggestions.

**When to use:** For AI-powered config review, security auditing, best practices recommendations.

**Trade-offs:**
- Pro: Leverages AI for complex analysis
- Pro: Can evolve suggestions without code changes
- Con: Requires API key, costs per request
- Con: Network latency, rate limits

**Example:**

```rust
// backend/src/services/audit.rs
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct AuditSuggestion {
    pub category: String,    // "performance", "security", "best-practice"
    pub severity: String,     // "high", "medium", "low"
    pub title: String,
    pub description: String,
    pub fix: Option<String>,  // Suggested fix
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../bindings/")]
pub struct AuditResult {
    pub suggestions: Vec<AuditSuggestion>,
    pub score: u8,           // 0-100
}

pub struct AuditService {
    client: Client,
    api_key: String,
}

impl AuditService {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
        }
    }

    /// Audit config using Claude API
    pub async fn audit_config(&self, config_json: &str) -> Result<AuditResult, AuditError> {
        let prompt = format!(
            "Review this OpenClaw configuration and provide optimization suggestions:\n\n{}",
            config_json
        );

        let request = ClaudeRequest {
            model: "claude-sonnet-4-5-20250929".to_string(),
            max_tokens: 2048,
            messages: vec![
                ClaudeMessage {
                    role: "user".to_string(),
                    content: prompt,
                }
            ],
        };

        let response = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&request)
            .send()
            .await
            .map_err(|e| AuditError::RequestFailed(e.to_string()))?;

        let data: ClaudeResponse = response
            .json()
            .await
            .map_err(|e| AuditError::ParseFailed(e.to_string()))?;

        // Parse AI response into structured suggestions
        // (In practice, would use structured output or function calling)
        let suggestions = self.parse_suggestions(&data.content[0].text)?;

        Ok(AuditResult {
            suggestions,
            score: self.calculate_score(&suggestions),
        })
    }

    fn parse_suggestions(&self, text: &str) -> Result<Vec<AuditSuggestion>, AuditError> {
        // Parse AI markdown response into structured suggestions
        // Implementation depends on prompt engineering for consistent format
        unimplemented!("Parse AI response")
    }

    fn calculate_score(&self, suggestions: &[AuditSuggestion]) -> u8 {
        // Higher severity = lower score
        let deductions: u8 = suggestions.iter().map(|s| match s.severity.as_str() {
            "high" => 20,
            "medium" => 10,
            "low" => 5,
            _ => 0,
        }).sum();

        100_u8.saturating_sub(deductions)
    }
}

#[derive(Serialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<ClaudeMessage>,
}

#[derive(Serialize)]
struct ClaudeMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ClaudeResponse {
    content: Vec<ClaudeContent>,
}

#[derive(Deserialize)]
struct ClaudeContent {
    text: String,
}
```

### Pattern 6: Dark Mode with Tailwind CSS v4

**What:** Tailwind v4 dark mode using custom variant + CSS variables, toggled via React context.

**When to use:** For theme switching in the dashboard UI.

**Trade-offs:**
- Pro: No tailwind.config.js, simpler setup in v4
- Pro: CSS variables allow dynamic theme switching
- Con: Tailwind v4 custom variant syntax differs from v3

**Example:**

```css
/* frontend/src/index.css */
@import "tailwindcss";

/* Define custom dark variant for Tailwind v4 */
@custom-variant dark (&:where(.dark, .dark *));

/* Theme CSS variables */
:root {
  --color-bg-primary: 255 255 255;
  --color-bg-secondary: 249 250 251;
  --color-text-primary: 17 24 39;
  --color-text-secondary: 107 114 128;
  --color-border: 229 231 235;
}

.dark {
  --color-bg-primary: 17 24 39;
  --color-bg-secondary: 31 41 55;
  --color-text-primary: 249 250 251;
  --color-text-secondary: 209 213 219;
  --color-border: 55 65 81;
}
```

```typescript
// frontend/src/hooks/useTheme.ts
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return (stored as Theme) || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

```tsx
// Usage in component
function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-[rgb(var(--color-bg-primary))] border-b border-[rgb(var(--color-border))]">
      <button onClick={toggleTheme}>
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </header>
  );
}
```

## Data Flow

### SSH Remote Execution Flow

```
[Frontend: RemoteSetup.tsx]
    ↓ POST /api/remote/setup
[Route: remote::setup_remote_vps]
    ↓
[Service: SshService::exec("openclaw install")]
    ↓ (async SSH via openssh)
[Remote VPS: Execute install script]
    ↓ (stdout/stderr)
[SshService: Parse output]
    ↓
[Route: Return RemoteSetupResponse]
    ↓
[Frontend: Display results]
```

### Docker Container Management Flow

```
[Frontend: DockerManager.tsx]
    ↓ POST /api/docker/create
[Route: docker::create_container]
    ↓
[Service: DockerService::create_openclaw_container]
    ↓ (bollard API call)
[Docker Daemon: Create & start container]
    ↓ (container ID)
[DockerService: Return container info]
    ↓
[Route: Return ContainerResponse]
    ↓
[Frontend: Update container list]
```

### Log Streaming Flow

```
[Frontend: LogViewer.tsx]
    ↓ WebSocket connect to /ws/logs?type=daemon
[Route: ws::ws_logs_handler]
    ↓ Spawn log tail task
[Service: LogStreamService::tail_logs]
    ↓ (subprocess: tail -f /var/log/openclaw/daemon.log)
[Subprocess: Stream log lines]
    ↓ (mpsc channel)
[WebSocket handler: Forward to client]
    ↓ (WsMessage with log-line)
[Frontend: Append to log display]
```

### Skills Discovery Flow

```
[Frontend: SkillsBrowser.tsx]
    ↓ GET /api/skills/search?q=weather
[Route: skills::search_skills]
    ↓
[Service: SkillsService::search_skills("weather")]
    ↓ (reqwest HTTP)
[npm Registry API: Search for openclaw-skill + weather]
    ↓ (JSON response)
[SkillsService: Parse into Skill structs]
    ↓
[Route: Return Vec<Skill>]
    ↓
[Frontend: Display in grid with filtering]
```

### AI Config Auditing Flow

```
[Frontend: ConfigAuditor.tsx]
    ↓ POST /api/audit/config (with config JSON)
[Route: audit::audit_config]
    ↓
[Service: AuditService::audit_config]
    ↓ (reqwest HTTP)
[Anthropic API: Claude analyzes config]
    ↓ (structured response)
[AuditService: Parse suggestions, calculate score]
    ↓
[Route: Return AuditResult]
    ↓
[Frontend: Display suggestions by severity]
```

### Multi-Node Coordination Flow

```
[Frontend: RemoteSetup.tsx - Multi-node mode]
    ↓ POST /api/remote/multi-setup (with array of hosts)
[Route: remote::multi_node_setup]
    ↓
[Service: RemoteService::coordinate_setup]
    ↓ (parallel SSH connections)
[SshService: Execute on each host concurrently]
    ↓ (tokio::spawn per host)
[Remote VPS 1, 2, 3: Install OpenClaw]
    ↓ (collect results)
[RemoteService: Aggregate status per node]
    ↓
[Route: Return MultiNodeSetupResponse]
    ↓
[Frontend: Display per-node status]
```

## Integration Points with Existing Code

### Existing Services (NO modifications)

| Service | Used By | Keep Unchanged |
|---------|---------|----------------|
| **HealthService** | Dashboard health monitor | Continue using for local gateway health |
| **DaemonService** | Dashboard daemon controls | Keep for local daemon management |
| **ConfigService** | Config editor, import/export | Reuse for reading ~/.openclaw/openclaw.json |
| **SafeCommand** | Installer, daemon, health | Reuse for local shell commands |

### New Services (ADD to services/)

| Service | Dependencies | Integration Point |
|---------|--------------|-------------------|
| **SshService** | openssh crate, SafeCommand | Used by RemoteService, remote routes |
| **RemoteService** | SshService, ConfigService | Coordinates multi-node, uses ConfigService for templates |
| **DockerService** | bollard crate | Standalone, used by docker routes |
| **SkillsService** | reqwest crate | Standalone, used by skills routes |
| **LogStreamService** | tokio::process, mpsc | Used by /ws/logs WebSocket handler |
| **AuditService** | reqwest crate | Standalone, used by audit routes |

### Modified Modules

| Module | Modification | Reason |
|--------|--------------|--------|
| **main.rs** | Add new route handlers for /api/remote/*, /api/docker/*, /api/skills/*, /api/audit/*, /ws/logs | Wire up new endpoints |
| **routes/mod.rs** | Export new route modules (remote, docker, skills, audit) | Module visibility |
| **routes/ws.rs** | Add /ws/logs handler alongside existing /ws install handler | Reuse WebSocket infrastructure |
| **models/types.rs** | Add ts-rs types for new API contracts (Skill, AuditResult, RemoteSetupRequest, etc.) | Type safety across stack |
| **Cargo.toml** | Add dependencies: openssh, bollard, reqwest | New capabilities |
| **package.json** | No changes needed | Frontend dependencies already have what's needed |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **1-5 servers** | Single Axum instance handles all SSH connections, Docker containers run on localhost. SSH connection pool with max 10 connections per host. Log streaming for 1-2 concurrent users. |
| **5-50 servers** | Consider SSH connection pooling with TTL (close idle >5min). Docker containers may need host limits (max 10 containers). Log streaming needs pagination (last 1000 lines) + filtering to reduce bandwidth. AI audit requests should be queued (max 5 concurrent). |
| **50+ servers** | Need distributed architecture: separate API server per geographic region. SSH operations should be async jobs with status polling (not synchronous HTTP). Consider replacing WebSocket log streaming with pull-based API + pagination. Rate limit AI audit to 1 req/min per user. |

### Scaling Priorities

1. **First bottleneck:** SSH connection exhaustion on 10+ concurrent remote operations.
   - **Fix:** Implement connection pooling with LRU eviction, max 5 connections per host.
   - **Alternative:** Queue SSH operations, execute serially per host.

2. **Second bottleneck:** WebSocket log streaming memory usage with 10+ concurrent viewers.
   - **Fix:** Implement ring buffer (last 1000 lines), disconnect idle clients after 10min.
   - **Alternative:** Switch to HTTP polling with pagination instead of streaming.

3. **Third bottleneck:** AI audit API rate limits and costs.
   - **Fix:** Cache audit results per config hash for 1 hour, deduplicate requests.
   - **Alternative:** Implement request queue with rate limiting (1 req/min per user).

## Anti-Patterns

### Anti-Pattern 1: Storing SSH Credentials in Frontend State

**What people do:** Store SSH password or private key in React state, send with every request.

**Why it's wrong:** Credentials visible in DevTools, Redux state, React component tree. Security vulnerability.

**Do this instead:** Store credentials in backend config file (encrypted), or use SSH agent forwarding. Frontend only stores server host/username, backend handles authentication.

### Anti-Pattern 2: Blocking HTTP Endpoints for Long-Running SSH Commands

**What people do:** Execute `ssh user@host 'long-running-install.sh'` in POST /api/remote/setup, block HTTP response until complete.

**Why it's wrong:** HTTP timeout (30-60s), no progress updates, poor UX.

**Do this instead:** Use WebSocket for long-running operations (like existing install flow), or implement async job with status polling endpoint.

### Anti-Pattern 3: Spawning Unbounded Docker Containers

**What people do:** Allow users to create unlimited containers via POST /api/docker/create.

**Why it's wrong:** Resource exhaustion (CPU/memory/disk), Docker daemon crashes.

**Do this instead:** Implement container limit per user (e.g., max 5), check current count before creating, return error if limit exceeded.

### Anti-Pattern 4: Storing API Keys in Frontend Code

**What people do:** Hardcode OpenAI/Claude API key in frontend for audit feature.

**Why it's wrong:** API key exposed in JavaScript bundle, anyone can extract and abuse.

**Do this instead:** Store API key in backend environment variable or config file, frontend calls backend endpoint which proxies to AI API.

### Anti-Pattern 5: No WebSocket Reconnection Logic

**What people do:** Connect WebSocket once in useEffect, no handling for disconnects/network issues.

**Why it's wrong:** Connection drops require page refresh, poor UX for log streaming.

**Do this instead:** Implement exponential backoff reconnection (1s, 2s, 4s, 8s, max 10s), resubscribe to log stream on reconnect.

### Anti-Pattern 6: Mixing Local and Remote Operations Without Clear Distinction

**What people do:** Reuse HealthService for both local and remote health checks without parameter to distinguish.

**Why it's wrong:** Confusing which OpenClaw instance is being checked, potential for SSH command injection if hostname not validated.

**Do this instead:** Create separate RemoteHealthService that explicitly takes host parameter, validates hostname format, uses SshService for execution. Keep HealthService for local-only operations.

## New Routes Summary

### Remote Management Routes

| Method | Path | Handler | Service | Description |
|--------|------|---------|---------|-------------|
| POST | /api/remote/setup | remote::setup_remote_vps | SshService | SSH to remote VPS, run install script |
| POST | /api/remote/multi-setup | remote::multi_node_setup | RemoteService | Coordinate setup across multiple nodes |
| GET | /api/remote/health | remote::remote_health | SshService | Execute health check on remote node |
| POST | /api/remote/daemon/start | remote::start_remote_daemon | SshService | Start daemon on remote node |
| POST | /api/remote/daemon/stop | remote::stop_remote_daemon | SshService | Stop daemon on remote node |

### Docker Management Routes

| Method | Path | Handler | Service | Description |
|--------|------|---------|---------|-------------|
| GET | /api/docker/containers | docker::list_containers | DockerService | List all OpenClaw containers |
| POST | /api/docker/create | docker::create_container | DockerService | Create sandboxed container |
| POST | /api/docker/stop | docker::stop_container | DockerService | Stop running container |
| DELETE | /api/docker/{id} | docker::remove_container | DockerService | Remove container |
| GET | /api/docker/{id}/logs | docker::container_logs | DockerService | Fetch container logs (last N lines) |

### Skills Management Routes

| Method | Path | Handler | Service | Description |
|--------|------|---------|---------|-------------|
| GET | /api/skills/search | skills::search_skills | SkillsService | Search npm for openclaw-skill packages |
| POST | /api/skills/install | skills::install_skill | SkillsService | Install skill via npm |
| GET | /api/skills/installed | skills::list_installed | SkillsService | List globally installed skills |
| DELETE | /api/skills/{name} | skills::uninstall_skill | SkillsService | Uninstall skill via npm |

### Log Streaming Routes

| Method | Path | Handler | Service | Description |
|--------|------|---------|---------|-------------|
| WebSocket | /ws/logs | ws::ws_logs_handler | LogStreamService | Stream daemon or gateway logs in real-time |

### AI Auditing Routes

| Method | Path | Handler | Service | Description |
|--------|------|---------|---------|-------------|
| POST | /api/audit/config | audit::audit_config | AuditService | AI-powered config optimization suggestions |
| POST | /api/audit/security | audit::security_scan | AuditService | AI-powered security scan |

## Build Order Considering Dependencies

### Phase 1: Foundation (Week 1)

1. **Add Cargo dependencies:** openssh, bollard, reqwest, sysinfo (upgrade if needed)
2. **Add new type definitions** to `models/types.rs`:
   - RemoteSetupRequest, RemoteSetupResponse
   - ContainerInfo, DockerCreateRequest
   - Skill, SkillSearchRequest
   - LogStreamParams
   - AuditSuggestion, AuditResult
3. **Implement SshService:** Connection pooling, basic exec method
4. **Add /api/remote/setup route:** Use SshService for single remote install
5. **Test:** SSH to localhost, verify command execution works

### Phase 2: Docker & Skills (Week 2)

6. **Implement DockerService:** Create/list/stop containers using bollard
7. **Add /api/docker/* routes:** CRUD operations for containers
8. **Implement SkillsService:** npm registry search, install/uninstall
9. **Add /api/skills/* routes:** Search and manage skills
10. **Test:** Create container, install skill, verify both work

### Phase 3: Log Streaming (Week 3)

11. **Implement LogStreamService:** Tail logs with subprocess + mpsc
12. **Add /ws/logs WebSocket handler** to routes/ws.rs
13. **Implement frontend useLogStream hook:** WebSocket with reconnection
14. **Implement LogViewer component:** Display streaming logs with filtering
15. **Test:** Stream logs, verify reconnection after disconnect

### Phase 4: AI Auditing (Week 4)

16. **Implement AuditService:** OpenAI/Claude API integration
17. **Add /api/audit/* routes:** Config and security auditing
18. **Implement ConfigAuditor component:** Display suggestions
19. **Test:** Audit sample config, verify suggestions display correctly

### Phase 5: Multi-Node & Dark Mode (Week 5)

20. **Implement RemoteService:** Multi-node coordination using SshService
21. **Add /api/remote/multi-setup route:** Parallel SSH operations
22. **Implement dark mode:** Tailwind v4 custom variant + theme context
23. **Add theme toggle** to dashboard header
24. **Test:** Setup 3 nodes in parallel, toggle dark mode

### Phase 6: Integration & Polish (Week 6)

25. **Integrate control center components** into dashboard layout
26. **Add navigation** between wizard, dashboard, control center
27. **Error handling polish:** Better error messages, retry logic
28. **Documentation:** Update README with new features
29. **End-to-end testing:** Full workflow from wizard → dashboard → control center

## Sources

- [GitHub - jonhoo/async-ssh](https://github.com/jonhoo/async-ssh)
- [openssh - Rust](https://docs.rs/openssh)
- [GitHub - fussybeaver/bollard: Docker daemon API in Rust](https://github.com/fussybeaver/bollard)
- [bollard - Rust](https://docs.rs/bollard)
- [Axum WebSocket documentation](https://docs.rs/axum/latest/axum/extract/ws/index.html)
- [Rust: WebSocket with Axum For RealTime Communications](https://medium.com/@itsuki.enjoy/rust-websocket-with-axum-for-realtime-communications-49a93468268f)
- [How to Use WebSockets in React for Real-Time Applications](https://oneuptime.com/blog/post/2026-01-15-websockets-react-real-time-applications/view)
- [Enhancing WebSocket Reliability in React](https://iamrajatsingh.medium.com/enhancing-websocket-reliability-in-react-a-fallback-mechanism-for-seamless-connectivity-8b2b79659cc0)
- [GitHub - AbdelStark/anthropic-rs](https://github.com/AbdelStark/anthropic-rs)
- [GitHub - jeremychone/rust-genai](https://github.com/jeremychone/rust-genai)
- [Implementing Dark Mode with Tailwind CSS v4 and next-themes](https://jianliao.github.io/blog/tailwindcss-v4)
- [React Dark Mode with Tailwind CSS v4: A Complete Guide](https://kitemetric.com/blogs/effortless-dark-mode-implementation-in-tailwind-css-v4-react)
- [Rust in Distributed Systems, 2025 Edition](https://disant.medium.com/rust-in-distributed-systems-2025-edition-175d95f825d6)
- [paxakos - Rust](https://docs.rs/paxakos/)
- [npm Updates Search Experience](https://socket.dev/blog/npm-updates-search-experience)
- [Sherlock — Rust Security & Auditing Guide 2026](https://sherlock.xyz/post/rust-security-auditing-guide-2026)
- [Rust Auditing Tools in 2025](https://markaicode.com/rust-auditing-tools-2025-automated-security-scanning/)
- [Top 9 Container Orchestration Platforms In 2026](https://www.portainer.io/blog/container-orchestration-platforms)
- [React Admin Dashboard - Best Templates & Frameworks (2026 Guide)](https://refine.dev/blog/react-admin-dashboard/)

---
*Architecture research for: OpenClaw Wizard v1.1 Control Center*
*Researched: 2026-02-14*
