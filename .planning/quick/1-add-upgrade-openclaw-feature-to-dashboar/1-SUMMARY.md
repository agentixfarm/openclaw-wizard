---
phase: quick-1
plan: 01
subsystem: dashboard/upgrade
tags: [upgrade, dashboard, websocket, streaming, ux]
dependency_graph:
  requires: [uninstaller-service, ws-handlers, streaming-output]
  provides: [upgrade-service, upgrade-panel]
  affects: [dashboard-layout, services-module]
tech_stack:
  added: [upgrader-service, upgrade-panel]
  patterns: [streaming-progress, websocket-rpc, five-step-upgrade]
key_files:
  created:
    - backend/src/services/upgrader.rs
    - frontend/src/components/dashboard/UpgradePanel.tsx
  modified:
    - backend/src/services/mod.rs
    - backend/src/routes/ws.rs
    - frontend/src/components/dashboard/DashboardLayout.tsx
decisions:
  - No confirmation dialog for upgrade (non-destructive operation)
  - Blue/indigo color scheme (positive action vs red danger zone)
  - Five-step upgrade flow with critical vs non-critical steps
  - npm update failure is critical, doctor/reinstall failures are warnings
metrics:
  duration: 225
  tasks_completed: 2
  files_created: 2
  files_modified: 3
  completed_at: "2026-02-16T14:42:48Z"
---

# Quick Task 1: Add Upgrade OpenClaw Feature to Dashboard

**One-liner:** One-click OpenClaw upgrade with streaming progress, graceful stop/update/restart flow using blue UpgradePanel UI

## Objective

Added "Upgrade OpenClaw" feature to dashboard to address Discord pain point "why does my gateway seemingly bust with every update". Users can now update their installation with one click instead of manual CLI steps. The upgrade flow gracefully stops the gateway, updates the package, runs diagnostics, and restarts everything.

## What Was Built

### Backend Components

**UpgradeService** (`backend/src/services/upgrader.rs`):
- Five-step upgrade flow with streaming progress via mpsc channel
- Step 1 (0-15%): Stop gateway (non-critical - continues if not running)
- Step 2 (15-40%): Update npm package (CRITICAL - fails if error)
- Step 3 (40-65%): Run doctor --fix (non-critical - continues with warnings)
- Step 4 (65-85%): Reinstall gateway service (non-critical - continues with warnings)
- Step 5 (85-100%): Start gateway (CRITICAL - fails if error)
- Follows exact pattern of UninstallService for consistency

**WebSocket Handler** (`backend/src/routes/ws.rs`):
- Added `start-upgrade` message handler
- Streams `upgrade-progress` messages to frontend
- Handles errors and forwards to client

### Frontend Components

**UpgradePanel** (`frontend/src/components/dashboard/UpgradePanel.tsx`):
- Four states: idle, upgrading, completed, failed
- No confirmation dialog (upgrade is non-destructive)
- Blue/indigo color scheme (positive action vs red danger zone)
- One-click "Upgrade Now" button
- Real-time streaming output using StreamingOutput component
- Success state: green box with "OpenClaw has been updated and the gateway is running"
- Failure state: red error box with "Try again" button

**Dashboard Integration** (`frontend/src/components/dashboard/DashboardLayout.tsx`):
- UpgradePanel placed between DoctorDiagnostics and tab navigation
- Wrapped in `<div className="mb-6">` for consistent spacing
- Appears prominently in main dashboard view

## Verification Results

- Backend: `cargo build` succeeded (compiled with warnings only)
- Frontend: `npx tsc --noEmit` succeeded (no type errors)
- UpgradePanel visible in dashboard between Doctor Diagnostics and tabs
- WebSocket message flow: `start-upgrade` -> UpgradeService -> `upgrade-progress` -> StreamingOutput

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

1. **No confirmation dialog**: Unlike UninstallPanel which requires typing "UNINSTALL", UpgradePanel has direct one-click access. Upgrade is a positive, non-destructive operation that improves the system.

2. **Color scheme**: Blue/indigo instead of red. Upgrade is a positive action, not a danger zone operation.

3. **Critical vs non-critical steps**: npm update and gateway start failures cause upgrade to fail and return errors. Doctor and reinstall failures log warnings but continue (graceful degradation).

4. **Placement**: Between DoctorDiagnostics and tab navigation for high visibility. Users see diagnostics first, then have immediate access to upgrade if needed.

## Task Completion

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Backend UpgradeService and WebSocket handler | 31330de | backend/src/services/upgrader.rs, backend/src/services/mod.rs, backend/src/routes/ws.rs |
| 2 | Frontend UpgradePanel component and dashboard integration | e6263fa | frontend/src/components/dashboard/UpgradePanel.tsx, frontend/src/components/dashboard/DashboardLayout.tsx |

## Impact

**User Experience:**
- Users can now upgrade OpenClaw without leaving the dashboard
- No need to remember CLI commands or manual steps
- Real-time feedback during upgrade process
- Graceful handling of gateway stop/start reduces "gateway bust" issues

**Technical:**
- Reuses existing streaming infrastructure (InstallProgress, SafeCommand, WebSocket handlers)
- Follows established patterns (UninstallPanel, InstallerService)
- No new dependencies added
- Minimal code duplication

## Self-Check: PASSED

All files and commits verified:

- FOUND: backend/src/services/upgrader.rs
- FOUND: frontend/src/components/dashboard/UpgradePanel.tsx
- FOUND: 31330de
- FOUND: e6263fa
