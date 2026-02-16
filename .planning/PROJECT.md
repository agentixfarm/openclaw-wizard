# OpenClaw Wizard

## What This Is

A visual setup wizard and management dashboard for OpenClaw — the viral open-source personal AI assistant (192K GitHub stars). It replaces the error-prone terminal-based `openclaw onboard` flow with a guided, auto-detecting web UI that non-technical users can actually complete. The Rust backend (Axum) runs locally, serves a React 19 frontend, and handles all system operations (installing Node, writing config, managing the daemon). The same codebase later becomes a $29 Tauri desktop app.

## Core Value

Non-technical users successfully set up and manage OpenClaw without touching a terminal. If they can click through a wizard, they can run OpenClaw.

## Current State

**Shipped:** v1.0 MVP (2026-02-14)
**Codebase:** 8,320 LOC (Rust + TypeScript), 96 files
**Tech stack:** Axum 0.8 + React 19 + Vite 6 + Tailwind CSS v4 + ts-rs type generation

## Current Milestone: v1.1 Polish & Control Center Foundation

**Goal:** Harden the web wizard for production, add control center capabilities (skill management, service controls, logs), support remote/VPS setup, and publish as open source under MIT.

**Target features:**

*Setup Wizard Modes:*
- Desktop install mode (guided, for non-technical users)
- Remote install mode (SSH into VPS/cloud server)
- Multi-node setup mode
- Docker sandboxed setup (dev/safe mode)

*Post-Install Management:*
- Service management (gateway + daemon lifecycle, start/stop/restart)
- OpenClaw doctor integration
- Skills manager (browse, install/uninstall, categorize, descriptions)
- Logs viewer for daemon and gateway output

*Intelligence Layer:*
- Config auditor & optimizer (AI-powered cost savings, model recommendations — e.g. "save $X/month by using DeepSeek for sub-agents")
- Security auditor & optimizer

*Production Quality:*
- Testing suite (Rust + Vitest + E2E)
- Error recovery with guided messages and installation rollback
- Theme/styling refresh with OpenClaw branding (ASCII logo)
- Subtle security warnings during setup
- Consolidate wizard steps, cover skipped onboard steps
- Open source publishing (MIT, npm, crates.io, CI/CD)

**Vision:** v1.1 makes the wizard best-in-class for setup + management. v2+ expands into full mission control (agent creation, task boards, fleet management — separate product scope).

**Branding note:** "OpenClaw Wizard" is the development name. Evaluate trademark/legal for commercial Tauri version before v2 launch. May need independent brand (e.g. "ClawWizard" or similar) with "for OpenClaw" descriptor.

## Requirements

### Validated

- ✓ Guided setup wizard with auto-detection (OS, Node, existing config) — v1.0
- ✓ AI model/provider configuration (Anthropic, OpenAI) with API key validation — v1.0
- ✓ Anthropic setup-token support (sk-ant-oat01-...) — v1.0
- ✓ Gateway configuration (port, bind mode, auth) with smart defaults — v1.0
- ✓ Channel setup for top 4 channels (WhatsApp, Telegram, Discord, Slack) — v1.0
- ✓ Daemon installation and management (start/stop/restart) — v1.0
- ✓ Health dashboard (gateway status, channel connectivity, uptime, errors) — v1.0
- ✓ Visual config editor (form-based openclaw.json editing) — v1.0
- ✓ Channel manager (add/remove/reconnect channels) — v1.0
- ✓ Pre-flight environment checks with clear error messages — v1.0
- ✓ Config import/export for multi-machine setups — v1.0
- ✓ Rust backend serving React frontend at localhost — v1.0

### Shipped (v1.1)

- ✓ 4 setup modes: desktop, SSH remote, multi-node, Docker sandbox — v1.1
- ✓ Service management (gateway + daemon lifecycle, doctor) — v1.1
- ✓ Skills manager (browse, install/uninstall, categorize) — v1.1
- ✓ Logs viewer — v1.1
- ✓ Config auditor & optimizer (AI-powered cost/model recommendations) — v1.1
- ✓ Security auditor & optimizer — v1.1
- ✓ Testing suite (Rust + Vitest + E2E) — v1.1
- ✓ Error recovery with guided messages and rollback — v1.1
- ✓ Theme/styling refresh with branding — v1.1
- ✓ Consolidate wizard steps, cover skipped onboard steps — v1.1
- ✓ Open source publishing (MIT, npm, crates.io, CI/CD) — v1.1

### Deferred (v2+)

- [ ] Tauri desktop app packaging ($29 product — requires brand/legal review)
- [ ] Full mission control (agent creation, task boards, fleet management — separate product)
- [ ] Custom AI model hosting (Ollama integration)

### Out of Scope

- Full CLI replacement — wizard handles setup and management, not agent conversations
- Mobile app — desktop/web only for now
- Custom AI model hosting (Ollama integration) — defer to v2
- All 13+ channels — v1 covers top 4, expand based on demand
- Skills marketplace — OpenClaw handles skills natively
- Multi-user/team management — single-user focus matches OpenClaw's design
- Cloud-hosted wizard — security risk with API keys, local-only

## Context

**The problem:** OpenClaw went viral (9K to 192K GitHub stars in weeks, 416K npm downloads/month) but the TUI-based setup wizard is a major friction point. Documented pain:
- Users spend 3-12 hours troubleshooting setup
- One user spent $300 across 5 VPS reinstalls over 2 days
- The built-in wizard misses questions and doesn't let you go back
- Config files get corrupted on restart

**The opportunity:** No consumer-friendly OpenClaw setup tool exists. Competitors (LM Studio, Jan.ai) are simpler tools that don't compete. Docker Desktop proved the model: paid GUI wrapper for free CLI tools works.

**OpenClaw's setup requires:**
1. Node.js 22+ installation
2. OpenClaw npm global install (sharp/libvips issues common)
3. Security acknowledgement
4. Model provider selection + API key
5. Gateway config (port, bind, auth mode, Tailscale)
6. Channel setup (QR codes, bot tokens, OAuth flows)
7. Daemon installation (launchd/systemd)
8. Health verification

**Config locations:** Process env, `.env`, `~/.openclaw/.env`, `openclaw.json` (JSON5 format).

**Tech decisions already made:**
- Frontend: React 19 + Vite 6 (largest ecosystem, fast HMR)
- Backend: Rust + Axum 0.8 (local web server, later becomes Tauri backend)
- Types: ts-rs for auto-generating TypeScript from Rust structs
- Architecture: Rust backend runs locally, serves React frontend, handles all system operations
- Distribution: Web wizard is free/MIT, Tauri desktop app is $29 one-time with lifetime updates

**Competitor pricing reference:** Cork (Homebrew GUI) charges $26 one-time. Docker Desktop charges $9-16/month. $29 one-time is market-appropriate.

## Constraints

- **Tech stack**: React 19 frontend + Rust backend — must be portable to Tauri later
- **Architecture**: API-first — backend and frontend are independent, connected via OpenAPI contracts. Frontend is swappable.
- **Target user**: Non-technical users who can't comfortably use a terminal
- **License**: MIT for web wizard, proprietary for desktop app features
- **Dependency**: Tracks OpenClaw's setup flow — must stay compatible as OpenClaw evolves
- **Platform**: Must work on macOS and Linux; Windows via WSL2

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React 19 + Vite 6 over Next.js | No SSR needed for local app, Vite is faster and simpler | ✓ Good |
| Rust/Axum backend over Node.js | Natural Tauri migration path, system-level operations, performance | ✓ Good |
| Local web server architecture | Same model works for web (free) and Tauri (paid), no cloud dependency | ✓ Good |
| ts-rs for TypeScript type generation | Zero-cost type safety between Rust and React, symlink bindings/ | ✓ Good |
| Start with 4 channels | Cover 80% of users (WhatsApp, Telegram, Discord, Slack), reduce v1 scope | ✓ Good |
| Web free / Desktop $29 | MIT builds community and trust, desktop monetizes convenience and native feel | — Pending |
| Guided + auto-detect UX | Auto-detect what we can (OS, Node, existing config), ask about what we can't | ✓ Good |
| Tailwind CSS v4 with Vite plugin | Simpler than PostCSS setup, modern approach | ✓ Good |
| React Context over Redux/Zustand | Wizard state is simple enough, no external dependency needed | ✓ Good |
| sysinfo crate for daemon detection | Cross-platform process scanning without platform-specific APIs | ✓ Good |
| Zod .passthrough() for config | Preserves unknown fields in openclaw.json for forward compatibility | ✓ Good |
| Dark mode color scheme | bg-zinc-900 (#18181B) base, sky-400/60 (#38BDF8) buttons, orange-700 (#C2410C) accent sparingly, light/dark toggle | — v1.1 |
| API-first decoupled architecture | Frontend must be swappable — all features exposed via OpenAPI contracts, UI screen specs documented per phase | — v1.1 |

---
*Last updated: 2026-02-16 after Phase 9 execution complete -- v1.1 shipped*
