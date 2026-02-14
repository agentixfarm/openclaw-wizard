# OpenClaw Wizard

## What This Is

A visual setup wizard and management dashboard for OpenClaw — the viral open-source personal AI assistant (192K GitHub stars). It replaces the error-prone terminal-based `openclaw onboard` flow with a guided, auto-detecting web UI that non-technical users can actually complete. The Rust backend (Axum) runs locally, serves a React 19 frontend, and handles all system operations (installing Node, writing config, managing the daemon). The same codebase later becomes a $29 Tauri desktop app.

## Core Value

Non-technical users successfully set up and manage OpenClaw without touching a terminal. If they can click through a wizard, they can run OpenClaw.

## Current State

**Shipped:** v1.0 MVP (2026-02-14)
**Codebase:** 8,320 LOC (Rust + TypeScript), 96 files
**Tech stack:** Axum 0.8 + React 19 + Vite 6 + Tailwind CSS v4 + ts-rs type generation

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

### Active

- [ ] Tauri desktop app packaging ($29 product)
- [ ] Works for both local machine and VPS/cloud deployments (testing needed)
- [ ] Open source web wizard under MIT license (publish to npm/crates.io)

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

---
*Last updated: 2026-02-14 after v1.0 milestone*
