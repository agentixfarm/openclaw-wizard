<p align="center">
  <br>
  <code>
  /\_/\
 ( o.o )
  > ^ <
  </code>
  <br><br>
  <strong>OpenClaw Setup Wizard</strong>
  <br>
  <em>A visual setup wizard and management dashboard for <a href="https://github.com/openclaw/openclaw">OpenClaw</a></em>
  <br><br>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/version-1.1.0-green.svg" alt="Version 1.1.0">
  <img src="https://img.shields.io/badge/rust-2024-orange.svg" alt="Rust 2024">
  <img src="https://img.shields.io/badge/react-19-61DAFB.svg" alt="React 19">
  <img src="https://img.shields.io/github/stars/agentixfarm/openclaw-wizard?style=social" alt="Stars">
</p>

---

Setting up OpenClaw through the terminal can be error-prone. The wizard replaces that with a guided web UI that auto-detects your system, validates configuration in real-time, and streams installation progress — zero to a running AI agent without touching a terminal.

## Install

### One-liner (recommended)

Downloads the pre-built binary for your platform and launches the wizard:

```bash
curl -fsSL https://raw.githubusercontent.com/agentixfarm/openclaw-wizard/main/install.sh | bash
```

Then open **http://localhost:3030** in your browser.

### Pre-built binaries

Download from [GitHub Releases](https://github.com/agentixfarm/openclaw-wizard/releases):

| Platform | Binary |
|----------|--------|
| macOS (Apple Silicon) | `openclaw-wizard-macos-arm64.tar.gz` |
| macOS (Intel) | `openclaw-wizard-macos-amd64.tar.gz` |
| Linux (x64) | `openclaw-wizard-linux-amd64.tar.gz` |
| Linux (ARM64) | `openclaw-wizard-linux-arm64.tar.gz` |
| Windows (x64) | `openclaw-wizard-windows-amd64.exe.zip` |

```bash
# Example: macOS Apple Silicon
tar xzf openclaw-wizard-macos-arm64.tar.gz
./openclaw-wizard-macos-arm64
```

### Build from source

Requires Rust 1.75+ and Node.js 18+:

```bash
git clone https://github.com/agentixfarm/openclaw-wizard.git
cd openclaw-wizard
./setup.sh
```

### Development mode

For contributors — starts Vite dev server with HMR + backend with auto-proxy:

```bash
git clone https://github.com/agentixfarm/openclaw-wizard.git
cd openclaw-wizard
npm install --prefix frontend
node dev.mjs --open
```

## Features

### Setup Wizard

- **Guided flow** — Step-by-step with validation at every stage
- **Auto-detection** — Detects OS, Node.js, existing installs, running services
- **Provider support** — Anthropic, OpenAI, Google, Ollama, Cloudflare Workers AI, OpenAI-compatible
- **Channel setup** — WhatsApp (QR code), Telegram, Discord, Slack
- **Real-time install** — Streaming terminal output with progress tracking
- **Error recovery** — Guided recovery steps and automatic rollback

**Deployment modes:**

| Mode | Description |
|------|-------------|
| Desktop | Local machine setup |
| Remote Server | Deploy to a VPS via SSH |
| Multi-Server | Orchestrate across multiple nodes |
| Docker Sandbox | Isolated container for experimentation |

### Management Dashboard

| Tab | What it does |
|-----|-------------|
| **Overview** | Health monitoring, service controls, chat access |
| **Logs** | Real-time log streaming with filtering |
| **Cost Optimization** | Model selection, heartbeat tuning, AI cost analysis |
| **Settings** | Visual config editor, channel management, import/export |
| **Advanced** | Diagnostics, upgrades, security audit, uninstall |

### Channels

| Channel | Auth Method | Status |
|---------|-------------|--------|
| WhatsApp | QR code scan (Linked Devices) | Supported |
| Telegram | Bot token | Supported |
| Discord | Bot token | Supported |
| Slack | App token | Supported |

### Security

- **Security auditing** — AI-powered detection of misconfigurations
- **Skills scanning** — VirusTotal integration for package verification
- **Access control** — Per-channel DM policies (allowlist, pairing, open, disabled)

## Architecture

```
openclaw-wizard/
├── backend/                # Rust + Axum
│   ├── src/routes/         # REST + WebSocket endpoints
│   ├── src/services/       # 20+ service modules
│   └── src/models/         # Types with ts-rs for TS generation
├── frontend/               # React 19 + Vite + Tailwind
│   ├── src/components/     # Wizard, dashboard, UI components
│   ├── src/hooks/          # State management
│   └── src/schemas/        # Zod validation
├── install.sh              # One-liner installer
├── setup.sh                # Build from source
└── dev.mjs                 # Development launcher
```

### Tech Stack

| | Technology |
|-|-----------|
| **Backend** | Rust, Axum, Tokio, Serde, ts-rs |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **Forms** | React Hook Form + Zod |
| **Real-time** | WebSockets (install, logs, health, WhatsApp QR) |
| **Testing** | Vitest, React Testing Library, MSW |

## Development

```bash
# Run tests
cd frontend && npx vitest run
cd backend && cargo test

# Type check
cd frontend && npx tsc --noEmit

# Generate TypeScript bindings from Rust types
cd backend && cargo test export_bindings
```

## Star History

<a href="https://star-history.com/#agentixfarm/openclaw-wizard&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=agentixfarm/openclaw-wizard&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=agentixfarm/openclaw-wizard&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=agentixfarm/openclaw-wizard&type=Date" />
 </picture>
</a>

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-thing`)
3. Run tests (`npx vitest run` and `cargo test`)
4. Submit a pull request

**Areas for contribution:** additional channels (Matrix, Signal), i18n, desktop app (Tauri), documentation.

## License

[MIT](LICENSE)

---

<p align="center">
  Built with Rust and React for the OpenClaw community.
</p>
