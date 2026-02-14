# Feature Research

**Domain:** Setup Wizard / Installer GUI for Complex CLI Applications
**Researched:** 2026-02-14
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Step-by-step wizard flow** | Universal pattern in installers; users expect sequential, guided experience | LOW | Horizontal or vertical step indicators; vertical placement tested better for desktop apps |
| **Progress indicators** | Users need to know where they are in the process | LOW | Must show: current step, completed steps, remaining steps. Checkmarks for completion. |
| **Input validation with clear errors** | Prevents user mistakes; installer crashes/failures erode trust | MEDIUM | Real-time validation for API keys, ports, paths. Must provide actionable error messages ("Port 3000 is in use. Try 3001 or stop the conflicting service"). |
| **Dependency detection and installation** | Non-technical users can't diagnose missing prerequisites | HIGH | Auto-detect Node.js version, offer to install if missing. Handle platform differences (macOS/Linux/WSL2). |
| **Configuration preview before commit** | Users want to verify settings before applying changes | LOW | Summary screen showing all selections before final installation. Allow back navigation to edit. |
| **System requirements check** | First screen should validate environment can run the app | MEDIUM | Check OS version, available disk space, network connectivity, write permissions. |
| **Success confirmation** | Users need clear signal that setup completed successfully | LOW | Dedicated success screen with "What's next" guidance, not just "Close" button. |
| **Safe defaults for technical settings** | Non-technical users don't understand ports, bind modes, auth | LOW | Pre-select sensible defaults (port 3000, localhost bind, password auth). Show "Advanced" disclosure for experts. |
| **Ability to pause and resume** | Complex setups may require external steps (getting API keys) | MEDIUM | Save progress, allow users to exit and return. Especially important for API key acquisition. |
| **Visual feedback during long operations** | Installing dependencies/packages can take minutes | LOW | Spinner/progress bar with status text ("Installing Node.js... 2/5 minutes"). Prevent perceived freezing. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable for OpenClaw Wizard specifically.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Auto-detection of existing config** | Users who partially set up OpenClaw can skip completed steps | HIGH | Scan for `openclaw.json`, `.env` files, running daemon. Pre-populate wizard with found values. Handles multiple config locations and precedence rules. |
| **Interactive QR code display for WhatsApp** | Eliminates copy-paste errors; matches mobile pairing UX pattern | MEDIUM | Real-time QR generation and display. Must handle session timeout and regeneration. Critical for WhatsApp channel setup. |
| **Smart environment variable management** | OpenClaw has 4 config locations with precedence rules — users confused | HIGH | Visual representation of config precedence. Wizard writes to canonical location, shows what will be used. Prevents "I set it but it's not working" issues. |
| **Live health dashboard post-setup** | Users need ongoing visibility into whether OpenClaw is working | MEDIUM | Real-time status: gateway up/down, channels connected, recent errors. Differentiates from "install and pray" tools. |
| **One-click daemon management** | Non-technical users can't diagnose systemd/launchd issues | MEDIUM | Start/Stop/Restart buttons with status indicators. Show logs on failure. Handles platform differences (macOS launchd vs Linux systemd). |
| **API key validation before proceeding** | Prevents completing setup with invalid credentials | MEDIUM | Test API key with provider (Anthropic, OpenAI) before saving. Immediate feedback vs discovering failure later. |
| **Channel reconnection workflows** | WhatsApp sessions expire; users need to re-pair without full reinstall | HIGH | Detect disconnected channels. One-click "Reconnect" that regenerates QR or re-prompts for token. Preserves other config. |
| **Guided error recovery** | When setup fails, suggest fixes instead of generic error messages | HIGH | Context-aware suggestions: "Node not found → Install Node.js?" or "Port busy → Try port 3001?". Reduces support burden. |
| **Config import/export** | Power users want to replicate setups across machines | LOW | Export `openclaw.json` + env vars as single file. Import on new machine to skip wizard. Good for VPS migrations. |
| **Post-install checklist** | Users forget post-setup steps (opening ports, testing channels) | LOW | Actionable checklist after installation: "Send test message to WhatsApp", "Verify Discord bot responds". Increases activation. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this specific use case.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full CLI replacement** | "Why not manage conversations in the GUI too?" | Scope creep; OpenClaw's TUI already handles this well. GUI overhead for ephemeral interactions. | Focus on setup and config management. Link to OpenClaw CLI for conversations. |
| **Cloud-hosted wizard** | "Make it a web service users visit" | Security risk (API keys over network). Trust issue with new tool. Deployment/maintenance burden. | Local Rust server at localhost. Zero network exposure for sensitive data. |
| **Support for all 13+ channels in v1** | "Complete feature parity with OpenClaw" | 80% of users need WhatsApp/Telegram/Discord/Slack. Remaining channels add complexity without proportional value. | Ship 4 channels, add based on demand/telemetry. |
| **Automatic updates for OpenClaw** | "Keep OpenClaw current automatically" | Version conflicts, breaking changes. Users want control over updates for production systems. | Show "Update available" notification, link to instructions. Don't force. |
| **Multi-user/team management** | "Manage multiple OpenClaw instances" | OpenClaw is single-user by design. Multi-tenant adds auth, isolation, complexity. | Single instance focus. Document multi-VPS setups for teams. |
| **Built-in Ollama/local model support** | "No API costs!" | Ollama integration increases setup complexity significantly. GPU requirements, model downloads. Defers adoption. | Defer to v2. Start with API providers (lower friction). |
| **Undo/rollback during wizard** | "Let users go back and change answers" | State management complexity when steps have side effects (installed Node, wrote files). Hard to truly "undo" system changes. | Allow editing in final summary screen before commit. Clear "Start over" option. |
| **Animated/elaborate UI** | "Make it look premium" | Adds weight to React bundle, slows first load. Distracts from task completion. Over-designed for utility tool. | Clean, functional UI. Fast load times > visual flair for installer. |

## Feature Dependencies

```
System Requirements Check
    └──requires──> Dependency Detection & Installation
                       └──requires──> Configuration Setup
                                          └──requires──> Daemon Installation
                                                             └──requires──> Health Verification

Auto-detection of Existing Config ──enhances──> Step-by-step Wizard (skips completed steps)

API Key Validation ──requires──> Input Validation with Clear Errors

Live Health Dashboard ──requires──> Daemon Management (needs daemon running to monitor)

Channel Reconnection ──requires──> Auto-detection (must detect disconnected state)

Config Import/Export ──enhances──> Wizard Flow (bypasses wizard for repeat setups)

Guided Error Recovery ──requires──> System Requirements Check + Dependency Detection
```

### Dependency Notes

- **System checks must run first:** Can't install Node if we don't know the OS or lack write permissions.
- **Daemon management enables health monitoring:** Dashboard is useless without ability to start/stop daemon.
- **Auto-detection amplifies wizard UX:** Detecting existing config transforms wizard from "start from scratch" to "complete what's missing."
- **API validation depends on input validation:** Can't test API key if input format is invalid (empty, wrong format).
- **Channel reconnection is high-value but complex:** Requires detecting disconnected state, preserving other config, handling provider-specific re-auth flows.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept and deliver core value.

- [x] **Step-by-step wizard flow** — Core UX pattern. Users expect it. Can't ship without it.
- [x] **Progress indicators** — Prevents confusion ("How much longer?"). Table stakes.
- [x] **System requirements check** — Prevents wasted time if environment can't run OpenClaw.
- [x] **Dependency detection and installation** — Primary pain point (Node.js). Must automate.
- [x] **Input validation with clear errors** — Prevents bad config. Reduces support burden.
- [x] **Safe defaults for technical settings** — Non-technical users need sensible pre-selections.
- [x] **API key validation before proceeding** — Catches credential issues early. High value, medium complexity.
- [x] **Configuration preview before commit** — Final safety check. Easy to implement.
- [x] **Success confirmation** — Clear completion signal. Guides next steps.
- [x] **Visual feedback during long operations** — Node install can take 3-5 minutes. Prevent perceived freeze.
- [x] **Auto-detection of existing config** — Differentiator. Handles partial setups (common scenario).
- [x] **Interactive QR code display for WhatsApp** — Critical for #1 requested channel. Mobile pairing pattern.
- [x] **One-click daemon management** — Core value prop: non-technical users managing OpenClaw. Must have.
- [x] **Live health dashboard post-setup** — Validates setup worked. Ongoing value beyond wizard. Differentiator.

**Rationale:** These 14 features deliver on "non-technical users successfully set up OpenClaw without touching terminal." Everything below this line is enhancement, not enablement.

### Add After Validation (v1.x)

Features to add once core is working and we have user feedback.

- [ ] **Guided error recovery** — (Trigger: >10% of users fail setup with same error)
- [ ] **Channel reconnection workflows** — (Trigger: WhatsApp session expiry becomes top support issue)
- [ ] **Config import/export** — (Trigger: Users request multi-VPS setup guidance)
- [ ] **Post-install checklist** — (Trigger: <60% of installed users send first message)
- [ ] **Smart environment variable management** — (Trigger: Config precedence questions in support)
- [ ] **Ability to pause and resume** — (Trigger: Users abandon wizard mid-flow to get API keys)

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **All 13+ OpenClaw channels** — Start with top 4, add based on demand.
- [ ] **Ollama/local model support** — Significant complexity, niche use case in v1.
- [ ] **Multi-language wizard** — English-first, localize after traction.
- [ ] **Telemetry/analytics opt-in** — Useful for understanding drop-off, but privacy-sensitive.
- [ ] **Plugin system for custom channels** — Advanced use case, defers to v2.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Step-by-step wizard flow | HIGH | LOW | P1 |
| Progress indicators | HIGH | LOW | P1 |
| System requirements check | HIGH | MEDIUM | P1 |
| Dependency detection & installation | HIGH | HIGH | P1 |
| Input validation with clear errors | HIGH | MEDIUM | P1 |
| Safe defaults for technical settings | HIGH | LOW | P1 |
| API key validation | HIGH | MEDIUM | P1 |
| Configuration preview | MEDIUM | LOW | P1 |
| Success confirmation | MEDIUM | LOW | P1 |
| Visual feedback during operations | MEDIUM | LOW | P1 |
| Auto-detection of existing config | HIGH | HIGH | P1 |
| Interactive QR code for WhatsApp | HIGH | MEDIUM | P1 |
| One-click daemon management | HIGH | MEDIUM | P1 |
| Live health dashboard | HIGH | MEDIUM | P1 |
| Guided error recovery | HIGH | HIGH | P2 |
| Channel reconnection workflows | HIGH | HIGH | P2 |
| Config import/export | MEDIUM | LOW | P2 |
| Post-install checklist | MEDIUM | LOW | P2 |
| Smart env var management | MEDIUM | HIGH | P2 |
| Pause and resume wizard | MEDIUM | MEDIUM | P2 |
| All 13+ channels | LOW | HIGH | P3 |
| Ollama/local model support | MEDIUM | HIGH | P3 |
| Multi-language support | MEDIUM | MEDIUM | P3 |
| Telemetry/analytics | LOW | MEDIUM | P3 |

**Priority key:**
- **P1:** Must have for launch — delivers core value, table stakes, or key differentiator
- **P2:** Should have after validation — adds polish, handles edge cases, improves retention
- **P3:** Nice to have in future — expands audience, advanced use cases, nice-to-haves

## Competitor Feature Analysis

| Feature | Docker Desktop | Cork (Homebrew GUI) | Portainer | OpenClaw Wizard Approach |
|---------|----------------|---------------------|-----------|--------------------------|
| **System requirements check** | Yes (WSL2, Hyper-V) | No (assumes Homebrew installed) | Minimal (browser check) | Yes — check OS, Node, disk space, permissions |
| **Dependency installation** | Yes (enables WSL2/Hyper-V) | No (uses existing Homebrew) | No (Docker prerequisite) | Yes — install Node.js if missing |
| **Progress indicators** | Yes (install steps shown) | Yes (package install progress) | Yes (deployment progress) | Yes — vertical step list with checkmarks |
| **Configuration preview** | Limited (checkbox selections) | No | No | Yes — summary screen before commit |
| **Auto-detection** | Yes (existing Docker install) | Yes (installed packages) | Yes (Docker environments) | Yes — existing OpenClaw config + running daemon |
| **API key/credential management** | No (sign-in flow separate) | No | Yes (registries, endpoints) | Yes — validate before proceeding |
| **Post-install dashboard** | Yes (full Docker Desktop UI) | Yes (package management) | Yes (container management) | Yes — health status, channel connectivity |
| **QR code workflows** | No | No | No | Yes — critical for WhatsApp pairing |
| **Daemon/service management** | Yes (start/stop Docker) | Yes (Homebrew services) | Yes (container lifecycle) | Yes — systemd/launchd abstraction |
| **Error recovery guidance** | Limited (generic errors) | No | Limited | Yes — context-aware suggestions |
| **Multi-step wizard** | Yes (setup flow) | No (direct to UI) | Yes (environment wizard) | Yes — guided flow to completion |
| **Rollback/uninstall** | Yes (uninstaller) | Yes (brew uninstall) | Yes (remove containers) | Defer to v2 (complex with system changes) |

**Key insight:** Docker Desktop and Portainer excel at post-install management dashboards. Cork focuses on simplicity over wizard flow. OpenClaw Wizard must blend Docker's guided setup with Portainer's ongoing management UX, while adding channel-specific features (QR codes) that competitors don't need.

## Implementation Complexity Assessment

### Low Complexity (1-2 days each)
- Progress indicators (standard React component)
- Safe defaults (config templates)
- Configuration preview (render saved state)
- Success confirmation (static screen)
- Visual feedback during operations (spinners, progress bars)
- Post-install checklist (static list with checkbox state)
- Config import/export (read/write JSON)

### Medium Complexity (3-5 days each)
- System requirements check (platform-specific detection)
- Input validation with errors (regex, real-time validation)
- API key validation (HTTP requests to providers)
- Interactive QR code display (WebSocket or polling for session state)
- One-click daemon management (exec systemd/launchd commands)
- Live health dashboard (WebSocket or polling OpenClaw gateway)
- Pause and resume wizard (state persistence to disk)

### High Complexity (1-2 weeks each)
- Dependency detection & installation (platform-specific Node.js install, error handling)
- Auto-detection of existing config (scan multiple locations, resolve precedence)
- Guided error recovery (error taxonomy, suggestion mapping)
- Channel reconnection workflows (per-channel state detection, re-auth flows)
- Smart environment variable management (visual precedence display, multi-location writes)

## Sources

**Setup Wizard Best Practices:**
- [Creating a setup wizard (and when you shouldn't) - LogRocket Blog](https://blog.logrocket.com/ux-design/creating-setup-wizard-when-you-shouldnt/)
- [Wizard UI Pattern: When to Use It and How to Get It Right - Eleken](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained)
- [Best Practices for High-Conversion Wizard UI Design & Examples - Lollypop](https://lollypop.design/blog/2026/january/wizard-ui-design/)

**Installer Examples:**
- [Docker Desktop Installation Guide - Docker Docs](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Initial setup | Portainer Documentation](https://docs.portainer.io/start/install/server/setup)
- [Cork: The Homebrew GUI for macOS](https://corkmac.app/)
- [GitHub - buresdv/Cork](https://github.com/buresdv/Cork)

**Channel Setup:**
- [OpenClaw (Clawdbot) Tutorial: Control Your PC from WhatsApp - DataCamp](https://www.datacamp.com/tutorial/moltbot-clawdbot-tutorial)
- [Clawdbot WhatsApp & Telegram Setup in 20 Minutes (2026 Guide) - Serenities AI](https://serenitiesai.com/articles/clawdbot-whatsapp-telegram-setup)

**Progress Indicators & Visual Feedback:**
- [32 Stepper UI Examples and What Makes Them Work - Eleken](https://www.eleken.co/blog-posts/stepper-ui-examples)
- [Progress Indicator UI Design: Best practices - Mobbin](https://mobbin.com/glossary/progress-indicator)
- [Progress Bar Indicator UX/UI Design & Feedback Notifications - Usersnap](https://usersnap.com/blog/progress-indicators/)

**Onboarding & First-Run Experience:**
- [What is an Onboarding Wizard (with Examples) - UserGuiding](https://userguiding.com/blog/what-is-an-onboarding-wizard-with-examples)
- [17 Best Onboarding Flow Examples for New Users (2026) - Whatfix](https://whatfix.com/blog/user-onboarding-examples/)
- [The Old vs. The New: Why the Onboarding Wizard Falls Short - Userpilot](https://userpilot.com/blog/onboarding-wizard/)

**Daemon & Process Management:**
- [Managing Linux Processes. Mastering Daemons: 5 Essential Tools - Medium](https://medium.com/design-bootcamp/managing-linux-processes-aa6df7ebc0f1)
- [PM2 - Home](https://pm2.keymetrics.io/)

**Health Monitoring:**
- [System Health Monitoring - EventSentry](https://www.eventsentry.com/features/system-health-monitoring/)
- [Server Health Monitoring: Key Metrics & Tools - Middleware](https://middleware.io/blog/server-health-monitoring/)

**API Key Management:**
- [Feature: Simplified API Key Management via CLI/Dashboard - GitHub Issue #5418](https://github.com/openclaw/openclaw/issues/5418)
- [API Key Management | Definition and Best Practices - Infisical](https://infisical.com/blog/api-key-management)

---
*Feature research for: OpenClaw Wizard*
*Researched: 2026-02-14*
