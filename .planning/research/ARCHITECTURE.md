# Architecture Research

**Domain:** Local-first setup wizard (React frontend + Rust backend → Tauri)
**Researched:** 2026-02-14
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      Frontend (React/Next.js)                     │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Wizard  │  │Dashboard │  │  Config  │  │  Channel Mgmt    │ │
│  │  Steps   │  │  Views   │  │  Editor  │  │  (QR, Tokens)    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
│       │             │             │                  │            │
│       └─────────────┴─────────────┴──────────────────┘            │
│                             │                                     │
├─────────────────────────────┼─────────────────────────────────────┤
│                    API Layer / WebSocket                          │
├─────────────────────────────┼─────────────────────────────────────┤
│                             │                                     │
│                      ┌──────┴──────┐                             │
│                      │ Axum Router │                             │
│                      │  (REST API) │                             │
│                      └──────┬──────┘                             │
│       ┌─────────────────────┼─────────────────────┐              │
│       │                     │                     │              │
│  ┌────▼─────┐     ┌─────────▼────────┐     ┌─────▼──────┐       │
│  │ WebSocket│     │  System Services │     │   Config   │       │
│  │ Manager  │     │  (commands, fs,  │     │   Manager  │       │
│  │(real-time│     │   service mgmt)  │     │(read/write)│       │
│  │ updates) │     └──────────────────┘     └────────────┘       │
│  └──────────┘                                                    │
│                   Backend (Rust + Axum)                          │
└──────────────────────────────────────────────────────────────────┘
                             │
                             │
                    ┌────────▼──────────┐
                    │  Host System OS   │
                    │  - Shell (bash)   │
                    │  - File System    │
                    │  - launchd/systemd│
                    │  - Node.js        │
                    └───────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Wizard Steps** | Multi-step form UI, step validation, navigation | React components with useState/useReducer for local state |
| **Dashboard Views** | Real-time health monitoring, service status | React components with WebSocket subscriptions |
| **Config Editor** | Visual JSON editor for openclaw.json | React form components with serde_json validation |
| **Channel Management** | Channel setup, QR display, token input | React components with real-time QR generation (qrcode.react) |
| **Axum Router** | HTTP request routing, static file serving | Axum 0.8.8+ with tower-http ServeDir middleware |
| **WebSocket Manager** | Bidirectional real-time communication | Axum WebSocket extractor with tokio channels |
| **System Services** | Execute shell commands, manage OS services | std::process::Command with tokio::process for async |
| **Config Manager** | Read/write config files with validation | serde_json for parsing, std::fs for file I/O |

## Recommended Project Structure

```
openclaw-wizard/
├── backend/                  # Rust backend (becomes Tauri core)
│   ├── src/
│   │   ├── main.rs           # Entry point: Axum server (web) or Tauri app (desktop)
│   │   ├── config/           # Config file operations
│   │   │   ├── mod.rs
│   │   │   ├── reader.rs     # Read openclaw.json, .env files
│   │   │   └── writer.rs     # Write configs with atomic operations
│   │   ├── system/           # System operations
│   │   │   ├── mod.rs
│   │   │   ├── commands.rs   # Shell command execution
│   │   │   ├── detect.rs     # OS, Node.js, OpenClaw detection
│   │   │   └── services.rs   # launchd/systemd management
│   │   ├── api/              # HTTP API handlers
│   │   │   ├── mod.rs
│   │   │   ├── wizard.rs     # Setup wizard endpoints
│   │   │   ├── health.rs     # Health check endpoints
│   │   │   └── config.rs     # Config CRUD endpoints
│   │   ├── ws/               # WebSocket handlers
│   │   │   ├── mod.rs
│   │   │   └── stream.rs     # Real-time updates (install progress, logs)
│   │   └── models/           # Shared data structures
│   │       ├── mod.rs
│   │       └── types.rs      # Request/Response DTOs
│   ├── Cargo.toml            # Dependencies: axum, tokio, serde, tower-http
│   └── static/               # Built React app (symlinked from frontend/dist)
├── frontend/                 # React/Next.js frontend
│   ├── src/
│   │   ├── app/              # Next.js 13+ app directory
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx      # Landing/home
│   │   │   ├── wizard/       # Multi-step wizard
│   │   │   │   ├── page.tsx
│   │   │   │   └── [step]/   # Dynamic step routes
│   │   │   ├── dashboard/    # Health dashboard
│   │   │   └── config/       # Visual config editor
│   │   ├── components/       # Reusable React components
│   │   │   ├── wizard/
│   │   │   │   ├── StepContainer.tsx
│   │   │   │   ├── StepNavigation.tsx
│   │   │   │   └── ProgressBar.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── StatusCard.tsx
│   │   │   │   └── HealthIndicator.tsx
│   │   │   └── config/
│   │   │       └── JsonEditor.tsx
│   │   ├── lib/              # Client-side utilities
│   │   │   ├── api.ts        # API client (fetch wrappers)
│   │   │   ├── websocket.ts  # WebSocket client
│   │   │   └── types.ts      # TypeScript types (match Rust models)
│   │   └── hooks/            # Custom React hooks
│   │       ├── useWizardState.ts
│   │       └── useWebSocket.ts
│   ├── package.json
│   └── next.config.js        # Output: 'export' for static build
├── tauri/                    # Tauri desktop app (Phase 2)
│   └── (created later, reuses backend/ code)
├── .planning/
│   └── research/
│       └── ARCHITECTURE.md   # This file
└── README.md
```

### Structure Rationale

- **Monorepo with separate backend/frontend**: Clean separation, shared via symlink for static files, easy to split into separate repos later if needed
- **backend/src organized by domain**: `config/`, `system/`, `api/`, `ws/` mirror functional responsibilities, making it clear where to add features
- **frontend follows Next.js 13+ conventions**: App directory for routing, components for reusability, lib for utilities, hooks for stateful logic
- **static/ symlink pattern**: Frontend builds to `frontend/dist`, backend serves from `backend/static/` (symlinked), avoids file copying during development
- **Tauri migration path**: `backend/src/main.rs` uses conditional compilation (`#[cfg(not(feature = "tauri"))]` for Axum server, `#[cfg(feature = "tauri")]` for Tauri app) to share 95% of code

## Architectural Patterns

### Pattern 1: Shared State via TypeScript + Rust Types

**What:** Define data models once in Rust (using serde), generate TypeScript types automatically

**When to use:** All API request/response payloads, configuration structures, wizard state

**Trade-offs:**
- Pros: Single source of truth, compile-time type safety across stack
- Cons: Requires build step to generate TS types (use `ts-rs` crate)

**Example:**
```rust
// backend/src/models/types.rs
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/lib/types/")]
pub struct WizardState {
    pub current_step: u8,
    pub os_detected: String,
    pub node_version: Option<String>,
    pub openclaw_installed: bool,
    pub config_path: Option<String>,
}
```

```typescript
// frontend/src/lib/types/WizardState.ts (auto-generated)
export interface WizardState {
  current_step: number;
  os_detected: string;
  node_version?: string;
  openclaw_installed: boolean;
  config_path?: string;
}
```

### Pattern 2: WebSocket for Real-Time Progress Streaming

**What:** Use WebSocket for bidirectional communication when backend needs to push updates (installation progress, logs, health status changes)

**When to use:** Long-running operations (npm install, service startup), live monitoring (dashboard health checks), streaming command output

**Trade-offs:**
- Pros: Real-time updates without polling, efficient for continuous data streams
- Cons: More complex than REST, requires connection state management

**Example:**
```rust
// backend/src/ws/stream.rs
use axum::extract::ws::{WebSocket, Message};
use tokio::process::Command;
use tokio::io::{BufReader, AsyncBufReadExt};

pub async fn stream_command_output(
    socket: &mut WebSocket,
    command: &str,
    args: &[&str],
) -> Result<(), Box<dyn std::error::Error>> {
    let mut child = Command::new(command)
        .args(args)
        .stdout(std::process::Stdio::piped())
        .spawn()?;

    let stdout = child.stdout.take().unwrap();
    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();

    while let Some(line) = lines.next_line().await? {
        socket.send(Message::Text(line)).await?;
    }

    Ok(())
}
```

```typescript
// frontend/src/hooks/useWebSocket.ts
export function useCommandStream(onLine: (line: string) => void) {
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3030/api/ws/command');

    ws.onmessage = (event) => {
      onLine(event.data);
    };

    return () => ws.close();
  }, [onLine]);
}
```

### Pattern 3: Command Execution with Safety Guards

**What:** Execute shell commands using `std::process::Command` with individual arguments (not shell strings) to prevent injection attacks

**When to use:** All system operations (npm install, node detection, service management)

**Trade-offs:**
- Pros: Secure by default (no shell interpretation), explicit argument handling
- Cons: Cannot use shell features (pipes, redirects) directly — must compose in Rust

**Example:**
```rust
// backend/src/system/commands.rs
use std::process::Command;
use std::ffi::OsStr;

pub fn run_npm_install(package: &str) -> Result<String, String> {
    // SAFE: Each argument passed separately, no shell interpretation
    let output = Command::new("npm")
        .arg("install")
        .arg("-g")
        .arg(package)  // User input here is safe
        .output()
        .map_err(|e| format!("Failed to execute npm: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// UNSAFE - DO NOT DO THIS:
// Command::new("sh").arg("-c").arg(format!("npm install -g {}", package))
// This allows shell injection if package contains "; rm -rf /"
```

### Pattern 4: Atomic Config File Writes

**What:** Write to a temporary file first, then atomically rename to target path to prevent corruption

**When to use:** All config file writes (openclaw.json, .env files)

**Trade-offs:**
- Pros: Prevents partial writes on crash/interrupt, ensures valid JSON on disk
- Cons: Slightly more complex than direct writes

**Example:**
```rust
// backend/src/config/writer.rs
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use serde::Serialize;

pub fn write_config<T: Serialize>(path: &Path, data: &T) -> Result<(), Box<dyn std::error::Error>> {
    let json = serde_json::to_string_pretty(data)?;

    // Write to temp file first
    let temp_path = path.with_extension("tmp");
    let mut file = File::create(&temp_path)?;
    file.write_all(json.as_bytes())?;
    file.sync_all()?;  // Ensure data written to disk

    // Atomic rename (POSIX guarantees atomicity)
    fs::rename(&temp_path, path)?;

    Ok(())
}
```

### Pattern 5: Service Management Abstraction

**What:** Abstract over platform-specific service managers (launchd on macOS, systemd on Linux) with a common interface

**When to use:** Daemon installation, start/stop/restart operations

**Trade-offs:**
- Pros: Cross-platform code reuse, single API for frontend
- Cons: Platform-specific testing required, may miss platform-specific features

**Example:**
```rust
// backend/src/system/services.rs
use std::process::Command;

pub trait ServiceManager {
    fn install(&self, service_name: &str, config: &str) -> Result<(), String>;
    fn start(&self, service_name: &str) -> Result<(), String>;
    fn stop(&self, service_name: &str) -> Result<(), String>;
    fn status(&self, service_name: &str) -> Result<String, String>;
}

pub struct LaunchdManager;

impl ServiceManager for LaunchdManager {
    fn start(&self, service_name: &str) -> Result<(), String> {
        let output = Command::new("launchctl")
            .arg("start")
            .arg(service_name)
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
    // ... other methods
}

pub struct SystemdManager;

impl ServiceManager for SystemdManager {
    fn start(&self, service_name: &str) -> Result<(), String> {
        let output = Command::new("systemctl")
            .arg("--user")
            .arg("start")
            .arg(service_name)
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
    // ... other methods
}

#[cfg(target_os = "macos")]
pub fn get_service_manager() -> Box<dyn ServiceManager> {
    Box::new(LaunchdManager)
}

#[cfg(target_os = "linux")]
pub fn get_service_manager() -> Box<dyn ServiceManager> {
    Box::new(SystemdManager)
}
```

## Data Flow

### Request Flow (REST API)

```
[User Action in UI]
    ↓
[React Component] → onClick/onSubmit
    ↓
[API Client (fetch)] → POST /api/wizard/step
    ↓
[Axum Router] → Route to handler
    ↓
[API Handler] → Validate request, call system service
    ↓
[System Service] → Execute operation (read file, run command)
    ↓
[Response] ← Success/Error with typed payload
    ↓
[React Component] ← Update UI state
```

### Event Flow (WebSocket)

```
[Backend Event] (e.g., npm install progress)
    ↓
[System Service] → Spawn async task
    ↓
[tokio::process] → Read stdout line-by-line
    ↓
[WebSocket Handler] → Broadcast to connected clients
    ↓
[Frontend WebSocket Hook] → Receive message
    ↓
[React Component] ← Update UI (append log line, update progress)
```

### State Management Flow

```
[Wizard State]
    ↓ (initialize)
[React Hook (useWizardState)] → useState/useReducer
    ↓ (user interacts)
[Step Component] → Validate current step
    ↓ (on next)
[API Call] → POST /api/wizard/validate-step
    ↓ (success)
[Update Local State] → Move to next step
    ↓ (on complete)
[API Call] → POST /api/wizard/finalize
    ↓ (triggers)
[Backend Operations] → Write configs, install daemon
    ↓ (stream progress)
[WebSocket] → Real-time updates to UI
```

### Key Data Flows

1. **Wizard Step Progression:** Frontend validates input → POST to backend → Backend performs validation/detection → Returns next step data → Frontend advances
2. **Installation Progress:** Frontend initiates install → Backend spawns async process → Streams stdout via WebSocket → Frontend displays real-time logs
3. **Config Editing:** Frontend loads config via GET → User edits in UI → Frontend validates JSON → POST to backend → Backend writes atomically
4. **Health Monitoring:** WebSocket connection established → Backend polls services every 5s → Emits status updates → Frontend updates dashboard in real-time

## Migration Path: Web → Tauri

### Phase 1: Web App (Axum Server)

```rust
// backend/src/main.rs
#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/api/wizard/*path", get(wizard_handler))
        .nest_service("/", ServeDir::new("static"));

    axum::Server::bind(&"127.0.0.1:3030".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
```

### Phase 2: Tauri Desktop App

```rust
// backend/src/main.rs (same file, conditional compilation)
#[cfg(feature = "tauri")]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            wizard_detect_system,
            wizard_install_node,
            config_read,
            config_write,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Commands are the same functions called by Axum handlers
#[tauri::command]
async fn wizard_detect_system() -> Result<WizardState, String> {
    // Reuse existing detection logic
    crate::system::detect::detect_environment().await
}
```

### Migration Strategy

1. **Shared Core Logic:** All business logic lives in `backend/src/{config, system}/` modules, used by both Axum handlers and Tauri commands
2. **Thin Handlers:** Axum handlers and Tauri commands are thin wrappers that call shared functions
3. **WebSocket → Tauri Events:** WebSocket streaming in web app becomes Tauri event emitter in desktop app (similar API)
4. **Static Serving → Embedded:** Axum serves from `static/` directory, Tauri embeds assets at compile time
5. **Feature Flags:** Use `#[cfg(feature = "tauri")]` to conditionally compile for web or desktop

**Code Reuse:** ~95% of backend code shared, 100% of frontend code shared (React runs in WebView)

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user (MVP) | Current architecture is sufficient — Axum handles 10K+ req/s, WebSocket supports dozens of concurrent connections |
| Hundreds of users (SaaS pivot?) | Add connection pooling for WebSockets, consider Redis for session state if distributed |
| Desktop app (Tauri) | No scaling concerns — single-user local execution |

### Scaling Priorities

1. **First bottleneck:** WebSocket connection limits (unlikely with single-user local app)
   - **Fix:** If SaaS pivot, use Redis Pub/Sub for distributed WebSocket messages
2. **Second bottleneck:** Long-running command execution blocking the API
   - **Fix:** Already addressed — tokio async execution with streaming output

**Reality Check:** This is a local-first, single-user tool. Scaling is not a concern for MVP. Architecture optimizes for developer experience (clear separation, easy migration to Tauri) over distributed systems complexity.

## Anti-Patterns

### Anti-Pattern 1: Embedding Frontend Build in Rust Binary with rust-embed

**What people do:** Use `rust-embed` crate to embed entire React build into the Rust binary for easier distribution

**Why it's wrong:**
- Makes development iteration slow (full Rust rebuild on every frontend change)
- Increases binary size significantly (multi-MB React build embedded)
- Defeats hot-reload in development
- Only makes sense for final Tauri desktop build, not web development

**Do this instead:**
- Development: Axum serves from `static/` directory (symlinked to `frontend/dist`)
- Production Web: Serve from `static/` directory with nginx or Axum
- Production Tauri: Tauri handles embedding automatically via `tauri.conf.json`

### Anti-Pattern 2: Using Shell Strings for Commands

**What people do:** Concatenate user input into shell command strings

```rust
// UNSAFE - DO NOT DO THIS
let command = format!("npm install -g {}", package_name);
Command::new("sh").arg("-c").arg(&command).output()?;
```

**Why it's wrong:** Shell injection vulnerability if `package_name` contains `; rm -rf /` or similar

**Do this instead:** Use individual arguments with `Command::arg()`

```rust
// SAFE
Command::new("npm")
    .arg("install")
    .arg("-g")
    .arg(package_name)  // No shell interpretation
    .output()?;
```

### Anti-Pattern 3: Direct File Writes for Configs

**What people do:** Write directly to config file path

```rust
// RISKY
let json = serde_json::to_string(&config)?;
fs::write(config_path, json)?;  // Can corrupt on crash/interrupt
```

**Why it's wrong:** If process crashes/interrupted mid-write, config file is corrupted (partial JSON)

**Do this instead:** Write to temp file, then atomic rename

```rust
// SAFE
let temp = config_path.with_extension("tmp");
fs::write(&temp, json)?;
fs::rename(temp, config_path)?;  // Atomic on POSIX
```

### Anti-Pattern 4: Polling for Real-Time Updates

**What people do:** Frontend polls API endpoint every 1-5 seconds for status updates

**Why it's wrong:**
- Wastes bandwidth and CPU (polling when nothing changed)
- Introduces latency (up to poll interval)
- Poor UX for real-time progress (chunky updates)

**Do this instead:** Use WebSocket for push-based updates

```typescript
// Polling (BAD)
setInterval(() => {
  fetch('/api/status').then(r => r.json()).then(updateUI);
}, 2000);

// WebSocket (GOOD)
const ws = new WebSocket('ws://localhost:3030/api/ws/status');
ws.onmessage = (event) => updateUI(JSON.parse(event.data));
```

### Anti-Pattern 5: Divergent Frontend/Backend Types

**What people do:** Manually write TypeScript types that mirror Rust structs

**Why it's wrong:**
- Types drift over time (add field in Rust, forget to update TypeScript)
- No compile-time validation of API contract
- Leads to runtime errors from type mismatches

**Do this instead:** Auto-generate TypeScript types from Rust using `ts-rs`

```rust
// Rust source of truth
#[derive(Serialize, Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/lib/types/")]
pub struct Config {
    pub port: u16,
    pub api_key: String,
}
```

```typescript
// Auto-generated TypeScript (never edit manually)
export interface Config {
  port: number;
  api_key: string;
}
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenClaw npm package | Shell command execution | Use `npm install -g openclaw`, `openclaw onboard --help` |
| Node.js | Version detection + installation | Detect via `node --version`, guide user to install if missing |
| Anthropic/OpenAI APIs | Key validation | POST to API with test prompt to validate key before saving |
| WhatsApp Web | QR code generation | Generate QR from pairing code, display in UI, poll for connection status |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend ↔ Backend | HTTP REST + WebSocket | REST for request/response, WebSocket for real-time streams |
| Axum Router ↔ System Services | Direct function calls | All business logic in `system/` modules, handlers are thin wrappers |
| Config Manager ↔ File System | std::fs with atomic writes | Use temp file + rename pattern for safety |
| Backend ↔ OS Services | std::process::Command | Individual args (not shell strings) for security |

## Build Order Implications

Based on component dependencies, recommended build sequence:

### Phase 0: Foundation (Week 1)
1. **Backend scaffolding:** Axum router, static file serving
2. **Frontend scaffolding:** Next.js with basic layout
3. **Type generation:** Set up `ts-rs` pipeline (Rust → TypeScript)

### Phase 1: Detection (Week 2)
1. **System detection module:** OS, Node.js, OpenClaw detection
2. **Detection API endpoints:** GET `/api/system/detect`
3. **Detection UI:** Display detected environment in React

### Phase 2: Wizard Core (Week 3-4)
1. **Config module:** Read/write with atomic operations
2. **Wizard API:** POST `/api/wizard/step`, validation logic
3. **Wizard UI:** Multi-step form with navigation

### Phase 3: Real-Time Operations (Week 5-6)
1. **Command execution module:** Async process spawning
2. **WebSocket handler:** Stream command output
3. **WebSocket UI hook:** useCommandStream, log display

### Phase 4: Service Management (Week 7)
1. **Service manager abstraction:** launchd/systemd trait
2. **Service API:** POST `/api/services/{start,stop,status}`
3. **Dashboard UI:** Service status cards

### Phase 5: Channel Setup (Week 8-9)
1. **Channel modules:** WhatsApp QR, Telegram token, etc.
2. **Channel APIs:** GET/POST endpoints per channel
3. **Channel UIs:** QR display, token input forms

### Phase 6: Config Editor (Week 10)
1. **Config editor API:** GET/PUT `/api/config`
2. **Visual editor UI:** JSON editor with validation

### Phase 7: Tauri Migration (Week 11-12)
1. **Tauri setup:** `tauri init` in `tauri/` directory
2. **Command migration:** Convert Axum handlers to `#[tauri::command]`
3. **Event migration:** WebSocket → Tauri event emitter
4. **Build pipeline:** `tauri build` for desktop artifacts

**Critical Dependencies:**
- Type generation must be first (shared types across stack)
- Detection before wizard (wizard needs detection data)
- Config module before all write operations
- WebSocket handler before real-time features
- Service management before daemon install

## Sources

### Framework Selection
- [Rust Web Frameworks in 2026: Axum vs Actix Web](https://aarambhdevhub.medium.com/rust-web-frameworks-in-2026-axum-vs-actix-web-vs-rocket-vs-warp-vs-salvo-which-one-should-you-2db3792c79a2)
- [Rust Backend, React Frontend: Modern Web Architecture Tutorial for 2025](https://markaicode.com/rust-react-web-architecture-tutorial-2025/)
- [Rust + Yew + Axum + Tauri full-stack example](https://github.com/jetli/rust-yew-axum-tauri-desktop)

### Tauri Architecture
- [Tauri Architecture (Official)](https://v2.tauri.app/concept/architecture/)
- [Tauri WebSocket Plugin](https://v2.tauri.app/plugin/websocket/)
- [Build a Cross-Platform Desktop App in Rust: Tauri 2.0, SQLite, Axum](https://ritik-chopra28.medium.com/build-a-cross-platform-desktop-app-in-rust-tauri-2-0-sqlite-axum-2b9b7b732e0d)

### Security & Commands
- [Securing Rust Apps: Command Injection Prevention](https://www.stackhawk.com/blog/rust-command-injection-examples-and-prevention/)
- [Command in std::process - Rust](https://doc.rust-lang.org/std/process/struct.Command.html)

### Real-Time Communication
- [Rust: WebSocket with Axum For RealTime Communications](https://medium.com/@itsuki.enjoy/rust-websocket-with-axum-for-realtime-communications-49a93468268f)
- [Building Real-Time Applications with WebSockets and Server-Sent Events in Rust](https://dasroot.net/posts/2025/12/building-real-time-applications-with/)
- [Mastering Tokio Streams](https://medium.com/@Murtza/mastering-tokio-streams-a-comprehensive-guide-to-asynchronous-sequences-in-rust-3835d517a64e)
- [tokio::process - Rust](https://docs.rs/tokio/latest/tokio/process/index.html)

### Static File Serving
- [Using Rust Backend To Serve An SPA](https://nguyenhuythanh.com/posts/rust-backend-spa/)
- [Serving static files - Rust Full Stack Workshop](https://bcnrust.github.io/devbcn-workshop/backend/24_serving_static_files.html)

### Service Management
- [service-manager - crates.io](https://crates.io/crates/service-manager)
- [service-manager-rs GitHub](https://github.com/chipsenkbeil/service-manager-rs)

### State Management & React
- [State Management in 2026: Redux, Context API, and Modern Patterns](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns/)
- [React: Building a Multi-Step Form with Wizard Pattern](https://medium.com/@vandanpatel29122001/react-building-a-multi-step-form-with-wizard-pattern-85edec21f793)

### Config Management
- [serde_json - Rust](https://docs.rs/serde_json)
- [Error handling · Serde](https://serde.rs/error-handling.html)

### QR Code Generation
- [qrcode.react - npm](https://www.npmjs.com/package/qrcode.react)
- [react-qr-code - npm](https://www.npmjs.com/package/react-qr-code)

---
*Architecture research for: OpenClaw Wizard*
*Researched: 2026-02-14*
