# Roadmap: OpenClaw Wizard

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-02-14) — [Archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Polish & Control Center Foundation** — Phases 5-9 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-02-14</summary>

- [x] Phase 1: Foundation & Infrastructure (3/3 plans) — completed 2026-02-14
- [x] Phase 2: Setup Wizard (4/4 plans) — completed 2026-02-14
- [x] Phase 3: Channel Configuration (2/2 plans) — completed 2026-02-14
- [x] Phase 4: Management Dashboard (3/3 plans) — completed 2026-02-14

</details>

### 🚧 v1.1 Polish & Control Center Foundation

**Milestone Goal:** Harden the web wizard for production, add control center capabilities (skill management, service controls, logs), support remote/VPS setup, and publish as open source under MIT.

**Architecture:** API-first — backend and frontend are decoupled via OpenAPI contracts. Each phase produces:
1. OpenAPI spec for new endpoints
2. Backend implementation (Rust/Axum)
3. UI screen spec (screens, flows, states, data requirements — in `.planning/ui-specs/`)
4. Frontend implementation (React, swappable)

**Phase Numbering:**
- Integer phases (5, 6, 7, 8, 9): Planned milestone work
- Decimal phases (5.1, 5.2, etc.): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

#### Phase 5: SSH & Remote Setup

**Goal**: Users can install OpenClaw on remote VPS servers via SSH and complete all setup steps skipped in v1.0

**Depends on**: Phase 4 (v1.0 Dashboard complete)

**Requirements**: SETUP-01, SETUP-04

**Success Criteria** (what must be TRUE):
1. User can enter SSH credentials (hostname, username, password/key) and connect to a remote VPS from the wizard
2. User can run the full OpenClaw setup flow on a remote server with real-time progress feedback
3. User completes all onboard steps now in the wizard (security acknowledgement, gateway bind mode, auth mode, Tailscale config)
4. SSH credentials are stored securely in platform keychain (never localStorage or React state)
5. User sees clear error messages for SSH connection failures with guided resolution steps

**Plans**: 4 plans in 3 waves

Plans:
- [x] 05-01-PLAN.md — SSH Infrastructure & Backend (openssh + keyring integration, CommandOutput types)
- [x] 05-02-PLAN.md — Remote Setup Endpoints & WebSocket (RemoteService orchestration, REST + WS handlers)
- [x] 05-03-PLAN.md — UI Screen Specs & Skipped Steps (phase-05-screens.md, SecurityAck, AdvancedConfig components)
- [x] 05-04-PLAN.md — Remote Setup Frontend (RemoteSetup form, useRemoteSetup hook, RemoteInstallProgress, App.tsx integration)

#### Phase 6: Docker & Skills Management

**Goal**: Users can run OpenClaw in Docker sandbox for safe experimentation and discover/install/manage skills from ClawHub

**Depends on**: Phase 5 (SSH security foundation established)

**Requirements**: SETUP-02, SKIL-01, SKIL-02, SKIL-03, SKIL-04

**Success Criteria** (what must be TRUE):
1. User can select "Docker sandbox mode" during setup and launch OpenClaw in an isolated container
2. User can browse ClawHub skills with category filtering, search, and descriptions
3. User can install and uninstall skills with one click from the wizard
4. User sees VirusTotal security scan results for skills before installation
5. Skills run in sandboxed environment with restricted host access (no Docker socket mounting, resource limits enforced)

**Plans**: 5 plans in 3 waves

Plans:
- [x] 06-01-PLAN.md — Docker Backend (bollard deps, Docker types, DockerService, Docker REST routes)
- [x] 06-02-PLAN.md — Skills Backend + VirusTotal (Skills types, SkillsService with ClawHub + VT scanning, Skills REST routes)
- [x] 06-03-PLAN.md — OpenAPI Spec + UI Screen Specs (phase-06-openapi.yaml, phase-06-screens.md)
- [x] 06-04-PLAN.md — Docker Sandbox Frontend (useDockerSandbox hook, DockerSandbox wizard step, App.tsx integration)
- [x] 06-05-PLAN.md — Skills Browser Frontend (useSkills hook, SkillsBrowser, SkillDetail with VT display, App.tsx integration)

#### Phase 7: Service Management & Logs

**Goal**: Users can control OpenClaw services (gateway, daemon) and view real-time logs with AI-powered error analysis

**Depends on**: Phase 6 (Docker sandboxing enables safe skill execution)

**Requirements**: SRVC-01, SRVC-02, SRVC-03, LOGS-01, LOGS-02

**Success Criteria** (what must be TRUE):
1. User can start, stop, and restart gateway and daemon services independently from the dashboard
2. User can run OpenClaw doctor diagnostics and see results with pass/fail indicators
3. User sees enhanced health status with uptime, resource usage (CPU, memory), and error counts
4. User can view real-time daemon and gateway logs with search, filtering, and ANSI color highlighting
5. User receives AI-generated summaries of log errors with suggested fixes (e.g., "Missing API key — add ANTHROPIC_API_KEY to config")

**Plans**: 5 plans in 3 waves

Plans:
- [x] 07-01-PLAN.md — Service Management Backend (ServiceManager with independent gateway/daemon lifecycle, DoctorService, Phase 7 types)
- [x] 07-02-PLAN.md — Log & Analysis Backend (LogService with streaming + bounded channels, LogAnalyzer with AI analysis + secret redaction)
- [x] 07-03-PLAN.md — REST & WebSocket Routes (service management routes, log routes, WebSocket log streaming, main.rs registration)
- [x] 07-04-PLAN.md — Service Management Frontend (useServiceManager hook, useLogViewer hook, ServiceControls, DoctorDiagnostics, enhanced Dashboard Overview)
- [x] 07-05-PLAN.md — Log Viewer Frontend (LogViewer with ANSI rendering + controls, LogAnalysisPanel with AI results, Dashboard Logs tab integration)

#### Phase 8: Intelligence & Multi-Server

**Goal**: Users receive AI-powered cost and security recommendations and can deploy OpenClaw to multiple servers simultaneously

**Depends on**: Phase 7 (All infrastructure for remote operations established)

**Requirements**: SETUP-03, INTL-01, INTL-02

**Success Criteria** (what must be TRUE):
1. User can select multiple servers and deploy OpenClaw to all of them in one wizard session
2. User receives AI-powered cost optimization recommendations (model substitution with specific savings estimates like "save $X/month by using DeepSeek for sub-agents")
3. User receives security audit results for their config (exposed API keys, insecure settings, missing encryption warnings)
4. Multi-server deployment handles partial failures gracefully with rollback capability
5. AI analysis redacts all secrets from config before sending to external APIs

**Plans**: 5 plans in 3 waves

Plans:
- [x] 08-01-PLAN.md — Intelligence Backend Types & Services (ConfigAnalyzer with AI cost analysis, SecurityAuditor with 8 rule-based checks, Phase 8 types) (completed 2026-02-16)
- [x] 08-02-PLAN.md — Multi-Server Backend (MultiServerOrchestrator with parallel deployment via JoinSet, saga rollback, server persistence) (completed 2026-02-16)
- [x] 08-03-PLAN.md — REST & WebSocket Routes (intelligence routes, multi-server CRUD routes, WebSocket deploy streaming, main.rs registration) (completed 2026-02-16)
- [x] 08-04-PLAN.md — Intelligence Frontend (useConfigAnalyzer hook, CostOptimizer component, SecurityAudit component, Intelligence dashboard tab) (completed 2026-02-16)
- [x] 08-05-PLAN.md — Multi-Server Frontend (useMultiServer hook, MultiServerSetup wizard step, per-server progress cards, App.tsx integration) (completed 2026-02-16)

#### Phase 9: Production Quality

**Goal**: Wizard is production-ready with comprehensive testing, error recovery, polished UI, and published as open source

**Depends on**: Phase 8 (All features complete)

**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04

**Success Criteria** (what must be TRUE):
1. User can toggle dark/light mode with theme persisting across sessions
2. User sees OpenClaw branding (ASCII logo, consistent color scheme) throughout the wizard
3. User sees guided error messages for installation failures and can rollback to previous working state
4. Codebase has test coverage with passing Rust unit tests, Vitest component tests, and E2E tests
5. Project is published as open source with MIT license on npm and crates.io with CI/CD pipeline

**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD
- [ ] 09-03: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Infrastructure | v1.0 | 3/3 | ✓ Complete | 2026-02-14 |
| 2. Setup Wizard | v1.0 | 4/4 | ✓ Complete | 2026-02-14 |
| 3. Channel Configuration | v1.0 | 2/2 | ✓ Complete | 2026-02-14 |
| 4. Management Dashboard | v1.0 | 3/3 | ✓ Complete | 2026-02-14 |
| 5. SSH & Remote Setup | v1.1 | 4/4 | ✓ Complete | 2026-02-14 |
| 6. Docker & Skills Management | v1.1 | 5/5 | ✓ Complete | 2026-02-15 |
| 7. Service Management & Logs | v1.1 | 5/5 | ✓ Complete | 2026-02-16 |
| 8. Intelligence & Multi-Server | v1.1 | 5/5 | ✓ Complete | 2026-02-16 |
| 9. Production Quality | v1.1 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-14*
*Last updated: 2026-02-16 — Phase 8 execution complete (5/5 plans, verified)*
