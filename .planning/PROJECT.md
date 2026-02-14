# OpenClaw Wizard

## What This Is

A visual setup wizard and management dashboard for OpenClaw — the viral open-source personal AI assistant (192K GitHub stars). It replaces the error-prone terminal-based `openclaw onboard` flow with a guided, auto-detecting web UI that non-technical users can actually complete. The Rust backend runs locally, serves a React frontend, and handles all system operations (installing Node, writing config, managing the daemon). The same codebase later becomes a $29 Tauri desktop app.

## Core Value

Non-technical users successfully set up and manage OpenClaw without touching a terminal. If they can click through a wizard, they can run OpenClaw.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Guided setup wizard with auto-detection (OS, Node, existing config)
- [ ] AI model/provider configuration (Anthropic, OpenAI, etc.) with API key validation
- [ ] Gateway configuration (port, bind mode, auth) with smart defaults
- [ ] Channel setup for top 3-4 channels (WhatsApp QR, Telegram bot token, Discord, Slack)
- [ ] Daemon installation and management (start/stop/restart)
- [ ] Health dashboard (gateway status, channel connectivity, uptime, errors)
- [ ] Visual config editor (replace hand-editing openclaw.json)
- [ ] Channel manager (add/remove/reconnect channels, QR re-pairing)
- [ ] Pre-flight environment checks with clear error messages and fix suggestions
- [ ] Works for both local machine and VPS/cloud deployments
- [ ] Open source web wizard under MIT license
- [ ] Rust backend serving React frontend at localhost

### Out of Scope

- Full CLI replacement — wizard handles setup and management, not agent conversations
- Mobile app — desktop/web only for now
- Custom AI model hosting (Ollama integration) — defer to v2
- All 13+ channels in v1 — start with top 3-4, add based on demand
- Skills marketplace — OpenClaw handles skills natively
- Multi-user/team management — single-user focus matches OpenClaw's design

## Context

**The problem:** OpenClaw went viral (9K to 192K GitHub stars in weeks, 416K npm downloads/month) but the TUI-based setup wizard is a major friction point. Documented pain:
- Users spend 3-12 hours troubleshooting setup
- One user spent $300 across 5 VPS reinstalls over 2 days
- The built-in wizard misses questions and doesn't let you go back
- Config files get corrupted on restart
- "Hundreds of thousands of developers set up OpenClaw, play with it for ten minutes, then abandon it"

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

**Config locations:** Process env, `.env`, `~/.openclaw/.env`, `openclaw.json` (JSON5 format). Precedence can confuse users.

**Tech decisions already made:**
- Frontend: React/Next.js (largest ecosystem, most familiar to contributors)
- Backend: Rust (local web server, later becomes Tauri backend)
- Architecture: Rust backend runs locally, serves React frontend, handles all system operations
- Distribution: Web wizard is free/MIT, Tauri desktop app is $29 one-time with lifetime updates

**Competitor pricing reference:** Cork (Homebrew GUI) charges $26 one-time. Docker Desktop charges $9-16/month. $29 one-time is market-appropriate.

## Constraints

- **Tech stack**: React/Next.js frontend + Rust backend — must be portable to Tauri later
- **Target user**: Non-technical users who can't comfortably use a terminal
- **License**: MIT for web wizard, proprietary for desktop app features
- **Dependency**: Tracks OpenClaw's setup flow — must stay compatible as OpenClaw evolves
- **Platform**: Must work on macOS and Linux; Windows via WSL2

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React/Next.js over Rust frontend (Leptos/Dioxus) | Larger ecosystem, faster development, more contributors | — Pending |
| Rust backend over Node.js | Natural Tauri migration path, system-level operations, performance | — Pending |
| Local web server architecture | Same model works for web (free) and Tauri (paid), no cloud dependency | — Pending |
| Start with 3-4 channels | Cover 80% of users (WhatsApp, Telegram, Discord, Slack), reduce v1 scope | — Pending |
| Web free / Desktop $29 | MIT builds community and trust, desktop monetizes convenience and native feel | — Pending |
| Guided + auto-detect UX | Auto-detect what we can (OS, Node, existing config), ask about what we can't | — Pending |

---
*Last updated: 2026-02-14 after initialization*
