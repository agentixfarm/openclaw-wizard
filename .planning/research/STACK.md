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
