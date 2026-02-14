# Stack Research

**Domain:** Local-first Setup Wizard + Management Dashboard (Web App → Tauri Desktop)
**Researched:** 2026-02-14
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2.4 | Frontend UI framework | Industry standard for interactive UIs. React 19 stable as of Dec 2024, with improved error handling and Server Actions support. Latest patch (19.2.4, Jan 2026) includes DoS mitigations for production apps. |
| Vite | 6.x | Build tool and dev server | Replaced Create React App as primary choice for React projects. Near-instant HMR (<300ms), native ES modules, zero-config setup. Vite 6 released with expanded APIs and polished ecosystem integration. |
| Axum | 0.8.8 | Rust web framework (backend) | Part of Tokio ecosystem, ergonomic and modular. Latest release (Jan 2026) provides 20% lower latency vs previous versions. Better for local servers than Actix (simpler API, lower memory usage, Tower middleware integration). Actix has 10-15% higher raw throughput but steeper learning curve. |
| TypeScript | 5.x | Type safety for frontend | De facto standard for production React apps. Provides compile-time safety, better DX, and API contracts between Rust backend and React frontend. |
| Tauri | 2.x | Desktop conversion framework | Builds tiny, fast native binaries for desktop (vs Electron bloat). React fully supported. Tauri 2.0 stable with mobile support, improved permissions system, and cleaner migration path from web apps. |
| Tokio | 1.47.x | Async runtime for Rust | Powers Axum. LTS releases: 1.43.x (until March 2026), 1.47.x (until Sep 2026). Industry-standard async runtime with hyper HTTP stack. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack Query | 5.x | Server state management | Automatic caching, background refetching, stale-while-revalidate. Handles 80% of app data in modern setups. Use for all API calls to Rust backend. |
| Zustand | 4.x | Client state management | Lightweight global state (wizard progress, UI state). Use for client-only state that doesn't come from server. Complements TanStack Query. |
| React Router | 7.x | SPA routing | v7 supports both library mode (SPA) and framework mode (SSR). Use SPA mode (ssr: false) for local web app. Clean migration to framework features if needed later. |
| Shadcn/ui | Latest | UI component library | Copy-paste components built on Radix UI + Tailwind. You own the code, full customization. Updated for Tailwind v4 and React 19. Accessibility built-in. Better than component packages for custom wizard UIs. |
| Tailwind CSS | 4.x | Utility-first CSS framework | Shadcn/ui dependency. Tailwind v4 uses @theme directive, improved OKLCH colors. Standard for modern React apps. |
| serde | 1.0 | Rust serialization/deserialization | Core dependency for JSON API, TOML config files. Standard Rust serialization with derive macros. |
| serde_json | 1.0 | JSON support for serde | API communication between Axum and React. Handles all request/response serialization. |
| tokio-serde | Latest | Async serde for Tokio | Frame serialization for Tokio transports. Use with Axum for async JSON handling. |
| ts-rs | 7.1+ | TypeScript types from Rust | Auto-generate TypeScript types from Rust structs/enums. Maintains type safety across backend-frontend boundary. Use #[ts(export)] on API types. |
| anyhow | 1.x | Application error handling | Use in main.rs and top-level application code. Flexible error type with context chaining. Better error messages for users. |
| thiserror | 1.x | Library error handling | Use in internal Rust modules/libraries. Define custom error types with minimal boilerplate. Provides type-specific error handling. |
| tower-http | Latest | HTTP middleware for Axum | CORS, compression, request logging. Part of Tower ecosystem, integrates seamlessly with Axum. |
| confique | Latest | Configuration management | Type-safe, layered config loading. Supports TOML files, environment variables, system-wide configs. Built on serde. Better than manual TOML parsing. |
| service-manager | Latest | Cross-platform daemon management | Detect and use platform service manager (systemd, launchd, etc). Install, uninstall, start, stop services. Use for managing OpenClaw daemon. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | React component testing | Recommended for component testing with Browser Mode. Faster than Jest, better Vite integration. Use with React Testing Library. |
| React Testing Library | Component testing methodology | Test behavior, not implementation. Focus on user interactions via getByRole queries. Industry best practice. |
| ESLint | JavaScript/TypeScript linting | Included in Vite React template. Configure for React 19 best practices. |
| Prettier | Code formatting | Auto-format on save. Reduces bike-shedding. |
| cargo-watch | Rust auto-rebuild | Run cargo watch -x run during development for auto-reload on Rust changes. |
| cargo test | Rust testing | Built-in test framework. Use for Rust backend logic, system operations. |

---

## v1.1 Feature Additions: Control Center Capabilities

**Added:** 2026-02-14
**Confidence:** MEDIUM

This section covers stack additions for v1.1 milestone: SSH remote setup, Docker sandboxing, skills management, log streaming, AI-powered config/security auditing, and dark mode.

### New Rust Crates (v1.1)

| Crate | Version | Purpose | Why Recommended |
|-------|---------|---------|-----------------|
| `async-ssh2-tokio` | 0.9.1 | SSH client operations | High-level async wrapper over russh. Integrates with existing Tokio runtime. Enables remote VPS command execution for SSH setup mode. Simpler API than low-level russh. |
| `russh` | 0.54.6 | Low-level SSH protocol | Pure Rust SSH2 implementation used by async-ssh2-tokio. Add directly only if you need SFTP (via russh-sftp 2.1.1) or lower-level control. |
| `bollard` | 0.19.2 | Docker daemon API client | Industry standard for Docker operations in Rust. Async/await with Tokio, supports all Docker operations for containerized setup. Latest version uses moby API 1.49. Mature, actively maintained. |
| `linemux` | 0.3.0 | Async log file tailing | Multiplexed asynchronous tailing for log files. Built on notify for file watching. Handles non-existent files gracefully. Purpose-built for streaming daemon/gateway logs. |
| `async-openai` | 0.30.1 | OpenAI API client | Most mature unofficial Rust client for OpenAI. Full async support, streaming responses, SSE handling. For AI-powered config auditing if using OpenAI models. |

### New React Libraries (v1.1)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@melloware/react-logviewer` | 6.3.4 | Log viewing component | React component for lazy-loading remote logs. Supports ANSI highlighting, WebSocket/EventSource/URL streaming. Use for log viewer feature. Actively maintained (last update 4 months ago). |
| `xterm.js` + React wrapper | 5.x (core) | Terminal emulation | ONLY if you need interactive terminal output for SSH commands. Core xterm.js is standard web terminal. Use `@pablo-lion/xterm-react` (1.1.2) wrapper or build custom. Most wrappers lightly maintained. |

### Optional Crates (v1.1 Conditional)

| Crate | Version | Purpose | When to Use |
|-------|---------|---------|-------------|
| `russh-sftp` | 2.1.1 | SFTP file transfers | Add if remote setup needs file transfers beyond SSH command execution. SFTP subsystem for russh. |
| `anthropic` | Check crates.io | Claude API client | If using Anthropic Claude for AI auditing instead of OpenAI. Multiple unofficial clients: `clust`, `anthropic-rs`, `misanthropy`. Evaluate based on async support. |
| `genai` | Check crates.io | Multi-provider AI client | If you want flexibility to support OpenAI, Anthropic, Ollama, Gemini, etc. Adds abstraction layer but enables provider swapping. |

### Dark Mode Implementation (v1.1)

**Approach:** CSS Variables + React Context API + Tailwind v4 Selector Strategy

| Technology | Purpose | Why This Approach |
|------------|---------|-------------------|
| Tailwind v4 dark mode | CSS framework dark mode | Built-in selector strategy (class-based). Apply `dark` class to root element. Use `dark:` prefix for dark-specific utilities. |
| React Context API | Theme state management | Global theme state accessible to all components. No external dependency needed. |
| `useLocalStorage` hook | Persist theme preference | Custom hook or usehooks-ts library. Sync theme state with localStorage to prevent reset on reload. |
| `prefers-color-scheme` | Respect system preference | CSS media query to detect system dark mode. Initialize theme from system if no user preference stored. |

**Pattern:**
```typescript
// Custom hook approach (no dependencies)
const [isDark, setIsDark] = useState(() => {
  const stored = localStorage.getItem('theme');
  if (stored) return stored === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
});

useEffect(() => {
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}, [isDark]);
```

## Installation (v1.1 Additions)

### Rust Dependencies

```toml
# Add to Cargo.toml [dependencies]

# SSH remote operations
async-ssh2-tokio = "0.9"

# Docker operations
bollard = "0.19"

# Log streaming
linemux = "0.3"

# AI integration (choose based on provider)
async-openai = "0.30"  # For OpenAI
# OR
# [Check crates.io for latest anthropic/genai versions]

# Optional: SFTP if needed
# russh-sftp = "2.1"
```

### React Dependencies

```bash
# Log viewer
npm install @melloware/react-logviewer

# Optional: Terminal emulation (only if needed)
# npm install xterm @pablo-lion/xterm-react
```

## Integration Patterns (v1.1)

### SSH Operations with Axum

```rust
use async_ssh2_tokio::{Client, AuthMethod, ServerCheckMethod};
use axum::{Router, routing::post, Json};

async fn ssh_setup_handler(
    Json(payload): Json<SshSetupRequest>
) -> Result<Json<SshSetupResponse>, StatusCode> {
    // Use key-based auth in production (not password)
    let auth = AuthMethod::with_password(&payload.username, &payload.password);

    // IMPORTANT: Use proper host key verification in production
    // ServerCheckMethod::DefaultFile reads from ~/.ssh/known_hosts
    let client = Client::connect(
        (payload.host.as_str(), payload.port),
        &payload.username,
        auth,
        ServerCheckMethod::NoCheck, // ONLY for testing! Use DefaultFile in prod
    ).await?;

    let result = client.execute(&payload.command).await?;

    // Stream output via existing WebSocket infrastructure
    Ok(Json(SshSetupResponse {
        stdout: result.stdout,
        stderr: result.stderr,
        exit_code: result.exit_status
    }))
}
```

### Docker Operations

```rust
use bollard::Docker;
use bollard::container::{CreateContainerOptions, Config};

async fn create_docker_container(
    name: &str,
    image: &str
) -> Result<String, bollard::errors::Error> {
    let docker = Docker::connect_with_socket_defaults()?;

    let options = CreateContainerOptions {
        name,
        platform: None,
    };

    let config = Config {
        image: Some(image),
        // Add resource limits, port mappings, volumes, etc.
        ..Default::default()
    };

    let container = docker.create_container(Some(options), config).await?;
    Ok(container.id)
}
```

### Log Streaming with linemux

```rust
use linemux::MuxedLines;

async fn stream_log_file(path: PathBuf) -> Result<impl Stream<Item = String>> {
    let mut lines = MuxedLines::new()?;
    lines.add_file(&path).await?;

    // Returns async stream compatible with Axum WebSocket
    Ok(lines.map(|line| line.unwrap().line().to_string()))
}
```

### React Log Viewer Component

```typescript
import LogViewer from '@melloware/react-logviewer';

function LogStreamViewer({ logSource }: { logSource: string }) {
  // Use existing WebSocket connection from v1.0
  const wsUrl = `ws://localhost:8080/api/logs/stream?source=${logSource}`;

  return (
    <LogViewer
      stream={wsUrl}
      height="600px"
      hasLineNumbers={true}
      enableSearch={true}
      theme="dark"  // or controlled by dark mode state
    />
  );
}
```

### AI Config Auditor (OpenAI Example)

```rust
use async_openai::{Client, types::{CreateChatCompletionRequestArgs, ChatCompletionRequestMessage}};

async fn audit_config(config_content: &str) -> Result<String, Error> {
    let client = Client::new();

    let messages = vec![
        ChatCompletionRequestMessage::System {
            content: "You are an OpenClaw config auditor...".to_string(),
        },
        ChatCompletionRequestMessage::User {
            content: format!("Audit this config:\n\n{}", config_content),
        },
    ];

    let request = CreateChatCompletionRequestArgs::default()
        .model("gpt-4")
        .messages(messages)
        .build()?;

    let response = client.chat().create(request).await?;
    Ok(response.choices[0].message.content.clone())
}
```

## Alternatives Considered (v1.1)

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| async-ssh2-tokio | ssh2 (libssh2 bindings) | Use ssh2 if you need battle-tested C library bindings. Trade-off: less Rust-native, more complex async usage. async-ssh2-tokio wraps russh (pure Rust). |
| bollard | shiplift | AVOID: Shiplift is older and less maintained. Bollard is the clear winner for Docker operations. |
| linemux | tailf (system tail wrapper) | Use tailf if you want to delegate to system utilities. Trade-off: less cross-platform (requires tail binary), less control over buffering. |
| async-openai | Raw reqwest calls | Use raw reqwest for minimal dependencies or highly custom error handling. Trade-off: lose streaming helpers, response parsing, type safety. |
| @melloware/react-logviewer | console-feed | Use console-feed if logs are console.log output in browser. Not suitable for remote log files. |
| @melloware/react-logviewer | Custom component | Build custom if you need very specific UX or want to avoid dependencies. Trade-off: more dev time. |
| Tailwind dark mode | styled-components theming | AVOID: Unnecessary dependency. Tailwind v4 has built-in dark mode that's simpler and faster. |

## What NOT to Use (v1.1)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| thrussh | Renamed to russh. Original unmaintained. | russh 0.54.6 (modern fork) |
| boondock | Deprecated Docker client, unmaintained. | bollard 0.19.2 |
| terminal-in-react | 5+ years old, unmaintained, doesn't support React 19. | xterm.js with custom wrapper or @pablo-lion/xterm-react |
| react-lazylog | 5 years old, unmaintained. | @melloware/react-logviewer 6.3.4 |
| xterm-for-react | 5 years old, unmaintained (last update 2019). | @pablo-lion/xterm-react (more recent) or custom xterm.js wrapper |
| Synchronous SSH libraries | Blocks Tokio async runtime, defeats purpose of Axum's async model. | async-ssh2-tokio or russh with async |
| styled-components for dark mode | Adds 13KB+ dependency, slower runtime theming vs CSS variables. | Tailwind v4 dark mode + CSS variables |

## Version Compatibility (v1.1 Additions)

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| async-ssh2-tokio 0.9.x | Tokio 1.x | Works with existing Tokio runtime (Axum 0.8 uses Tokio 1.47.x). Fully async. |
| bollard 0.19.x | Tokio 1.x, hyper 1.x | Compatible with Axum 0.8's Tokio/Hyper stack. Uses same async runtime. |
| linemux 0.3.x | Tokio 1.x | Async runtime compatible. Built on notify crate for file watching. |
| async-openai 0.30.x | Tokio 1.x, reqwest 0.12.x | Fully async with existing runtime. Supports streaming responses. |
| @melloware/react-logviewer 6.3.x | React 18+ | Forward compatible with React 19. Uses standard React hooks. |
| xterm.js 5.x | All modern browsers | No React version dependency. Wrappers may have React version requirements (check before adding). |

## Security Considerations (v1.1)

### SSH Operations
**Critical:** Do NOT use `ServerCheckMethod::NoCheck` in production.

```rust
// Production-ready SSH connection
let auth = AuthMethod::with_key_file(
    &username,
    &key_path,
    Some(&passphrase)  // Optional, for encrypted keys
);

let client = Client::connect(
    (host, port),
    &username,
    auth,
    ServerCheckMethod::DefaultFile,  // Uses ~/.ssh/known_hosts
).await?;
```

**Best Practices:**
- Prefer key-based authentication over passwords
- Validate host keys against known_hosts
- Never store SSH credentials in localStorage or config files
- Use environment variables or OS keychain for sensitive data
- Implement connection timeouts to prevent hanging
- Sanitize command inputs to prevent injection attacks

### Docker Operations
**Security Concerns:**
- Validate Docker socket permissions (requires root or docker group)
- Sanitize container names and commands from user input
- Implement resource limits (CPU, memory, disk) on containers
- Use read-only filesystems where possible
- Avoid running containers as root

```rust
let config = Config {
    image: Some(image),
    host_config: Some(HostConfig {
        memory: Some(512 * 1024 * 1024),  // 512MB limit
        cpu_quota: Some(50000),  // 50% of one CPU
        readonly_rootfs: Some(true),
        ..Default::default()
    }),
    user: Some("nobody"),  // Non-root user
    ..Default::default()
};
```

### AI API Integration
**Security Best Practices:**
- Store API keys in environment variables, NEVER in config files or code
- Implement rate limiting for AI audit requests (cost control)
- Validate and sanitize config content before sending to AI
- Consider cost implications (streaming can be expensive)
- Set max token limits on requests
- Handle API errors gracefully (don't expose keys in error messages)

```rust
// Load API key from environment
let api_key = std::env::var("OPENAI_API_KEY")
    .expect("OPENAI_API_KEY environment variable not set");

let client = Client::new()
    .with_api_key(api_key);
```

### Log Streaming
**Security Considerations:**
- Validate log file paths to prevent directory traversal
- Implement access controls (don't expose system logs to unauthorized users)
- Filter sensitive data from logs before streaming (API keys, passwords)
- Use WebSocket authentication for log streams
- Limit log file sizes to prevent DoS (linemux handles this well)

## Performance Considerations (v1.1)

### Log Streaming
- **Buffer Sizes:** Configure linemux buffer sizes for large log files
- **Backpressure:** Implement WebSocket backpressure if frontend can't keep up with log stream
- **Pagination:** For historical logs, use react-logviewer's lazy loading (only loads visible lines)
- **File Watching:** linemux uses notify for efficient file watching (no polling)

### SSH Connections
- **Connection Pooling:** Reuse SSH connections where possible (expensive to establish)
- **Timeouts:** Implement command timeouts to prevent hanging
- **Channels:** Use SSH channels for multiple commands over single connection (reduces overhead)
- **Cleanup:** Always disconnect when done to free resources

```rust
// Execute multiple commands over single connection
let result1 = client.execute("command1").await?;
let result2 = client.execute("command2").await?;
client.close().await?;  // Clean disconnect
```

### Docker Operations
- **Streaming APIs:** Use bollard's streaming for long operations (build, pull, logs)
- **Resource Cleanup:** Always remove containers/networks when done
- **Connection Limits:** Docker socket has connection limits (consider pooling for multi-node)
- **Image Caching:** Reuse base images to reduce pull times

### AI Requests
- **Streaming Responses:** Use streaming for faster perceived performance (display tokens as they arrive)
- **Caching:** Cache audit results for identical configs (use config hash as key)
- **Rate Limiting:** Implement client-side rate limiting to avoid API quota exhaustion
- **Timeouts:** Set reasonable timeouts (AI requests can be slow)

## Dark Mode Best Practices (v1.1)

### Implementation Checklist
- [x] Respect system preference on first load (`prefers-color-scheme`)
- [x] Persist user choice to localStorage (override system preference)
- [x] Add smooth CSS transitions between themes
- [x] Test all UI components in both light and dark modes
- [x] Ensure WCAG contrast ratios in both modes (4.5:1 for text)
- [x] Provide visible theme toggle button (icon + accessible label)

### CSS Pattern
```css
/* Smooth theme transitions */
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* Tailwind v4 approach: use dark: prefix */
.card {
  @apply bg-white dark:bg-gray-900 text-black dark:text-white;
}

/* OR CSS variables approach */
:root {
  --bg-primary: #ffffff;
  --text-primary: #000000;
}

.dark {
  --bg-primary: #1a1a1a;
  --text-primary: #ffffff;
}

.card {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
```

### Testing Dark Mode
- Test in system light mode with toggle
- Test in system dark mode with toggle
- Test with system preference change while app running
- Test localStorage persistence across sessions
- Verify no flash of wrong theme on page load (FOUC prevention)

## Open Questions (v1.1)

### 1. AI Provider Choice
**Question:** OpenAI, Anthropic Claude, or multi-provider support?

**Options:**
- **OpenAI (async-openai 0.30.1):** Most mature Rust client, full streaming support
- **Anthropic Claude:** Multiple unofficial clients, evaluate async support and maintenance
- **Multi-provider (genai):** Supports both + Ollama, Gemini, etc. Adds abstraction layer.

**Recommendation:** Start with async-openai (mature, well-tested). Add genai later if multi-provider needed.

### 2. Terminal Emulation Requirement
**Question:** Do you need interactive terminal output for SSH commands?

**Options:**
- **YES:** Add xterm.js + wrapper (adds ~200KB to bundle)
- **NO:** Use @melloware/react-logviewer for command output (simpler, lighter)

**Recommendation:** Start with react-logviewer. Add xterm.js only if users request interactive terminal.

### 3. SFTP Requirement
**Question:** Will remote setup need file transfers beyond SSH commands?

**Options:**
- **YES:** Add russh-sftp 2.1.1 for file operations
- **NO:** SSH command execution sufficient (lighter dependency)

**Recommendation:** Defer until needed. Most setup can be done via commands (curl, wget, echo > file).

### 4. Multi-node Coordination Protocol
**Question:** How should nodes communicate in multi-node setup mode?

**Options:**
- **Centralized:** Wizard backend (Axum) orchestrates all nodes via SSH (simple, existing WebSocket for UI updates)
- **P2P:** Nodes communicate directly (complex, requires additional protocol)
- **Hybrid:** Wizard coordinates, nodes report back via HTTP/WebSocket

**Recommendation:** Centralized (wizard orchestrates via SSH). Simplest architecture, reuses existing patterns.

## Confidence Assessment (v1.1 Additions)

| Area | Confidence | Reasoning |
|------|------------|-----------|
| SSH (async-ssh2-tokio) | MEDIUM | Version 0.9.1 confirmed via web search. High-level wrapper well-suited for use case. Not verified with Context7 (library not available). Actively maintained on GitHub. |
| Docker (bollard) | HIGH | Version 0.19.2 confirmed. Industry standard for Rust Docker clients. Active maintenance, comprehensive API coverage, extensive documentation. |
| Log Streaming (linemux) | MEDIUM | Version 0.3.0 confirmed. Purpose-built for log tailing. Alternative (tailf) exists but less flexible. Works with Tokio. |
| AI Integration (async-openai) | MEDIUM | Version 0.30.1 confirmed. Most mature unofficial OpenAI client for Rust. Multiple alternatives depending on provider choice. |
| React Log Viewer | MEDIUM | Version 6.3.4 confirmed. Actively maintained (last update 4 months ago). Supports needed streaming modes (WebSocket, EventSource). |
| Dark Mode Approach | HIGH | Tailwind v4 selector strategy is standard (official docs). CSS variables + Context API is React best practice. Well-documented pattern with many examples. |
| Terminal Emulation | LOW | xterm.js wrappers are lightly maintained. Most are 2+ years old. May need custom integration. ONLY add if interactive terminal required. |

## Sources (v1.1)

### SSH Libraries
- [Russh GitHub](https://github.com/Eugeny/russh) — Pure Rust SSH2 implementation (MEDIUM confidence)
- [async-ssh2-tokio on crates.io](https://crates.io/crates/async-ssh2-tokio) — High-level async wrapper (MEDIUM confidence)
- [async-ssh2-tokio docs.rs](https://docs.rs/crate/async-ssh2-tokio/latest) — Version 0.9.1 confirmed (HIGH confidence)
- [Rust SSH client libraries forum](https://users.rust-lang.org/t/choices-of-ssh-client-libraries/17432) — Community comparison (MEDIUM confidence)

### Docker Libraries
- [bollard on crates.io](https://crates.io/crates/bollard) — Version 0.19.2 confirmed (HIGH confidence)
- [bollard GitHub](https://github.com/fussybeaver/bollard) — Docker daemon API in Rust (HIGH confidence)
- [bollard docs.rs](https://docs.rs/bollard) — API documentation (HIGH confidence)

### Log Streaming
- [linemux GitHub](https://github.com/jmagnuson/linemux) — Async tailing library (MEDIUM confidence)
- [linemux on crates.io](https://crates.io/crates/linemux) — Version 0.3.0 confirmed (HIGH confidence)

### AI Integration
- [async-openai on crates.io](https://crates.io/crates/async-openai) — Version 0.30.1 confirmed (HIGH confidence)
- [async-openai GitHub](https://github.com/64bit/async-openai) — OpenAI Rust library (MEDIUM confidence)
- [genai GitHub](https://github.com/jeremychone/rust-genai) — Multi-provider alternative (LOW confidence, not evaluated)
- [Anthropic Rust clients](https://github.com/mochi-neko/clust) — Multiple unofficial clients (LOW confidence, not evaluated)

### React Components
- [@melloware/react-logviewer on npm](https://www.npmjs.com/package/@melloware/react-logviewer) — Version 6.3.4 confirmed (HIGH confidence)
- [react-logviewer GitHub](https://github.com/melloware/react-logviewer) — Features and examples (MEDIUM confidence)
- [xterm.js official site](https://xtermjs.org/) — Terminal emulator for web (HIGH confidence)
- [@pablo-lion/xterm-react on npm](https://www.npmjs.com/package/@pablo-lion/xterm-react) — React wrapper (MEDIUM confidence)

### Dark Mode
- [Tailwind CSS dark mode docs](https://tailwindcss.com/docs/dark-mode) — Official v4 selector strategy (HIGH confidence)
- [Dark mode React best practices - LogRocket](https://blog.logrocket.com/dark-mode-react-in-depth-guide/) — Implementation patterns (MEDIUM confidence)
- [Easy Dark Mode with React and localStorage](https://aleksandarpopovic.com/Easy-Dark-Mode-Switch-with-React-and-localStorage/) — Code examples (MEDIUM confidence)
- [usehooks-ts useDarkMode](https://usehooks-ts.com/react-hook/use-dark-mode) — Hook library option (MEDIUM confidence)

### Config Parsing
- [toml crate on crates.io](https://crates.io/crates/toml) — Official Rust TOML parser (HIGH confidence)
- [toml docs.rs](https://docs.rs/toml/latest/toml/) — Serde integration (HIGH confidence)

---

## Installation

### Frontend (React + Vite)

```bash
# Create Vite React app with TypeScript
npm create vite@latest frontend -- --template react-ts

cd frontend

# Core dependencies
npm install @tanstack/react-query zustand react-router@7

# UI components (Shadcn/ui requires manual setup)
npx shadcn@latest init
npm install tailwindcss@4 @tailwindcss/vite

# v1.1: Log viewer
npm install @melloware/react-logviewer

# Type-safe API client (generated from Rust types)
# ts-rs will generate TypeScript files in ../backend/bindings/

# Dev dependencies
npm install -D vitest @testing-library/react @testing-library/user-event @vitejs/plugin-react
```

### Backend (Rust + Axum)

```bash
# Create Cargo project
cargo new backend --name openclaw-wizard
cd backend

# Add to Cargo.toml:
# [dependencies]
# axum = "0.8"
# tokio = { version = "1.47", features = ["full"] }
# serde = { version = "1.0", features = ["derive"] }
# serde_json = "1.0"
# tower-http = { version = "0.6", features = ["cors", "fs"] }
# ts-rs = { version = "7.1", features = ["serde-compat"] }
# anyhow = "1"
# thiserror = "1"
# confique = "0.2"
# service-manager = "0.8"
#
# # v1.1 additions
# async-ssh2-tokio = "0.9"
# bollard = "0.19"
# linemux = "0.3"
# async-openai = "0.30"

cargo build
```

### Tauri (Later Phase)

```bash
# When ready to convert to desktop app
npm install -D @tauri-apps/cli@2

# Initialize Tauri
npx tauri init

# Migrate API calls from fetch to Tauri commands
# Update permissions in tauri.conf.json
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Axum | Actix Web | Use Actix if you need absolute maximum throughput (10-15% faster) and are comfortable with steeper learning curve, actor model, and macro-heavy API. Choose Axum for better DX, simpler debugging, and Tower ecosystem. |
| Vite | Next.js | Use Next.js if you need SSR, static site generation, or API routes. For local-first app served by Rust backend, Vite SPA is simpler and faster. Next.js adds unnecessary complexity. |
| React Router v7 SPA mode | Next.js App Router | Use Next.js if you need file-based routing and server components. For local wizard app, React Router v7 SPA mode gives you flexibility without server overhead. |
| TanStack Query + Zustand | Redux Toolkit | Use Redux if you need time-travel debugging or complex state machines. For most apps, TanStack Query (server state) + Zustand (client state) is simpler and more performant. |
| Shadcn/ui | Material-UI, Ant Design | Use component libraries if you need enterprise UI patterns out-of-box. Shadcn/ui is better for custom wizard UIs where you need full control over components and don't want package bloat. |
| TypeScript | Plain JavaScript | Always use TypeScript for production apps. Type safety catches bugs at compile time, especially critical for Rust-React API contracts. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Create React App | Officially sunset in early 2025. Slow, no longer maintained. | Vite (industry standard replacement) |
| Next.js for local-first | Next.js assumes cloud deployment (Vercel). SSR/SSG unnecessary for local app. Heavy framework for simple use case. | Vite React SPA served by Axum |
| Webpack | Slower than Vite, more configuration needed. Replaced by Vite for most projects. | Vite |
| Express.js/Node backend | Adds Node dependency when Rust already handles backend. Defeats purpose of Rust's performance/safety. | Axum (Rust-native) |
| Electron | 10x larger binaries than Tauri, higher memory usage, security concerns. Slower startup. | Tauri 2.x |
| Redux for server state | TanStack Query handles server state better (caching, refetching, mutations). Redux is overkill. | TanStack Query for server state, Zustand for client state |
| Class components | React 19 focuses on functional components and hooks. Class components are legacy. | Functional components with hooks |
| PropTypes | TypeScript provides better type safety at compile time. PropTypes are runtime-only. | TypeScript interfaces/types |

## Stack Patterns by Variant

### Pattern 1: Initial Web App (Phase 1)

**Stack:**
- React 19 + Vite 6 (frontend)
- Axum 0.8 (backend serving frontend + API)
- TanStack Query (API state)
- Zustand (wizard step state)
- Shadcn/ui components
- ts-rs for type sharing

**Why:**
- Fastest time to MVP
- Single Rust binary serves static frontend + API endpoints
- Type-safe end-to-end with ts-rs
- No separate deployment concerns (local-only)

**Architecture:**
```
Rust Binary (Axum)
├── Static file server (serves Vite build)
├── API routes (/api/*)
│   ├── System operations (install Node, write config)
│   ├── Daemon management (start/stop OpenClaw)
│   └── Health checks
└── WebSocket (optional, for real-time progress)

React SPA (Vite build → dist/)
├── Wizard UI (Shadcn/ui components)
├── TanStack Query (API calls to Axum)
└── Zustand (wizard state, UI state)
```

### Pattern 2: Tauri Desktop App (Phase 2)

**Stack Changes:**
- Add Tauri 2.x
- Replace fetch() with Tauri commands
- Move system operations to Tauri's Rust core
- Update permissions in tauri.conf.json

**Why:**
- Distribute as $29 desktop app
- Native OS integration (file dialogs, notifications)
- Smaller binary than Electron (~10-15MB vs 100-200MB)
- Better security model (explicit permissions)

**Migration Path:**
1. Keep React frontend unchanged
2. Wrap API calls behind abstraction layer
3. Replace HTTP calls with Tauri invoke() calls
4. Move Axum routes to Tauri commands (#[tauri::command])
5. Test desktop-specific features (file pickers, notifications)

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| React 19.2.4 | React Router 7.x | Full compatibility. Router updated for React 19. |
| Vite 6.x | React 19.x | Confirmed compatible. Use @vitejs/plugin-react latest. |
| Axum 0.8.8 | Tokio 1.47.x | Axum built on Tokio. Use matching versions. |
| TanStack Query 5.x | React 19.x | Fully compatible. Hooks work with React 19. |
| Shadcn/ui | Tailwind 4.x + React 19 | All components updated for both (as of Jan 2026). |
| ts-rs 7.1+ | serde 1.0 | serde-compat feature enabled by default. |
| Tauri 2.x | Vite 6.x | Official Vite plugin available (@tauri-apps/vite-plugin). |
| service-manager 0.8 | systemd, launchd | Cross-platform. Detects OS and uses appropriate service manager. |

## Stack Rationale by Constraint

### Constraint: Must serve locally (no cloud dependency)

**Decision:** Axum serves both static frontend and API
- Axum's tower-http provides static file serving
- Single Rust binary = no separate web server needed
- Localhost-only binding (127.0.0.1:8080)
- No external dependencies

### Constraint: Must port cleanly to Tauri later

**Decision:** Keep API layer abstracted
- Use service layer in React (don't call fetch directly)
- ts-rs types work in both Axum (JSON) and Tauri (IPC)
- Same Rust backend code can become Tauri commands
- Minimal migration effort (mostly find-replace fetch → invoke)

### Constraint: Target non-technical users

**Decision:** Shadcn/ui for polished wizard UX
- Accessible components (Radix primitives)
- Professional design (Tailwind styling)
- Clear wizard flow (React Router steps)
- Real-time feedback (TanStack Query + optimistic updates)

### Constraint: Must interact with system (shell, files, services)

**Decision:** Rust backend handles all system operations
- std::process::Command for shell commands (safe, no shell injection)
- std::fs for file operations (write configs, create directories)
- service-manager for daemon management (systemd/launchd)
- confique for reading/writing TOML configs

**Security:**
- No shell interpretation (direct argument passing)
- Input validation in Rust (thiserror for typed errors)
- Minimal permissions (only what's needed)
- Tauri's permission system enforces principle of least privilege

## Type Safety Architecture

### End-to-End Type Safety

```rust
// backend/src/api/types.rs
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct InstallRequest {
    pub component: String,
    pub version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct InstallResponse {
    pub success: bool,
    pub message: String,
    pub installed_version: Option<String>,
}

// Generates: frontend/bindings/InstallRequest.ts
// Generates: frontend/bindings/InstallResponse.ts
```

```typescript
// frontend/src/api/install.ts
import type { InstallRequest, InstallResponse } from '../../backend/bindings';

export async function installComponent(req: InstallRequest): Promise<InstallResponse> {
  const res = await fetch('/api/install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return res.json();
}
```

**Benefits:**
- TypeScript errors if API contract changes
- Autocomplete for API types
- Compile-time safety (no runtime surprises)
- Single source of truth (Rust types)

## Sources

### Framework Versions & Official Docs
- [React 19.2.4 Release](https://react.dev/blog/2025/10/01/react-19-2) (HIGH confidence)
- [Vite 6.0 Announcement](https://vite.dev/blog/announcing-vite6) (HIGH confidence)
- [Axum 0.8.0 Announcement](https://tokio.rs/blog/2025-01-01-announcing-axum-0-8-0) (HIGH confidence)
- [Tauri 2.0 Stable Release](https://v2.tauri.app/blog/tauri-20/) (HIGH confidence)
- [React Router v7 Docs](https://reactrouter.com/) (HIGH confidence)
- [TanStack Query Latest Docs](https://tanstack.com/query/latest/docs/framework/react/overview) (HIGH confidence)

### Framework Comparisons
- [Rust Web Frameworks 2026: Axum vs Actix](https://aarambhdevhub.medium.com/rust-web-frameworks-in-2026-axum-vs-actix-web-vs-rocket-vs-warp-vs-salvo-which-one-should-you-2db3792c79a2) (MEDIUM confidence)
- [Actix vs Axum Benchmarks](https://medium.com/@Krishnajlathi/actix-vs-axum-i-benchmarked-rusts-top-frameworks-and-one-dominated-888f9b95e6d8) (MEDIUM confidence)
- [State Management in React 2026](https://www.c-sharpcorner.com/article/state-management-in-react-2026-best-practices-tools-real-world-patterns/) (MEDIUM confidence)

### Best Practices
- [Tauri v2 Migration Guide](https://v2.tauri.app/start/migrate/) (HIGH confidence)
- [Rust Error Handling: anyhow vs thiserror](https://oneuptime.com/blog/post/2026-01-25-error-types-thiserror-anyhow-rust/view) (HIGH confidence)
- [Vitest React Testing Best Practices](https://oneuptime.com/blog/post/2026-01-15-unit-test-react-vitest-testing-library/view) (HIGH confidence)
- [Rust std::process::Command Security](https://doc.rust-lang.org/std/process/struct.Command.html) (HIGH confidence)

### Type Safety & Integration
- [ts-rs GitHub](https://github.com/Aleph-Alpha/ts-rs) (HIGH confidence)
- [Publishing Rust Types to TypeScript Frontend](https://cetra3.github.io/blog/sharing-types-with-the-frontend/) (MEDIUM confidence)
- [TypeScript Type Safety 2026](https://www.nucamp.co/blog/typescript-fundamentals-in-2026-why-every-full-stack-developer-needs-type-safety) (MEDIUM confidence)

### UI & Testing
- [Shadcn/ui Official Docs](https://ui.shadcn.com/) (HIGH confidence)
- [Shadcn/ui Tailwind v4 Support](https://ui.shadcn.com/docs/tailwind-v4) (HIGH confidence)
- [Vitest Component Testing Guide](https://vitest.dev/guide/browser/component-testing) (HIGH confidence)

### Rust Libraries
- [tokio crates.io](https://crates.io/crates/tokio) (HIGH confidence)
- [confique docs.rs](https://docs.rs/confique) (HIGH confidence)
- [service-manager docs.rs](https://docs.rs/service-manager/latest/service_manager/) (HIGH confidence)

---
*Stack research for: OpenClaw Wizard (local-first setup wizard + management dashboard)*
*Researched: 2026-02-14*
*v1.1 additions researched: 2026-02-14*
