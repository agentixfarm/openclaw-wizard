---
phase: 06-docker-skills-management
plan: 01
subsystem: api, docker
tags: [bollard, docker, container, security, sandbox, tar, flate2, chrono, ts-rs]

# Dependency graph
requires:
  - phase: 01-foundation-infrastructure
    provides: Axum backend, ts-rs type generation, error handling pattern
  - phase: 04-management-dashboard
    provides: Dashboard routes pattern, DaemonService inline creation pattern
provides:
  - DockerService with 6 methods for container lifecycle management
  - 6 Docker REST API routes under /api/docker/*
  - 6 Docker TypeScript types with ts-rs bindings
  - 4 Docker error variants in AppError enum
  - bollard, tar, flate2, chrono Cargo dependencies
affects: [06-02 skills-backend, 06-03 docker-ui, 06-04 skills-marketplace-ui, 06-05 integration]

# Tech tracking
tech-stack:
  added: [bollard 0.20, tar 0.4, flate2 1.0, chrono 0.4]
  patterns: [DockerService stateless per-request, container label filtering, strict security HostConfig]

key-files:
  created:
    - backend/src/services/docker.rs
    - backend/src/routes/docker.rs
    - backend/bindings/ContainerInfo.ts
    - backend/bindings/ContainerStatus.ts
    - backend/bindings/DockerCreateRequest.ts
    - backend/bindings/DockerCreateResponse.ts
    - backend/bindings/DockerStatusResponse.ts
    - backend/bindings/ContainerLogsResponse.ts
  modified:
    - backend/Cargo.toml
    - backend/src/models/types.rs
    - backend/src/error.rs
    - backend/src/services/mod.rs
    - backend/src/routes/mod.rs
    - backend/src/main.rs

key-decisions:
  - "DockerService created per-request (stateless) following existing route handler pattern -- bollard client connection is cheap"
  - "Docker-not-available returns 200 with available:false, not 500/503 -- user may not have Docker installed"
  - "Container port 3000 mapped to random host port on 127.0.0.1 (localhost only) for security"
  - "readonly_rootfs set to false because OpenClaw needs to write to filesystem inside container"

patterns-established:
  - "Docker container security: cap_drop ALL, no-new-privileges, 512MB memory, 1 CPU, 100 PIDs, non-root user, no Docker socket"
  - "Container label filtering: openclaw-wizard=true label on all managed containers"
  - "Container limit enforcement: max 5 containers checked before creation"

# Metrics
duration: 11min
completed: 2026-02-15
---

# Phase 6 Plan 01: Docker Backend Summary

**Docker container management backend with bollard client, strict security limits (512MB/1CPU/100PIDs/cap_drop ALL), 6 REST API routes, and TypeScript bindings for all Docker types**

## Performance

- **Duration:** 11 min (663s)
- **Started:** 2026-02-15T10:51:58Z
- **Completed:** 2026-02-15T11:03:01Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments
- DockerService with 6 methods: check_available, list_containers, create_sandbox, stop_container, remove_container, get_container_logs
- Strict container security enforcement: memory 512MB, CPU 1 core, PID limit 100, capability drop ALL, no-new-privileges, non-root user (node), no Docker socket mounting
- 6 Docker REST routes registered under /api/docker/* with proper error handling
- TypeScript bindings generated for all 6 Docker types via ts-rs
- Container limit of 5 enforced before creation
- Graceful Docker-not-available handling (returns available:false, not crash)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Cargo dependencies and Docker/Skills types with error variants** - `8e74891` (feat)
2. **Task 2: Create DockerService with secure container lifecycle management** - `f477826` (feat)
3. **Task 3: Create Docker REST routes and register in main.rs** - `414db31` (feat)

## Files Created/Modified
- `backend/Cargo.toml` - Added bollard, tar, flate2, chrono dependencies
- `backend/src/models/types.rs` - Added 6 Docker types (ContainerInfo, ContainerStatus, DockerCreateRequest, DockerCreateResponse, DockerStatusResponse, ContainerLogsResponse) + Skills placeholder
- `backend/src/error.rs` - Added 4 Docker error variants (DockerNotAvailable, DockerOperationFailed, ContainerNotFound, ContainerLimitExceeded)
- `backend/src/services/docker.rs` - DockerService with 6 async methods and strict security enforcement
- `backend/src/services/mod.rs` - Added docker module and DockerService re-export
- `backend/src/routes/docker.rs` - 6 route handlers for Docker container CRUD and logs
- `backend/src/routes/mod.rs` - Added docker module
- `backend/src/main.rs` - Registered 6 Docker routes under /api/docker/*
- `backend/bindings/ContainerInfo.ts` - TypeScript binding for ContainerInfo
- `backend/bindings/ContainerStatus.ts` - TypeScript binding for ContainerStatus enum
- `backend/bindings/DockerCreateRequest.ts` - TypeScript binding for create request
- `backend/bindings/DockerCreateResponse.ts` - TypeScript binding for create response
- `backend/bindings/DockerStatusResponse.ts` - TypeScript binding for status response
- `backend/bindings/ContainerLogsResponse.ts` - TypeScript binding for logs response

## Decisions Made
- DockerService created per-request (stateless) following existing route handler pattern from dashboard.rs and remote.rs -- bollard client connection is cheap
- Docker-not-available returns 200 with available:false, not 500/503 -- user may legitimately not have Docker installed
- Container port 3000 mapped to random host port on 127.0.0.1 (localhost only) for security
- readonly_rootfs set to false because OpenClaw needs to write to filesystem inside container
- User set to "node" (exists in node:20-alpine image) rather than "nobody" (from research example)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed bollard import paths for query parameter types**
- **Found during:** Task 2 (DockerService implementation)
- **Issue:** `RemoveContainerOptions` and `StopContainerOptions` are in `bollard::query_parameters`, not `bollard::container` as initially assumed
- **Fix:** Updated imports to use `bollard::query_parameters::{RemoveContainerOptions, StopContainerOptions}`
- **Files modified:** backend/src/services/docker.rs
- **Verification:** cargo check passes
- **Committed in:** f477826 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed start_container generic parameter**
- **Found during:** Task 2 (DockerService implementation)
- **Issue:** `start_container::<String>()` not valid in bollard 0.20 -- method takes 0 generic arguments
- **Fix:** Removed turbofish generic from `start_container` call
- **Files modified:** backend/src/services/docker.rs
- **Verification:** cargo check passes
- **Committed in:** f477826 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking import path, 1 bug fix)
**Impact on plan:** Both auto-fixes necessary for compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required. Docker is optional and auto-detected at runtime.

## Next Phase Readiness
- Docker backend foundation complete for Plans 02-05
- Plan 02 (Skills backend) can add Skills types to the placeholder section in types.rs
- Plan 03 (Docker UI) can use the TypeScript bindings and API routes immediately
- All 64 existing tests continue to pass (plus 4 new unit tests)

## Self-Check: PASSED

- All 8 created files verified on disk
- All 3 task commits verified in git history (8e74891, f477826, 414db31)
- docker.rs: 481 lines (min 150 required)
- docker routes: 129 lines (min 80 required)
- 6 Docker routes registered in main.rs
- Security enforcement confirmed (no-new-privileges, cap_drop, pids_limit)
- No Docker socket mounting anywhere in codebase

---
*Phase: 06-docker-skills-management*
*Completed: 2026-02-15*
