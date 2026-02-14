# Feature Research

**Domain:** Setup Wizard / Installer GUI for Complex CLI Applications + Control Center Management
**Researched:** 2026-02-14 (Updated for v1.1 milestone)
**Confidence:** HIGH (v1.0 features) / MEDIUM (v1.1 features)

---

## Milestone Context

**v1.0 (Shipped):** 8-step setup wizard, basic health dashboard, daemon controls
**v1.1 (This Research):** Transform wizard into control center with skills management, AI-powered optimization, multi-mode setup, advanced service controls

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

#### v1.0 Features (Already Shipped)

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
| **Visual feedback during long operations** | Installing dependencies/packages can take minutes | LOW | Spinner/progress bar with status text ("Installing Node.js... 2/5 minutes"). Prevent perceived freezing. |

#### v1.1 New Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Skills: Browse & Install** | VS Code, Docker Desktop, LM Studio all have visual marketplace browsers | MEDIUM | Users expect category filtering, search, one-click install. OpenClaw has ClawHub with 5,705 skills (Feb 2026). Implementation requires API integration with ClawHub registry. |
| **Skills: Uninstall** | Every package manager (npm, apt, Homebrew) supports removal | LOW | Users expect clean removal without manual file deletion. Must handle workspace vs managed vs bundled skill precedence. |
| **Skills: Categories** | VS Code organizes by 15+ categories (Debuggers, Linters, Testing, etc.) | LOW | ClawHub already categorizes skills. UI must surface these for filtering. |
| **Service: Start/Stop/Restart** | Docker Desktop, systemd GUIs, macOS launchd managers all expose these | LOW | Non-negotiable for any daemon management tool. Already in v1.0. Enhancement: visual feedback on state changes. |
| **Log Viewer: Real-time Streaming** | LogFusion, Docker Desktop, Portainer all stream logs live | MEDIUM | Users expect live updates without refresh. WebSocket or polling required. Must handle high-volume log streams without UI lag. |
| **Log Viewer: Search/Filter** | All log viewers (Better Stack, LogViewPlus) include filtering | MEDIUM | Users expect keyword search, log level filtering, timestamp ranges. Essential for debugging. |
| **Multi-Mode: Local Install** | Primary use case for non-technical users | LOW | Already exists in v1.0 as default mode. |
| **Config Editor: Visual Forms** | Docker Desktop, Portainer use form-based config over raw YAML | LOW | Already in v1.0. Enhancement: validation feedback inline. |
| **Dark Mode Toggle** | Expected in all modern desktop apps (VS Code, Docker Desktop, Portainer) | LOW | UI framework support required. Must persist preference. |
| **Health Status Indicators** | Docker Desktop shows container status, Portainer shows service health | LOW | Already in v1.0 dashboard. Visual indicators (green/yellow/red) expected. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

#### v1.0 Differentiators (Already Shipped)

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

#### v1.1 New Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI-Powered Cost Optimizer** | No competitor offers AI model cost analysis for assistants. LiteLLM shows 70% cost reduction possible via model routing. | HIGH | Analyze current config, suggest cheaper models for tasks (e.g., Gemini 2.0 Flash at $0.10/MTok vs GPT-4 at $30/MTok). Show projected savings. This is unique to AI assistant space. |
| **Cost Optimizer: Model Recommendations** | Users don't know DeepSeek costs 28x less than premium models | MEDIUM | Requires model pricing database, usage pattern analysis. Surface recommendations: "Switch to X for 60% savings on routine tasks." |
| **Cost Optimizer: Savings Dashboard** | Visualize "You could save $X/month" motivates config changes | MEDIUM | Depends on cost analyzer. Chart showing current spend vs optimized spend. Real-time as config changes. |
| **Security Auditor: Config Validation** | Tenable and enterprise tools audit configs, but not for AI assistants | MEDIUM | Check for: exposed API keys, insecure channel configs, missing encryption. Flag misconfigurations before they cause breaches. |
| **Security Auditor: Fix Suggestions** | Going beyond "this is wrong" to "here's how to fix it" | MEDIUM | Actionable recommendations with one-click apply. "API key in plaintext → Move to environment variable." |
| **Skills: VirusTotal Security Scanning** | OpenClaw has VirusTotal partnership. Surface this in UI. | LOW | Before install, show VirusTotal report. Prevents malicious skill installation. Unique trust signal. |
| **Skills: Dependency Visualization** | Show which skills depend on each other before uninstall | MEDIUM | Prevent "I removed X and Y broke." Graph view or warning dialog. |
| **Multi-Mode: SSH Remote Install** | VS Code Remote-SSH shows demand for remote management | HIGH | Install OpenClaw on headless server via SSH from desktop wizard. Docker's DOCKER_HOST=ssh:// pattern. Requires SSH library, remote script execution, state sync. |
| **Multi-Mode: Multi-Node Cluster** | Portainer and Kubernetes managers support multi-cluster | VERY HIGH | Deploy OpenClaw across multiple machines (load balancing, failover). Complex: cluster coordination, health checks, data sync. Defer unless enterprise demand. |
| **Multi-Mode: Docker Sandbox** | Docker Desktop's Sandbox microVM for isolated testing | MEDIUM | Run OpenClaw in container for safe experimentation. Aligns with OpenClaw's Docker Sandboxes feature (Feb 2026). |
| **OpenClaw Doctor Integration** | Expose built-in diagnostics that CLI users have | LOW | Run openclaw doctor from GUI. Show results in friendly format. Saves users from terminal. |
| **Log Viewer: AI-Powered Anomaly Detection** | Better Stack, Kloudfuse offer ML anomaly detection (2026 trend) | VERY HIGH | Flag unusual error patterns. "Gateway crashed 3x in 10 min." Requires ML model, training data. Ambitious differentiator. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this specific use case.

#### v1.0 Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full CLI replacement** | "Why not manage conversations in the GUI too?" | Scope creep; OpenClaw's TUI already handles this well. GUI overhead for ephemeral interactions. | Focus on setup and config management. Link to OpenClaw CLI for conversations. |
| **Cloud-hosted wizard** | "Make it a web service users visit" | Security risk (API keys over network). Trust issue with new tool. Deployment/maintenance burden. | Local Rust server at localhost. Zero network exposure for sensitive data. |
| **Support for all 13+ channels in v1** | "Complete feature parity with OpenClaw" | 80% of users need WhatsApp/Telegram/Discord/Slack. Remaining channels add complexity without proportional value. | Ship 4 channels, add based on demand/telemetry. |
| **Automatic updates for OpenClaw** | "Keep OpenClaw current automatically" | Version conflicts, breaking changes. Users want control over updates for production systems. | Show "Update available" notification, link to instructions. Don't force. |
| **Multi-user/team management** | "Manage multiple OpenClaw instances" | OpenClaw is single-user by design. Multi-tenant adds auth, isolation, complexity. | Single instance focus. Document multi-VPS setups for teams. |
| **Undo/rollback during wizard** | "Let users go back and change answers" | State management complexity when steps have side effects (installed Node, wrote files). Hard to truly "undo" system changes. | Allow editing in final summary screen before commit. Clear "Start over" option. |
| **Animated/elaborate UI** | "Make it look premium" | Adds weight to React bundle, slows first load. Distracts from task completion. Over-designed for utility tool. | Clean, functional UI. Fast load times > visual flair for installer. |

#### v1.1 New Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Built-in Skill Editor/Creator** | "Why can't I build skills in the wizard?" | OpenClaw skills are code (JS/TS). Building code editor duplicates VS Code. Scope explosion. | Link to official skill development docs. Open skill directory in user's editor. |
| **Automatic Skill Updates** | "Just update everything automatically" | Breaking changes in skills can break workflows. User loses control. VirusTotal scans need manual review. | Show "X skills have updates" badge. Let user review changelog before updating. |
| **Real-Time Cost Tracking** | "Show me live API spend as requests happen" | Requires instrumenting OpenClaw internals or API gateway. Out of scope for setup wizard. Complex backend. | Static cost projections based on config. Link to API provider dashboards for actual usage. |
| **Multi-Cloud AI Provider Redundancy** | "Failover from OpenAI to Claude if API is down" | Extremely complex: model compatibility, prompt translation, state management. Enterprise feature, not wizard. | Let user configure primary + backup provider. Document manual failover process. |
| **Embedded Terminal** | "Run OpenClaw commands without leaving the wizard" | Reinventing terminal emulator. Security risk (arbitrary command execution). Accessibility issues. | Provide "Copy command" buttons. Open system terminal programmatically when needed. |
| **Skill Marketplace (Self-Hosted)** | "Can I host my own ClawHub?" | ClawHub is centralized. Building decentralized marketplace is massive project. Blockchain-level complexity. | Support local skill installation from file paths (already exists). Document private registry setup separately. |
| **Built-in Ollama/local model support** | "No API costs!" | Ollama integration increases setup complexity significantly. GPU requirements, model downloads. Defers adoption. | Defer to v2. Start with API providers (lower friction). |

## Feature Dependencies

### v1.0 Dependencies (Existing)

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

### v1.1 New Dependencies

```
[Skills Management: Browse]
    └──requires──> [ClawHub API Integration]

[Skills Management: Install]
    └──requires──> [Skills Management: Browse]
    └──requires──> [VirusTotal Integration] (for security scanning)

[Skills Management: Uninstall]
    └──requires──> [Dependency Visualization] (to prevent breakage)

[Cost Optimizer: Model Recommendations]
    └──requires──> [Model Pricing Database]
    └──requires──> [Config Parser] (already in v1.0)

[Cost Optimizer: Savings Dashboard]
    └──requires──> [Cost Optimizer: Model Recommendations]

[Security Auditor: Fix Suggestions]
    └──requires──> [Security Auditor: Config Validation]
    └──enhances──> [Config Editor] (one-click apply fixes)

[Multi-Mode: SSH Remote Install]
    └──requires──> [SSH Library Integration]
    └──requires──> [Remote State Sync]
    └──conflicts──> [Multi-Mode: Local Install] (different UX flows)

[Multi-Mode: Docker Sandbox]
    └──requires──> [Docker Integration]
    └──enhances──> [Pre-flight Environment Checks] (test in sandbox first)

[Log Viewer: Real-time Streaming]
    └──requires──> [WebSocket/Polling Infrastructure]

[Log Viewer: Search/Filter]
    └──enhances──> [Log Viewer: Real-time Streaming]

[Dark Mode]
    └──requires──> [UI Framework Theme Support]
```

### Dependency Notes

**v1.0 Dependencies:**
- **System checks must run first:** Can't install Node if we don't know the OS or lack write permissions.
- **Daemon management enables health monitoring:** Dashboard is useless without ability to start/stop daemon.
- **Auto-detection amplifies wizard UX:** Detecting existing config transforms wizard from "start from scratch" to "complete what's missing."
- **API validation depends on input validation:** Can't test API key if input format is invalid (empty, wrong format).
- **Channel reconnection is high-value but complex:** Requires detecting disconnected state, preserving other config, handling provider-specific re-auth flows.

**v1.1 Dependencies:**
- **Skills Management requires ClawHub API:** Cannot browse/install without API integration. ClawHub already public (5,705 skills as of Feb 2026).
- **Cost Optimizer depends on pricing data:** Requires maintaining model pricing database (OpenAI, Anthropic, Google, DeepSeek, etc.). Prices change frequently (Gemini 2.0 Flash launched at $0.10/MTok in Jan 2026).
- **SSH Remote conflicts with Local Install UX:** Different wizard flows. User selects mode upfront, then sees mode-specific steps. Cannot merge flows without confusion.
- **Dependency Visualization enhances Uninstall:** Not required for basic uninstall, but prevents "I broke everything" scenarios. Portainer shows container dependencies before removal.
- **Security Auditor enhances Config Editor:** When auditor finds issues, user needs quick fix path. Integration point: "Apply recommended fix" button in editor.

## MVP Definition

### v1.0 Shipped (Already Launched)

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

### v1.1 Launch (Control Center Transformation)

Minimum viable control center — what makes v1.1 feel like an upgrade.

- [ ] **Skills Management: Browse** — Core value prop. Users want visual skill discovery. ClawHub API available.
- [ ] **Skills Management: Install/Uninstall** — Incomplete without ability to manage. Table stakes for marketplace.
- [ ] **Skills Management: Categories** — Users expect filtering. Low complexity, high value.
- [ ] **Log Viewer: Real-time Streaming** — Essential for debugging. Docker Desktop equivalent.
- [ ] **Log Viewer: Search/Filter** — Logs useless without search. Medium complexity, must have.
- [ ] **Dark Mode Toggle** — Modern app expectation. Low complexity, high user satisfaction.
- [ ] **Multi-Mode: Docker Sandbox** — Safe experimentation. Aligns with OpenClaw Feb 2026 Sandbox feature.
- [ ] **Cost Optimizer: Model Recommendations** — Unique differentiator. 70% cost savings proven (AI Pricing Master research). Tier 1 value.
- [ ] **Security Auditor: Config Validation** — Prevents API key leaks, misconfigurations. Risk mitigation essential.

**Rationale:** These 9 features transform wizard into control center. Skills management (3 features) + log viewer (2 features) + optimization (2 features) + quality-of-life (dark mode, sandbox) = complete control center experience.

### Add After v1.1 Validation (v1.x)

Features to add once control center is working.

- [ ] **Cost Optimizer: Savings Dashboard** — Enhances cost recommendations with visualization. Add when recommendations prove valuable.
- [ ] **Security Auditor: Fix Suggestions** — Upgrade validation to actionable fixes. Add when validation identifies common patterns.
- [ ] **Skills: VirusTotal Integration** — OpenClaw partnership exists. Surface in UI once marketplace adoption proven.
- [ ] **Skills: Dependency Visualization** — Add when users report "broke my setup" issues.
- [ ] **Multi-Mode: SSH Remote Install** — Add when users request headless server support. High complexity, niche initially.
- [ ] **OpenClaw Doctor Integration** — Low complexity quality-of-life feature. Add in minor release.
- [ ] **Guided error recovery** — (Trigger: >10% of users fail setup with same error)
- [ ] **Channel reconnection workflows** — (Trigger: WhatsApp session expiry becomes top support issue)
- [ ] **Post-install checklist** — (Trigger: <60% of installed users send first message)
- [ ] **Smart environment variable management** — (Trigger: Config precedence questions in support)
- [ ] **Ability to pause and resume** — (Trigger: Users abandon wizard mid-flow to get API keys)

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Multi-Mode: Multi-Node Cluster** — Very high complexity. Enterprise feature. Wait for demand signals.
- [ ] **Log Viewer: AI-Powered Anomaly Detection** — Ambitious ML feature. Requires training data, model. v2+ innovation.
- [ ] **Real-Time Cost Tracking** — Requires instrumenting OpenClaw core. Out of wizard scope. Partner with observability tools instead.
- [ ] **Advanced Skill Features** — Skill editor, custom marketplace, blockchain-level complexity. Not wizard's responsibility.
- [ ] **All 13+ OpenClaw channels** — Start with top 4, add based on demand.
- [ ] **Ollama/local model support** — Significant complexity, niche use case in v1.
- [ ] **Multi-language wizard** — English-first, localize after traction.
- [ ] **Telemetry/analytics opt-in** — Useful for understanding drop-off, but privacy-sensitive.
- [ ] **Plugin system for custom channels** — Advanced use case, defers to v2.

## Feature Prioritization Matrix

### v1.1 Features Only

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Skills: Browse/Install/Uninstall | HIGH | MEDIUM | P1 |
| Skills: Categories | HIGH | LOW | P1 |
| Log Viewer: Real-time Streaming | HIGH | MEDIUM | P1 |
| Log Viewer: Search/Filter | HIGH | MEDIUM | P1 |
| Dark Mode | MEDIUM | LOW | P1 |
| Cost Optimizer: Model Recommendations | HIGH | MEDIUM | P1 |
| Security Auditor: Config Validation | HIGH | MEDIUM | P1 |
| Multi-Mode: Docker Sandbox | MEDIUM | MEDIUM | P1 |
| Cost Optimizer: Savings Dashboard | MEDIUM | MEDIUM | P2 |
| Security Auditor: Fix Suggestions | MEDIUM | MEDIUM | P2 |
| Skills: VirusTotal Integration | MEDIUM | LOW | P2 |
| Skills: Dependency Visualization | MEDIUM | MEDIUM | P2 |
| Multi-Mode: SSH Remote Install | MEDIUM | HIGH | P2 |
| OpenClaw Doctor Integration | LOW | LOW | P2 |
| Multi-Mode: Multi-Node Cluster | LOW | VERY HIGH | P3 |
| Log Viewer: AI Anomaly Detection | MEDIUM | VERY HIGH | P3 |
| Real-Time Cost Tracking | MEDIUM | VERY HIGH | P3 |

**Priority key:**
- **P1:** Must have for v1.1 launch (control center transformation)
- **P2:** Should have, add in v1.x releases (value-add enhancements)
- **P3:** Nice to have, future consideration (innovation/enterprise)

## Competitor Feature Analysis

### v1.1 Feature Comparison

| Feature Category | Docker Desktop | Portainer | LM Studio | Cork (Homebrew GUI) | OpenClaw Wizard v1.1 |
|------------------|----------------|-----------|-----------|---------------------|----------------------|
| **Package/Model Browse** | Extensions marketplace, category filters | Template browser for containers | Curated model list from HuggingFace, search by name | Visual package list, search, category tabs | ClawHub API integration, 5,705 skills, category filtering, VirusTotal security badges |
| **Install/Uninstall** | One-click install/uninstall extensions | Deploy containers from templates | Download models with GUI progress bar, auto-manage memory | One-click install formulae/casks, dependency handling | One-click skill install from ClawHub, uninstall with dependency warnings |
| **Service Management** | Start/stop/restart containers, resource limits | Start/stop/restart services, container lifecycle | Model loading (JIT, TTL, auto-evict), GPU offload controls | Update packages, cleanup Homebrew maintenance | Start/stop/restart daemon + gateway, OpenClaw doctor diagnostics |
| **Log Viewing** | Real-time container logs, search, export | Real-time logs with filtering, log levels | Not applicable (local models, no logs) | Not applicable (package manager) | Real-time daemon + gateway logs, keyword search, log level filtering |
| **Configuration** | Settings GUI with validation, .docker/config.json | Form-based config for stacks, YAML editor option | Model parameter tuning (CPU threads, GPU layers, memory) | Preferences GUI for paths, taps | Visual form-based config editor (v1.0), add validation from security auditor |
| **Multi-Mode Setup** | Docker contexts (local, remote via SSH, Kubernetes) | Connect to remote Docker/Kubernetes endpoints | Local only | Local only (macOS) | Local install (v1.0), Docker sandbox, SSH remote (v1.x), multi-node (v2+) |
| **Cost Optimization** | Not applicable | Not applicable | Not applicable (local models, no API cost) | Not applicable | AI model cost analyzer, savings projections (UNIQUE DIFFERENTIATOR) |
| **Security Auditing** | Scout security scanning for images | RBAC, SSO, policy controls | Not applicable (local, private) | Not applicable | Config validation, exposed key detection, fix suggestions (UNIQUE for AI assistants) |
| **Dark Mode** | Yes, system theme | Yes, manual toggle | Yes, theme options | Yes, system theme | Manual toggle, persist preference |

**Key Insight:** OpenClaw Wizard's AI cost optimization and security auditing features are unique in the desktop management tool space. No competitor analyzes API costs or audits AI-specific configurations.

## Feature Interactions & Conflicts

### Positive Interactions (Synergies)

**v1.1 Specific:**

1. **Security Auditor + Cost Optimizer**
   - Security audit finds overprivileged API keys → Cost optimizer suggests scoped keys with cheaper models
   - Both analyze config → Share parsing infrastructure
   - UI: Combined "Health Check" tab showing both security and cost recommendations

2. **Skills Management + VirusTotal**
   - Install flow shows security scan results before proceeding
   - Uninstall warns if removing skill flagged as safe dependency
   - Build trust: "This wizard protects you from malicious skills"

3. **Log Viewer + OpenClaw Doctor**
   - Doctor diagnostics surface in log viewer as structured entries
   - Log errors link to doctor recommendations
   - UI: "Run doctor" button when log shows errors

4. **Multi-Mode + Docker Sandbox**
   - Sandbox mode tests setup before committing to main install
   - SSH remote can deploy sandbox on remote host first
   - Pre-flight checks run in sandbox to validate config

5. **Dark Mode + All Features**
   - Consistent theming across skills marketplace, logs, config editor
   - High contrast modes improve log readability
   - UI framework must support theme tokens globally

### Negative Interactions (Conflicts)

**v1.1 Specific:**

1. **Multi-Mode Selection Conflicts**
   - Cannot mix local + SSH remote in single wizard flow
   - User must choose mode upfront: Local OR Remote OR Docker OR Multi-Node
   - UI: Mode selector at wizard start, hide incompatible steps per mode

2. **Real-Time Streaming + Log Search Performance**
   - Searching while streaming can lag UI on high-volume logs
   - Mitigation: Pause streaming during search, or search in buffered history
   - UI: "Pause" button for log viewer

3. **Auto-Updates + Skill Dependencies**
   - Updating skill A might break dependent skill B
   - Mitigation: Dependency graph prevents auto-updates (anti-feature)
   - UI: Manual update with changelog review required

4. **Cost Optimizer + User Model Preferences**
   - User wants GPT-4 for quality, optimizer suggests DeepSeek for cost
   - Mitigation: Let user set quality tier preference (premium/balanced/budget)
   - UI: "I prioritize: Quality / Balanced / Cost" toggle

5. **Security Auditor + Developer Workflows**
   - Strict security blocks localhost APIs during development
   - Mitigation: "Dev Mode" toggle bypasses certain checks
   - UI: Warning banner when dev mode enabled

## Implementation Complexity Assessment

### v1.1 Features Only

#### Low Complexity (1-2 days each)
- Dark mode toggle (UI framework theme support)
- Skills: Categories (render ClawHub categories)
- OpenClaw Doctor integration (exec doctor, display results)
- VirusTotal integration (API call, display badge)

#### Medium Complexity (3-5 days each)
- Skills: Browse (ClawHub API integration, UI)
- Skills: Install/Uninstall (API calls, file operations, precedence handling)
- Log Viewer: Real-time Streaming (WebSocket/polling, buffer management)
- Log Viewer: Search/Filter (search algorithm, UI controls)
- Cost Optimizer: Model Recommendations (pricing database, config parsing, recommendation engine)
- Security Auditor: Config Validation (rule engine, config parsing, reporting)
- Multi-Mode: Docker Sandbox (Docker API, container lifecycle)

#### High Complexity (1-2 weeks each)
- Cost Optimizer: Savings Dashboard (data visualization, real-time updates, chart library)
- Security Auditor: Fix Suggestions (rule-based fixes, one-click apply, config modification)
- Skills: Dependency Visualization (dependency graph parsing, visualization library)
- Multi-Mode: SSH Remote Install (SSH library, remote execution, state sync, error handling)

#### Very High Complexity (2-4 weeks each)
- Multi-Mode: Multi-Node Cluster (cluster coordination, health checks, data sync, failover)
- Log Viewer: AI Anomaly Detection (ML model, training pipeline, inference, alerting)
- Real-Time Cost Tracking (OpenClaw instrumentation, usage tracking, API integration)

## Sources

**v1.0 Sources (Setup Wizard Best Practices):**
- [Creating a setup wizard (and when you shouldn't) - LogRocket Blog](https://blog.logrocket.com/ux-design/creating-setup-wizard-when-you-shouldnt/)
- [Wizard UI Pattern: When to Use It and How to Get It Right - Eleken](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained)
- [Best Practices for High-Conversion Wizard UI Design & Examples - Lollypop](https://lollypop.design/blog/2026/january/wizard-ui-design/)
- [Docker Desktop Installation Guide - Docker Docs](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Initial setup | Portainer Documentation](https://docs.portainer.io/start/install/server/setup)
- [Cork: The Homebrew GUI for macOS](https://corkmac.app/)

**v1.1 Sources (Control Center Features):**

**Competitor Analysis:**
- [Docker Desktop Features 2026](https://docs.docker.com/desktop/)
- [Portainer Features](https://www.portainer.io/features)
- [LM Studio Review 2026](https://elephas.app/blog/lm-studio-review)
- [Cork Homebrew GUI Review](https://dockshare.io/apps/cork)
- [VS Code Extension Marketplace](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace)

**Cost Optimization Research:**
- [10 AI Cost Optimization Strategies for 2026](https://www.aipricingmaster.com/blog/10-AI-Cost-Optimization-Strategies-for-2026)
- [AI Cost Optimization Platforms](https://www.index.dev/blog/cut-ai-costs-platforms)
- [nOps GenAI Cost Optimization Tools](https://www.nops.io/blog/genai-cost-optimization-tools/)

**Security Auditing Research:**
- [Top 10 Cloud Compliance Tools 2026](https://blog.qualys.com/product-tech/2026/01/29/top-10-cloud-compliance-tools-for-enterprise-security-and-audit-readiness-in-2026)
- [Security Audit Best Practices](https://www.sentinelone.com/cybersecurity-101/cloud-security/security-audit/)
- [Configuration Auditing - Tenable](https://www.tenable.com/solutions/configuration-auditing)

**Skills Management Research:**
- [OpenClaw Skills Documentation](https://docs.openclaw.ai/tools/skills)
- [ClawHub Skills Marketplace Developer Guide 2026](https://www.digitalapplied.com/blog/clawhub-skills-marketplace-developer-guide-2026)
- [OpenClaw Setup Guide: 25 Tools + 53 Skills](https://yu-wenhao.com/en/blog/openclaw-tools-skills-tutorial)
- [Claude Code Skills Marketplace](https://medium.com/@markchen69/claude-code-has-a-skills-marketplace-now-a-beginner-friendly-walkthrough-8adeb67cdc89)

**Log Viewer Research:**
- [10 Best Log Monitoring Tools 2026](https://betterstack.com/community/comparisons/log-monitoring-tools/)
- [Real-Time Log Monitoring Tools 2026](https://www.kloudfuse.com/blog/real-time-log-monitoring-tools)
- [LogFusion Real-Time Log Monitoring](https://www.logfusion.ca/)

**Multi-Mode Setup Research:**
- [Docker Remote Access Configuration](https://docs.docker.com/config/daemon/remote-access/)
- [How to Set Up Docker on Headless Linux via SSH](https://oneuptime.com/blog/post/2026-02-08-how-to-set-up-docker-on-a-headless-linux-server-via-ssh/view)
- [Multi-Node Kubernetes with Docker Desktop](https://dasroot.net/posts/2026/01/running-multi-node-kubernetes-cluster-docker-desktop/)
- [VS Code Remote Development](https://code.visualstudio.com/remote/advancedcontainers/develop-remote-host)

**OpenClaw Ecosystem:**
- [What is OpenClaw? (DigitalOcean)](https://www.digitalocean.com/resources/articles/what-is-openclaw)
- [OpenClaw Features & Capabilities 2026](https://medium.com/@gemQueenx/what-is-openclaw-open-source-ai-agent-in-2026-setup-features-8e020db20e5e)
- [OpenClaw GitHub Repository](https://github.com/openclaw/openclaw)

---
*Feature research for: OpenClaw Wizard v1.1 Control Center*
*Researched: 2026-02-14*
*v1.0 Confidence: HIGH - WebSearch verified with official sources*
*v1.1 Confidence: MEDIUM - ClawHub skill count (5,705) and OpenClaw Sandbox feature confirmed from Feb 2026 sources. Cost optimization percentages (70%, 28x savings) from AI Pricing Master research. Multi-mode patterns verified against Docker/VS Code official docs.*
