# Project Research Summary

**Project:** OpenClaw Wizard
**Domain:** Local-first Setup Wizard + Management Dashboard (Web App → Tauri Desktop)
**Researched:** 2026-02-14
**Confidence:** HIGH

## Executive Summary

OpenClaw Wizard is a GUI installer and management dashboard for OpenClaw, a complex CLI tool for LLM-powered chat across multiple platforms. The research reveals this is a local-first web application that wraps system operations with a user-friendly interface, similar to Docker Desktop or Cork (Homebrew GUI). The recommended approach is to build a React frontend served by a Rust (Axum) backend that handles all system operations, with a clean migration path to Tauri desktop app for monetization ($29 desktop product).

The technical foundation is solid: React 19 + Vite 6 for the frontend, Axum 0.8 + Tokio for the Rust backend, with type safety across the stack via ts-rs. The architecture follows a proven pattern of WebSocket streaming for real-time progress updates during long operations (npm install, service management), with careful security boundaries around shell command execution. The MVP centers on 14 core features that eliminate the need for terminal expertise: step-by-step wizard, dependency detection/installation, one-click daemon management, and live health monitoring.

Critical risks center on security (shell command injection), upstream stability (OpenClaw's 9,833 commits mean breaking changes are inevitable), and cross-platform complexity (macOS/Linux/WSL2 path handling). Mitigation requires strict input validation with Tauri's shell command scopes, runtime version detection with compatibility matrices, and platform-specific testing from day one. The research shows that installers commonly fail in three areas: unrecoverable installation states after failures, npm permission battles requiring sudo, and UI freezes during async operations. Addressing these with transactional installation patterns, nvm-based npm setup, and proper progress indicators is essential for production readiness.

## Key Findings

### Recommended Stack

**Modern local-first architecture with clear Tauri migration path.** The stack prioritizes developer experience (type safety, fast iteration) while avoiding common pitfalls (Create React App is sunset, Electron is bloated, Redux is overkill for this use case).

**Core technologies:**
- **React 19.2.4 + Vite 6:** Industry standard UI framework with near-instant HMR. React 19 includes DoS mitigations critical for production. Vite replaces Create React App as the primary choice for React projects.
- **Axum 0.8.8 (Rust):** Tokio-based web framework for backend. 20% lower latency than previous versions, simpler API than Actix (10-15% slower but better DX). Handles static serving + API + WebSocket from single binary.
- **TypeScript 5.x + ts-rs 7.1+:** End-to-end type safety. Rust structs auto-generate TypeScript types, eliminating runtime surprises and providing single source of truth for API contracts.
- **TanStack Query 5.x + Zustand 4.x:** Modern state management split: server state (TanStack Query handles caching/refetching) and client state (Zustand for wizard progress). Replaces Redux complexity.
- **Shadcn/ui + Tailwind 4.x:** Copy-paste components built on Radix UI. Full customization without package bloat, better for custom wizard UIs than Material-UI or Ant Design.
- **Tauri 2.x (Phase 2):** Desktop conversion with 10-15MB binaries vs Electron's 100-200MB. Same React frontend, minimal backend changes (Axum routes become Tauri commands).
- **service-manager + confique (Rust):** Cross-platform daemon management (systemd/launchd abstraction) and type-safe config loading (TOML, env vars, layered configs).

**Critical version requirements:**
- Tokio 1.47.x (LTS until Sep 2026) for Axum compatibility
- React Router 7.x in SPA mode (not SSR) for local-only serving
- Shadcn/ui components updated for Tailwind v4 + React 19

### Expected Features

**The MVP must deliver "non-technical users successfully set up OpenClaw without touching terminal."** Research shows 14 features achieve this, split between table stakes (users expect) and differentiators (competitive advantage).

**Must have (table stakes):**
- **Step-by-step wizard flow** — Universal installer pattern. Missing this feels broken.
- **Progress indicators** — Users need to know where they are (vertical placement tests better for desktop).
- **Input validation with clear errors** — Real-time validation for API keys, ports, paths with actionable messages ("Port 3000 in use. Try 3001 or stop conflicting service").
- **Dependency detection and installation** — Auto-detect Node.js, offer to install if missing. Non-technical users can't diagnose prerequisites.
- **System requirements check** — First screen validates OS version, disk space, network, permissions before wasting time.
- **Safe defaults** — Pre-select sensible values (port 3000, localhost, password auth). Show "Advanced" disclosure for experts.
- **Visual feedback during long operations** — Spinner/progress bar with status text prevents perceived freezing.

**Should have (competitive):**
- **Auto-detection of existing config** — Scan for openclaw.json, .env files, running daemon. Pre-populate wizard. Transforms "start from scratch" to "complete what's missing."
- **Interactive QR code for WhatsApp** — Real-time QR generation eliminates copy-paste errors. Matches mobile pairing UX. Critical for #1 requested channel.
- **Live health dashboard post-setup** — Real-time status: gateway up/down, channels connected, recent errors. Differentiates from "install and pray" tools.
- **One-click daemon management** — Start/Stop/Restart buttons. Non-technical users can't diagnose systemd/launchd issues. Core value prop.
- **API key validation before proceeding** — Test with provider (Anthropic, OpenAI) before saving. Immediate feedback vs discovering failure later.
- **Configuration preview before commit** — Summary screen showing all selections. Allow back navigation to edit.

**Defer (v2+):**
- **All 13+ OpenClaw channels** — Start with WhatsApp/Telegram/Discord/Slack (80% of users). Add based on demand.
- **Ollama/local model support** — Significant complexity (GPU requirements, model downloads). High friction for adoption.
- **Channel reconnection workflows** — Handle WhatsApp session expiry. Add when it becomes top support issue.
- **Guided error recovery** — Context-aware suggestions ("Node not found → Install?"). Add when >10% fail with same error.
- **Multi-language wizard** — English-first, localize after traction.

**Anti-features (avoid):**
- **Full CLI replacement** — Scope creep. OpenClaw's TUI already handles conversations well.
- **Cloud-hosted wizard** — Security risk with API keys. Trust issue. Local-only at localhost.
- **Automatic OpenClaw updates** — Users want control for production systems. Show "Update available" notification only.

### Architecture Approach

**Local-first monorepo with backend/frontend separation and clean Tauri migration path.** The architecture follows established patterns from Docker Desktop and Portainer: unified binary serving static frontend + API + WebSocket, with system operations isolated in Rust for security.

**Major components:**
1. **React Frontend (Wizard + Dashboard)** — Multi-step wizard UI, health monitoring views, config editor. Uses TanStack Query for API calls, Zustand for wizard state. Served from backend's static file middleware.
2. **Axum Router (Rust Backend)** — HTTP REST endpoints for wizard steps, config CRUD, health checks. WebSocket endpoint for real-time streaming (install progress, logs). Serves built React app from static/ directory.
3. **System Services Layer** — Wraps all OS interactions: std::process::Command for shell execution (no shell interpretation), service-manager for daemon control (launchd/systemd abstraction), confique for config file operations.
4. **Config Manager** — Atomic writes (temp file + rename), serde_json parsing, handles OpenClaw's 4 config locations with precedence rules.

**Key patterns:**
- **Type safety via ts-rs:** Rust structs with `#[derive(TS)]` auto-generate TypeScript types. Single source of truth prevents drift.
- **WebSocket for progress streaming:** Long operations (npm install) stream stdout line-by-line to UI. Avoids polling and UI freezes.
- **Command execution security:** Individual arguments (not shell strings) prevent injection. `Command::new("npm").arg("install").arg(package)` — never `sh -c "npm install {package}"`.
- **Atomic config writes:** Write to temp file, sync, atomic rename. Prevents corruption on crash/interrupt.
- **Service manager abstraction:** Trait-based cross-platform API. Platform detection (`#[cfg(target_os)]`) selects launchd vs systemd implementation.

**Migration to Tauri:** 95% code reuse. Shared business logic in backend/src/{config, system}/. Axum handlers become thin wrappers → Tauri commands use same functions. WebSocket → Tauri event emitter (similar API). Feature flags (`#[cfg(feature = "tauri")]`) enable conditional compilation.

### Critical Pitfalls

Research identified 8 critical pitfalls common to installer GUIs wrapping CLI tools. Top 5 by severity:

1. **Shell command injection via user input** — Concatenating user data into shell strings enables remote code execution. OpenClaw Wizard accepts API keys, file paths, config values as input. Prevention: Use Tauri shell command scope allowlist, pass arguments separately via `Command::arg()`, validate all input against strict schemas, never use string interpolation with user data.

2. **Upstream CLI instability (OpenClaw's 9,833 commits)** — Hardcoding assumptions about CLI flags, config format, or installation steps breaks when OpenClaw releases breaking changes. Prevention: Query OpenClaw version at runtime, maintain compatibility matrix, parse help output or import config schemas directly, fail gracefully with "This wizard supports OpenClaw 1.x-2.x" messages, monitor GitHub releases via CI.

3. **Cross-platform path assumptions** — Hardcoded paths like `/usr/local/bin` or `C:\Program Files`, assuming Unix path separators, not handling spaces in paths. WSL2's `/mnt/c/` performs 20x slower than Linux filesystem. Prevention: Detect OS-specific defaults at runtime, use PathBuf/path.join(), quote all paths in shell commands, guide WSL2 users to Linux filesystem, test on macOS/Linux/WSL2 from day one.

4. **Unrecoverable failed installation state** — Installation fails halfway (network timeout, permission denied), leaves system broken (some files installed, some config written, services registered). Re-running fails because "OpenClaw is already installed" but not working. Prevention: Implement transactional installation with operation manifest, rollback on failure in reverse order, validate preconditions (disk space, permissions, network) before starting, provide explicit "uninstall/reset" command.

5. **npm global install permission battles** — `npm install -g openclaw` fails with EACCES on `/usr/local/lib/node_modules`. Users resort to `sudo npm install`, creating root-owned files that break updates and introduce security risks (malicious packages run as root). Prevention: Detect nvm and use it (automatically handles permissions), configure npm user directory if no nvm, **never** suggest `sudo npm install`, pre-flight check write permissions before attempting install.

**Other critical pitfalls:**
- **Async UI freezes:** Long commands (npm install) run synchronously, freezing UI. Users think app crashed, force-quit. Use async execution + stdout streaming + progress indicators.
- **Config schema drift:** Duplicating OpenClaw's validation logic breaks when schemas change. Import Zod schemas directly or minimal validation + let OpenClaw validate.
- **Service registration without cleanup:** Registering launchd/systemd service without uninstall leaves orphaned services. Implement matching disable/uninstall for every system modification.

## Implications for Roadmap

Based on research, suggested phase structure addresses dependencies (detection before installation), architecture patterns (foundation before features), and pitfalls (security first, cross-platform from start):

### Phase 1: Foundation & Security
**Rationale:** Security vulnerabilities in shell command execution and cross-platform path handling must be addressed before any system operations. Type safety infrastructure prevents frontend/backend drift. Version detection enables graceful degradation when OpenClaw changes.

**Delivers:**
- Backend scaffolding (Axum router, static serving, ts-rs pipeline)
- Frontend scaffolding (Vite + React, basic layout, API client)
- Shell command security (Tauri scope configuration, input validation)
- Cross-platform path utilities (OS detection, PathBuf wrappers)
- OpenClaw version detection (compatibility checks)

**Addresses:**
- **Pitfall 1 (Shell injection):** Establishes secure command execution patterns
- **Pitfall 2 (Upstream instability):** Version detection from the start
- **Pitfall 3 (Cross-platform paths):** Path handling utilities before any file operations

**Avoids:** Building features on insecure foundation, having to retrofit security later.

### Phase 2: System Detection & Prerequisites
**Rationale:** Can't install dependencies until we know what's missing. Detection must run before wizard to pre-populate state and skip completed steps.

**Delivers:**
- OS/environment detection (macOS/Linux/WSL2, Node.js version, OpenClaw installation)
- System requirements check (disk space, permissions, network)
- Auto-detection of existing config (scan openclaw.json, .env, running daemon)
- npm permission handling (detect nvm, configure user-scoped npm)
- Detection API endpoints + UI

**Addresses:**
- **Features:** System requirements check, auto-detection of existing config
- **Pitfall 5 (npm permissions):** Prevents permission errors before they happen

**Uses:** Type-safe detection models (ts-rs), cross-platform path utilities from Phase 1

### Phase 3: Wizard Core
**Rationale:** Detection data feeds wizard. Wizard validates before installation. Can't proceed to installation until wizard flow is solid.

**Delivers:**
- Multi-step wizard UI (step navigation, progress indicators)
- Input validation (API keys, ports, paths with real-time feedback)
- Safe defaults for technical settings (ports, bind modes, auth)
- Configuration preview before commit (summary screen, back navigation)
- Wizard state management (Zustand for client state, TanStack Query for API)

**Addresses:**
- **Features:** Step-by-step wizard, progress indicators, input validation, safe defaults, config preview
- **Architecture:** React components, Zustand state management

**Implements:** Table stakes wizard UX that users expect from installers.

### Phase 4: Real-Time Installation
**Rationale:** Wizard collects config. Installation executes long-running operations. WebSocket streaming prevents UI freezes and enables transactional rollback.

**Delivers:**
- Async command execution (tokio::process with stdout streaming)
- WebSocket handler for progress updates (install logs, status messages)
- Progress indicators during long operations (spinners, progress bars, elapsed time)
- Transactional installation (operation manifest, rollback on failure)
- Node.js installation if missing (nvm-based, no sudo)
- OpenClaw npm installation (global with user permissions)

**Addresses:**
- **Features:** Dependency detection and installation, visual feedback during operations
- **Pitfall 4 (Failed installation state):** Transactional pattern with rollback
- **Pitfall 6 (UI freezes):** Async execution with streaming

**Uses:** WebSocket patterns from ARCHITECTURE.md, npm permission handling from Phase 2

### Phase 5: Daemon Management
**Rationale:** Installation places binaries. Daemon management starts/stops services. Health monitoring validates daemon is working.

**Delivers:**
- Service manager abstraction (launchd/systemd trait implementation)
- One-click daemon controls (Start/Stop/Restart/Status buttons)
- Daemon installation with uninstall/cleanup (no orphaned services)
- Success confirmation screen (clear completion signal, "What's next" guidance)

**Addresses:**
- **Features:** One-click daemon management, success confirmation
- **Pitfall 8 (Service cleanup):** Uninstall alongside install from the start

**Implements:** service-manager abstraction pattern from ARCHITECTURE.md

### Phase 6: Live Health Dashboard
**Rationale:** Installation complete. Users need ongoing visibility into whether OpenClaw is working. Differentiates from "install and pray" tools.

**Delivers:**
- Real-time health monitoring (gateway up/down, channel connectivity)
- WebSocket-based status updates (push not poll, 5-second interval)
- Dashboard UI (status cards, health indicators, recent errors)
- API key validation before saving (test with Anthropic/OpenAI)

**Addresses:**
- **Features:** Live health dashboard, API key validation
- **Differentiator:** Ongoing value beyond one-time setup

**Uses:** WebSocket infrastructure from Phase 4

### Phase 7: Channel Setup (MVP Channels)
**Rationale:** Core installation works. Channels are OpenClaw's purpose. Start with top 4 requested (WhatsApp/Telegram/Discord/Slack).

**Delivers:**
- WhatsApp setup with interactive QR code (real-time generation, session timeout handling)
- Telegram/Discord/Slack token input (validation, connection test)
- Channel configuration UI (channel-specific forms)

**Addresses:**
- **Features:** Interactive QR code for WhatsApp (critical differentiator)
- **Defer to v2+:** Remaining 9+ channels (add based on demand)

**Implements:** Channel modules from ARCHITECTURE.md Phase 5

### Phase 8: Config Editor (Post-Setup Management)
**Rationale:** Setup wizard is one-time. Config editor enables ongoing adjustments without terminal.

**Delivers:**
- Visual JSON editor with validation (openclaw.json editing)
- Smart environment variable management (show precedence, canonical location)
- Atomic config writes (temp file + rename pattern)

**Addresses:**
- **Features:** Config editing for post-install adjustments
- **Architecture:** Atomic writes pattern from ARCHITECTURE.md

**Uses:** Config manager from backend foundation

### Phase 9: Tauri Desktop Migration
**Rationale:** Web app validated. Desktop distribution enables monetization ($29 product).

**Delivers:**
- Tauri initialization (tauri/ directory, tauri.conf.json)
- Command migration (Axum handlers → #[tauri::command])
- Event migration (WebSocket → Tauri event emitter)
- Desktop build pipeline (native binaries for macOS/Linux/Windows)

**Addresses:**
- **Monetization:** Desktop distribution at $29
- **Architecture:** Migration pattern from ARCHITECTURE.md Phase 7

**Uses:** Shared backend logic (95% code reuse via feature flags)

### Phase Ordering Rationale

**Dependencies drive sequence:**
- Foundation before features (security, type safety, cross-platform utilities first)
- Detection before wizard (wizard needs environment data)
- Wizard before installation (validates before executing)
- Installation before daemon management (daemon needs binaries installed)
- Daemon before health monitoring (monitoring needs daemon running)
- Health before channels (channels depend on healthy gateway)

**Pitfall mitigation:**
- Phase 1 addresses 3/8 critical pitfalls (shell injection, upstream instability, cross-platform paths) before any features
- Phase 2 prevents npm permission battles (Pitfall 5) before installation
- Phase 4 implements transactional installation (Pitfall 4) and async execution (Pitfall 6) in same phase
- Phase 5 builds cleanup alongside installation (Pitfall 8)

**MVP scope:**
- Phases 1-7 deliver 14 core features for "non-technical users successfully set up OpenClaw"
- Phase 8 is enhancement (config editing)
- Phase 9 is monetization (Tauri desktop)

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 4 (Installation):** Complex dependency management, platform-specific Node.js installation, npm/nvm interaction. Needs research on nvm detection, fallback strategies, error messages.
- **Phase 5 (Daemon Management):** Platform differences between launchd/systemd are significant. Needs research on service file formats, user vs system services, logging configuration.
- **Phase 7 (Channels):** WhatsApp Web's pairing protocol may require reverse engineering or library research. QR code generation and session management needs investigation.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Well-documented patterns. Axum + Vite + ts-rs setup is established.
- **Phase 3 (Wizard Core):** React wizard patterns are universal. Shadcn/ui components documented.
- **Phase 6 (Health Dashboard):** WebSocket status updates follow established real-time patterns.
- **Phase 8 (Config Editor):** JSON editing with Monaco or similar is well-documented.
- **Phase 9 (Tauri Migration):** Tauri's official migration guide covers this thoroughly.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies have official docs, active maintenance, proven in production. React 19 + Vite 6 + Axum 0.8 are current stable releases. ts-rs for type generation is mature (7.1+). |
| Features | HIGH | Feature research drew from installer best practices (Docker Desktop, Cork, Portainer), wizard UX patterns, and OpenClaw-specific tutorials. 14 MVP features validated against expert sources. |
| Architecture | HIGH | Patterns match established approaches for local-first apps (Tauri examples, Rust+React tutorials). WebSocket streaming, atomic writes, service abstraction are proven. Migration path to Tauri documented by framework authors. |
| Pitfalls | MEDIUM-HIGH | Security pitfalls (shell injection, command execution) well-documented in Tauri/Electron security guides. Upstream instability and cross-platform issues based on practical experience but specific to OpenClaw. npm permission issues extensively documented. |

**Overall confidence:** HIGH

Research is based on official documentation (React, Vite, Axum, Tauri, Tokio), established patterns from comparable tools (Docker Desktop, Portainer, Cork), and security best practices from Tauri/Electron security guides. Lower confidence areas are OpenClaw-specific (config schema, CLI stability) where assumptions will need runtime validation.

### Gaps to Address

**OpenClaw version compatibility details:** Research established the need for version detection and compatibility matrices, but the actual breaking points between OpenClaw versions are unknown. **Handle during Phase 1:** Query OpenClaw's version and help output at runtime. Build compatibility logic incrementally as breaking changes are discovered.

**WhatsApp Web pairing protocol specifics:** Research confirmed QR code display is critical, but implementation details of session management and timeout handling are unclear. **Handle during Phase 7:** Research existing libraries (whatsapp-web.js, baileys) or OpenClaw's own WhatsApp integration code. May need to wrap OpenClaw's channel setup instead of reimplementing.

**Node.js installation automation:** Research recommended nvm for permission handling, but cross-platform nvm detection and automated Node.js installation mechanics need validation. **Handle during Phase 4:** Test nvm installation on fresh macOS/Linux/WSL2 systems. Document fallback strategies (manual Node.js install, user-scoped npm config).

**Service file configuration variations:** Research established need for launchd/systemd abstraction, but specific service file formats and user vs system service differences require deeper investigation. **Handle during Phase 5:** Use research-phase for daemon management to explore service-manager crate examples and platform-specific service file templates.

**Config precedence rules:** OpenClaw has 4 config locations (system-wide, user-wide, project-local, environment variables). Research flagged this as user confusion point, but precedence rules are undocumented. **Handle during Phase 2:** Parse OpenClaw's actual config loading code or test empirically. Document findings for Phase 8 config editor.

## Sources

### Primary (HIGH confidence)

**Framework Documentation:**
- [React 19.2.4 Release](https://react.dev/blog/2025/10/01/react-19-2) — DoS mitigations, Server Actions
- [Vite 6.0 Announcement](https://vite.dev/blog/announcing-vite6) — Expanded APIs, polished ecosystem
- [Axum 0.8.0 Announcement](https://tokio.rs/blog/2025-01-01-announcing-axum-0-8-0) — 20% latency reduction
- [Tauri 2.0 Stable Release](https://v2.tauri.app/blog/tauri-20/) — Mobile support, improved permissions
- [Tauri Architecture](https://v2.tauri.app/concept/architecture/) — Official architecture patterns
- [Tauri Security](https://v2.tauri.app/security/) — Shell scope, isolation pattern, Stronghold

**Stack Components:**
- [TanStack Query Latest Docs](https://tanstack.com/query/latest/docs/framework/react/overview)
- [React Router v7 Docs](https://reactrouter.com/)
- [Shadcn/ui Official Docs](https://ui.shadcn.com/)
- [Shadcn/ui Tailwind v4 Support](https://ui.shadcn.com/docs/tailwind-v4)
- [ts-rs GitHub](https://github.com/Aleph-Alpha/ts-rs) — TypeScript generation from Rust
- [service-manager crates.io](https://crates.io/crates/service-manager) — Cross-platform daemon management
- [confique docs.rs](https://docs.rs/confique) — Type-safe config loading

**Security:**
- [Securing Rust Apps: Command Injection Prevention](https://www.stackhawk.com/blog/rust-command-injection-examples-and-prevention/)
- [Command in std::process - Rust](https://doc.rust-lang.org/std/process/struct.Command.html)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Tauri Stronghold Plugin](https://v2.tauri.app/plugin/stronghold/)

### Secondary (MEDIUM confidence)

**Architecture Patterns:**
- [Rust Web Frameworks in 2026: Axum vs Actix Web](https://aarambhdevhub.medium.com/rust-web-frameworks-in-2026-axum-vs-actix-web-vs-rocket-vs-warp-vs-salvo-which-one-should-you-2db3792c79a2) — Performance comparisons
- [Rust Backend, React Frontend: Modern Web Architecture Tutorial for 2025](https://markaicode.com/rust-react-web-architecture-tutorial-2025/)
- [Rust + Yew + Axum + Tauri full-stack example](https://github.com/jetli/rust-yew-axum-tauri-desktop)
- [Build a Cross-Platform Desktop App in Rust: Tauri 2.0, SQLite, Axum](https://ritik-chopra28.medium.com/build-a-cross-platform-desktop-app-in-rust-tauri-2-0-sqlite-axum-2b9b7b732e0d)

**Feature Research:**
- [Creating a setup wizard (and when you shouldn't) - LogRocket Blog](https://blog.logrocket.com/ux-design/creating-setup-wizard-when-you-shouldnt/)
- [Wizard UI Pattern: When to Use It and How to Get It Right - Eleken](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained)
- [Best Practices for High-Conversion Wizard UI Design & Examples - Lollypop](https://lollypop.design/blog/2026/january/wizard-ui-design/)
- [Docker Desktop Installation Guide](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Initial setup | Portainer Documentation](https://docs.portainer.io/start/install/server/setup)
- [Cork: The Homebrew GUI for macOS](https://corkmac.app/)

**Pitfalls:**
- [Resolving EACCES permissions errors when installing packages globally | npm Docs](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally/)
- [How to Run Linux Software on Windows in 2026 (WSL2 and VMs)](https://thelinuxcode.com/how-to-run-linux-software-on-windows-in-2026-wsl2-and-vms-the-practical-way/)
- [CLI UX best practices: 3 patterns for improving progress displays | Evil Martians](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays)

**Real-Time Communication:**
- [Rust: WebSocket with Axum For RealTime Communications](https://medium.com/@itsuki.enjoy/rust-websocket-with-axum-for-realtime-communications-49a93468268f)
- [Building Real-Time Applications with WebSockets and Server-Sent Events in Rust](https://dasroot.net/posts/2025/12/building-real-time-applications-with/)

### Tertiary (LOW confidence - needs validation)

- [OpenClaw (Clawdbot) Tutorial: Control Your PC from WhatsApp - DataCamp](https://www.datacamp.com/tutorial/moltbot-clawdbot-tutorial) — Channel setup patterns (may be outdated given 9,833 commits)
- [Clawdbot WhatsApp & Telegram Setup in 20 Minutes (2026 Guide) - Serenities AI](https://serenitiesai.com/articles/clawdbot-whatsapp-telegram-setup) — Setup steps (needs verification against current OpenClaw version)

---
*Research completed: 2026-02-14*
*Ready for roadmap: yes*
