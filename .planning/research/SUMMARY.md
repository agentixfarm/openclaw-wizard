# Project Research Summary

**Project:** OpenClaw Wizard v1.1 - Control Center Transformation
**Domain:** Local-first Management Dashboard with Remote Execution, AI Integration & Skills Marketplace
**Researched:** 2026-02-14
**Confidence:** HIGH

## Executive Summary

OpenClaw Wizard v1.1 transforms an existing local setup wizard into a comprehensive control center for managing OpenClaw AI assistants. The research reveals this is a hybrid architecture combining local dashboard patterns (Docker Desktop, Portainer) with remote execution capabilities (VS Code Remote-SSH), skills marketplace integration (VS Code Extensions), and AI-powered optimization (unique to this domain). The recommended approach builds on the proven Axum 0.8 + React 19 foundation, adding SSH remote execution (openssh/async-ssh2-tokio), Docker container management (bollard), real-time log streaming (linemux/WebSocket), and skills discovery (ClawHub API integration).

The path forward prioritizes security-first design patterns: SSH credentials must use platform keychain (never localStorage), Docker containers require strict resource limits to prevent host exhaustion, and skills need WASM-based sandboxing to prevent supply chain attacks. The architecture follows service-oriented patterns where new capabilities (SshService, DockerService, SkillsService, LogStreamService, AuditService) integrate cleanly with existing health monitoring and daemon management services. This allows incremental rollout without disrupting the working v1.0 wizard.

Key risks center on security and reliability: russh CVE-2024-43410 DoS vulnerability requires version pinning (>= 0.44.1), unbounded tokio channels for log streaming create memory leaks under load, and multi-server orchestration needs saga pattern rollback for partial failures. The AI-powered cost optimizer is a unique differentiator (70% savings proven via model routing research), but requires secret redaction before sending configs to external APIs. Implementation should follow a phased approach: security foundations first (SSH credential handling, dependency auditing), then core features (Docker, skills, logs), and finally advanced capabilities (multi-node, AI auditing).

## Key Findings

### Recommended Stack

The v1.1 stack extends the existing React 19 + Axum 0.8 foundation with capabilities for remote execution, containerization, and AI integration. Core additions include async SSH libraries for remote VPS management, Docker API clients for sandboxed environments, log streaming infrastructure for real-time monitoring, and AI API integration for cost optimization and security auditing.

**Core technologies:**
- **async-ssh2-tokio 0.9.1**: High-level async SSH wrapper for remote setup operations — integrates with existing Tokio runtime, simpler API than low-level russh for command execution
- **bollard 0.19.2**: Docker daemon API client for container management — industry standard for Rust, supports all Docker operations, active maintenance with moby API 1.49
- **linemux 0.3.0**: Async log file tailing with multiplexing — purpose-built for streaming daemon/gateway logs via WebSocket, handles non-existent files gracefully
- **async-openai 0.30.1**: OpenAI API client for AI-powered config auditing — most mature unofficial Rust client, full streaming support, recommended starting point (add genai for multi-provider later)
- **@melloware/react-logviewer 6.3.4**: React log viewing component — supports WebSocket/EventSource streaming, ANSI highlighting, lazy-loading, actively maintained
- **Tailwind CSS v4 dark mode**: Built-in selector strategy with CSS variables — no external theme library needed, simpler and faster than styled-components

**Version compatibility:** All new dependencies integrate with existing Tokio 1.47.x runtime. React components forward-compatible with React 19. No breaking changes to v1.0 stack required.

### Expected Features

Research across Docker Desktop, Portainer, LM Studio, and VS Code reveals clear table stakes for modern management dashboards and unique opportunities for differentiation in the AI assistant space.

**Must have (table stakes):**
- **Skills: Browse/Install/Uninstall** — Every marketplace (VS Code, Docker Extensions) has visual discovery with categories and one-click install. ClawHub provides 5,705 skills as of Feb 2026.
- **Log Viewer: Real-time Streaming + Search** — Docker Desktop, Portainer, Better Stack all stream logs live with keyword filtering. Essential for debugging.
- **Service: Start/Stop/Restart** — Non-negotiable for daemon management. Docker Desktop, systemd GUIs expose these controls prominently.
- **Multi-Mode: Local + Docker Sandbox** — Local install is v1.0 default. Docker sandbox aligns with OpenClaw's Feb 2026 Sandbox feature for safe experimentation.
- **Dark Mode Toggle** — Universal expectation in modern desktop apps (VS Code, Docker Desktop, Portainer). Tailwind v4 makes this trivial.

**Should have (competitive differentiators):**
- **AI-Powered Cost Optimizer** — UNIQUE to AI assistant space. LiteLLM research shows 70% cost reduction possible via model routing. No competitor offers this. Analyze config, suggest cheaper models (DeepSeek at $0.10/MTok vs GPT-4 at $30/MTok).
- **Security Auditor: Config Validation** — Tenable/enterprise tools audit configs, but not for AI assistants. Check for exposed API keys, insecure channel configs, missing encryption.
- **Skills: VirusTotal Integration** — OpenClaw has VirusTotal partnership. Surface security scans before install. Unique trust signal vs competitors.
- **Multi-Mode: SSH Remote Install** — VS Code Remote-SSH proves demand for remote management. Install OpenClaw on headless VPS from desktop wizard.

**Defer (v2+):**
- **Multi-Mode: Multi-Node Cluster** — Very high complexity, enterprise feature. Defer until demand signals emerge.
- **Log Viewer: AI Anomaly Detection** — Ambitious ML feature requiring training data and models. Better Stack offers this, but too complex for v1.1.
- **Real-Time Cost Tracking** — Requires instrumenting OpenClaw core. Out of wizard scope. Partner with observability tools instead.
- **Built-in Skill Editor** — Duplicates VS Code. Just open skill directory in user's editor.

### Architecture Approach

The architecture follows a service-oriented pattern where new v1.1 capabilities are implemented as isolated service modules that integrate cleanly with existing v1.0 infrastructure. Each capability (SSH remote execution, Docker container management, skills discovery, log streaming, AI auditing) gets its own service module with clear separation of concerns, called by route handlers that expose REST/WebSocket APIs to the React frontend.

**Major components:**
1. **SshService (NEW)** — Connection pooling for remote VPS command execution. Uses openssh crate for async operations, implements LRU eviction to prevent connection exhaustion (max 5 per host).
2. **DockerService (NEW)** — Container lifecycle management via bollard. Creates sandboxed OpenClaw instances with strict resource limits (--memory, --cpus, --pids-limit) to prevent host exhaustion.
3. **SkillsService (NEW)** — npm registry integration for discovering openclaw-skill packages. Parses metadata, handles install/uninstall via SafeCommand wrapper.
4. **LogStreamService (NEW)** — Tail daemon/gateway logs using subprocess + mpsc channel → WebSocket. Uses bounded channels (capacity 1000) with backpressure to prevent memory leaks.
5. **AuditService (NEW)** — AI API integration (OpenAI/Claude) for config analysis. Implements secret redaction before sending to external APIs, caches results by config hash.
6. **RemoteService (NEW)** — Multi-node coordination using SshService. Implements saga pattern for rollback on partial failures, tracks deployment state per server.

**Integration with existing:** HealthService, DaemonService, ConfigService, SafeCommand remain unchanged. New services extend capabilities without modifying v1.0 patterns. TypeScript types auto-generated via ts-rs maintain type safety across stack.

### Critical Pitfalls

1. **SSH Credential Storage in Browser Memory (CRITICAL)** — Storing SSH keys/passwords in React state or localStorage exposes them to XSS attacks and creates permanent attack surface. Use platform keychain (keyring crate), never cache credentials, load from secure storage only when needed. Address in Phase 1 (SSH Security Foundation) before any SSH code.

2. **Unauthenticated Memory Allocation DoS in russh (CVE-2024-43410)** — Versions before 0.44.1 allow remote DoS via untrusted packet lengths. Pin to russh >= 0.44.1, run cargo-audit in CI, implement connection rate limiting. Address in Phase 1 (SSH Dependencies).

3. **Docker Socket Mounting = Root Access (CRITICAL)** — Mounting /var/run/docker.sock into containers grants unrestricted host access, enabling container escape. Never mount socket, use rootless Docker, call API from Rust backend only. Address in Phase 2 (Docker Security Architecture).

4. **Skill Dependency Hell and Supply Chain Attacks** — Skills are untrusted code with arbitrary execution. Malicious skills can steal credentials or mine crypto. Implement WASM-based sandboxing with capability-based security (wasmtime), verify signatures, default deny all capabilities. Address in Phase 3 (Skills Sandbox Architecture).

5. **Unbounded Channel Memory Leaks in Log Streaming** — Using tokio::sync::mpsc::unbounded_channel() for logs causes memory growth until OOM when producers output faster than consumers process. Use bounded channels (capacity 1000), implement backpressure, rate limiting. Address in Phase 4 (Log Streaming Foundation).

## Implications for Roadmap

Based on research, suggested phase structure follows dependency order and security-first principles:

### Phase 1: SSH Security & Remote Foundation (Week 1)
**Rationale:** Security must come first. SSH credential handling and dependency management are prerequisites for all remote features. Establishing secure patterns now prevents costly security retrofitting later.

**Delivers:**
- Secure SSH credential storage via platform keychain (keyring crate)
- russh >= 0.44.1 with CVE-2024-43410 fix
- SshService with connection pooling and rate limiting
- Single remote VPS setup endpoint (/api/remote/setup)

**Addresses:**
- Pitfall 1 (SSH credential storage)
- Pitfall 2 (russh CVE)
- Multi-Mode: SSH Remote Install (basic version)

**Avoids:** SSH credentials in localStorage, DoS vulnerabilities, connection exhaustion

### Phase 2: Docker Container Management (Week 2)
**Rationale:** Docker sandboxing enables safe skill execution (dependency for Phase 3). Security architecture must be established before arbitrary code execution. Resource limits prevent host exhaustion.

**Delivers:**
- DockerService with bollard integration
- Container CRUD operations with strict resource limits
- /api/docker/* routes for container management
- Docker sandbox mode in wizard

**Uses:**
- bollard 0.19.2 for Docker API
- Existing SafeCommand patterns for validation

**Implements:**
- DockerService component from architecture
- Multi-Mode: Docker Sandbox feature

**Avoids:** Docker socket mounting, unbounded container creation, resource exhaustion (Pitfall 3, 10)

### Phase 3: Skills Discovery & Sandboxing (Week 3)
**Rationale:** Skills are highest user value but also highest risk. WASM sandboxing must be in place before exposing ClawHub marketplace. VirusTotal integration builds trust.

**Delivers:**
- SkillsService with npm registry search
- WASM-based skill execution sandbox (wasmtime)
- Skills browser UI with category filtering
- VirusTotal security scanning integration
- /api/skills/* routes

**Addresses:**
- Skills: Browse/Install/Uninstall (table stakes)
- Skills: Categories (table stakes)
- Skills: VirusTotal Integration (differentiator)

**Avoids:** Supply chain attacks, dependency conflicts, privilege escalation (Pitfall 4)

### Phase 4: Log Streaming & Monitoring (Week 4)
**Rationale:** Logs are essential for debugging skills and remote operations from Phases 2-3. Bounded channels prevent memory leaks discovered in research. ANSI sanitization prevents terminal injection attacks.

**Delivers:**
- LogStreamService with bounded channels (capacity 1000)
- /ws/logs WebSocket handler
- LogViewer React component with search/filter
- ANSI escape sequence sanitization

**Addresses:**
- Log Viewer: Real-time Streaming + Search (table stakes)

**Avoids:** Memory leaks, terminal injection attacks (Pitfall 5, 6)

### Phase 5: AI-Powered Optimization (Week 5)
**Rationale:** Unique differentiator but requires secret redaction (dependency on config parsing from v1.0). Cost optimizer leverages research showing 70% savings via model routing.

**Delivers:**
- AuditService with OpenAI/Claude integration
- Secret redaction before AI API calls
- Cost optimizer with model recommendations
- Security auditor for config validation
- /api/audit/* routes

**Addresses:**
- Cost Optimizer: Model Recommendations (differentiator)
- Security Auditor: Config Validation (differentiator)

**Avoids:** Secrets leakage to AI APIs, hallucination trust issues (Pitfall 7)

### Phase 6: Multi-Server & Polish (Week 6)
**Rationale:** Multi-server orchestration requires all prior infrastructure (SSH, Docker, skills, logs). Saga pattern prevents inconsistent state from partial failures. Dark mode is low-risk quality-of-life addition.

**Delivers:**
- RemoteService with saga pattern rollback
- Multi-node coordination via parallel SSH
- /api/remote/multi-setup route
- Dark mode with Tailwind v4 + theme context
- Integration of all control center features

**Addresses:**
- Multi-Mode: Multi-Server (advanced feature)
- Dark Mode Toggle (table stakes)

**Avoids:** Partial deployment failures, inconsistent state (Pitfall 8)

### Phase Ordering Rationale

- **Security first:** Phases 1-2 establish SSH and Docker security foundations before exposing untrusted code execution (skills) or remote operations. Retrofitting security is nearly impossible.
- **Dependencies drive order:** Skills (Phase 3) require Docker sandboxing (Phase 2). Multi-server (Phase 6) requires SSH reliability (Phase 1) and orchestration patterns tested in earlier phases.
- **Value early:** Skills discovery (Phase 3) and log streaming (Phase 4) deliver high user value and can be released incrementally. AI optimization (Phase 5) is differentiator but depends on secret redaction patterns.
- **Pitfall avoidance:** Each phase addresses 1-2 critical pitfalls from research. Memory leaks (Phase 4), credential storage (Phase 1), container escape (Phase 2) are sequenced to prevent security/reliability debt.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Skills Sandboxing):** WASM sandboxing with wasmtime is complex. Need to research capability-based security patterns, WASI filesystem access controls, resource limits. Sparse documentation for Rust + WASM plugins.
- **Phase 5 (AI Integration):** Secret redaction patterns, prompt engineering for structured output, RAG for hallucination prevention. Research ongoing best practices for AI config analysis.
- **Phase 6 (Multi-Server):** Saga pattern implementation in Rust, distributed state tracking, idempotent operations. Research orchestration failure modes.

Phases with standard patterns (skip research-phase):
- **Phase 1 (SSH):** SSH connection pooling is well-documented in openssh examples. Keyring integration has clear crates.io docs.
- **Phase 2 (Docker):** bollard has extensive documentation, Docker resource limits are standard practice. OWASP cheat sheets cover security.
- **Phase 4 (Logs):** WebSocket + mpsc channel is existing v1.0 pattern. Bounded channels documented in Tokio tutorial.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All dependencies verified with crates.io/npm. bollard 0.19.2, async-ssh2-tokio 0.9.1, linemux 0.3.0, async-openai 0.30.1 confirmed. Tailwind v4 dark mode official docs. React 19 compatibility verified. |
| Features | HIGH | Table stakes validated against Docker Desktop, Portainer, VS Code, LM Studio. ClawHub skill count (5,705) confirmed from Feb 2026 sources. Cost optimization percentages (70%, 28x savings) from AI Pricing Master research. |
| Architecture | HIGH | Service-oriented patterns match existing v1.0 codebase structure. openssh examples, bollard docs, Axum WebSocket tutorial provide clear implementation paths. WASM sandboxing documented via wasmtime official docs. |
| Pitfalls | HIGH | CVE-2024-43410 confirmed via CVE database. Docker socket escape documented in OWASP, Wiz Academy. Unbounded channel leak confirmed in Tokio issue #4321. ANSI escape injection documented with recent CVEs (2026). |

**Overall confidence:** HIGH

### Gaps to Address

- **WASM skill sandboxing specifics:** Research identified wasmtime as solution, but capability-based security implementation details need deeper exploration during Phase 3 planning. Plan to use /gsd:research-phase for WASI filesystem access patterns.

- **AI prompt engineering for structured output:** Research shows hallucination prevention via RAG and chain-of-thought, but specific prompts for config analysis need iteration. Plan to test with sample configs during Phase 5 implementation.

- **Multi-server saga pattern in Rust:** Research identified saga pattern for rollback, but Rust-specific implementations sparse. Plan to research paxakos crate or implement custom state machine during Phase 6.

- **ClawHub API integration:** Research confirms 5,705 skills exist, but API authentication, rate limits, pagination not documented. Plan to reverse-engineer from openclaw CLI or contact OpenClaw team during Phase 3.

- **Secret redaction edge cases:** Research shows need to redact API keys, but handling embedded secrets in nested config objects requires careful parsing. Plan to test with realistic configs containing various secret formats.

## Sources

### Primary (HIGH confidence)
- bollard GitHub/crates.io — Docker API client (version 0.19.2 confirmed)
- async-ssh2-tokio docs.rs — SSH library (version 0.9.1 confirmed)
- Tokio issue #4321 — Unbounded channel memory leak confirmed
- CVE-2024-43410 — russh DoS vulnerability confirmed
- Docker Security - OWASP Cheat Sheet — Socket mounting risks, resource limits
- Tailwind CSS v4 dark mode docs — Official selector strategy
- OpenAI API docs — Cost controls, rate limits, privacy policies

### Secondary (MEDIUM confidence)
- Docker Desktop, Portainer, LM Studio feature comparisons — Table stakes validation
- AI Pricing Master (70% cost optimization research) — Model routing savings
- OpenClaw documentation (skills, ClawHub) — 5,705 skill count from Feb 2026 sources
- VS Code Remote-SSH patterns — Multi-mode remote setup validation
- Better Stack, Kloudfuse log monitoring tools — Log streaming best practices
- Sherlock Rust Security Guide 2026 — Credential management, auditing tools

### Tertiary (LOW confidence, needs validation)
- wasmtime security docs — WASM sandboxing patterns (need to validate with testing)
- paxakos crate — Distributed consensus for multi-server (alternative: custom saga)
- ClawHub API (undocumented) — Needs reverse engineering or team contact

---
*Research completed: 2026-02-14*
*Ready for roadmap: yes*
