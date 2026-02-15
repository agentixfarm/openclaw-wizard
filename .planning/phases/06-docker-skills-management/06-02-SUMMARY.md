---
phase: 06-docker-skills-management
plan: 02
subsystem: api, skills
tags: [virustotal3, npm, skills, clawhub, security-scanning, rate-limiting, ts-rs]

# Dependency graph
requires:
  - phase: 01-foundation-infrastructure
    provides: Axum backend, ts-rs type generation, error handling pattern
  - phase: 06-docker-skills-management
    plan: 01
    provides: Docker types/routes pattern, Cargo dependencies (reqwest, chrono)
provides:
  - SkillsService with 6 methods for ClawHub discovery, npm install/uninstall, VT scanning
  - 6 Skills REST API routes under /api/skills/*
  - 10 Skills/VT TypeScript types with ts-rs bindings
  - 4 Skills error variants in AppError enum
  - virustotal3 Cargo dependency
affects: [06-03 docker-ui, 06-04 skills-marketplace-ui, 06-05 integration]

# Tech tracking
tech-stack:
  added: [virustotal3 3.0]
  patterns: [SkillsService stateless per-request, npm registry API search, VT scan-before-install, atomic rate limiting]

key-files:
  created:
    - backend/src/services/skills.rs
    - backend/src/routes/skills.rs
    - backend/bindings/SkillMetadata.ts
    - backend/bindings/ScanResult.ts
    - backend/bindings/ThreatLevel.ts
    - backend/bindings/SkillCategory.ts
    - backend/bindings/InstalledSkill.ts
    - backend/bindings/SkillSearchRequest.ts
    - backend/bindings/SkillSearchResponse.ts
    - backend/bindings/SkillInstallRequest.ts
    - backend/bindings/SkillInstallResponse.ts
    - backend/bindings/ScanRequest.ts
  modified:
    - backend/Cargo.toml
    - backend/src/models/types.rs
    - backend/src/error.rs
    - backend/src/services/mod.rs
    - backend/src/routes/mod.rs
    - backend/src/main.rs

key-decisions:
  - "SkillsService created per-request (stateless) following DockerService pattern -- reqwest client creation is cheap"
  - "npm registry API used for ClawHub MVP (keywords:openclaw-skill search) -- dedicated registry deferred"
  - "VT scan_file is blocking (virustotal3 uses reqwest::blocking) -- wrapped in spawn_blocking for async compatibility"
  - "Global AtomicU64 for VT rate limit tracking -- lightweight, no mutex needed for single-value timestamp"
  - "Graceful degradation: VT failure does NOT block installation -- logs warning and proceeds"

patterns-established:
  - "VT scan-before-install: scan package tarball, block if malicious, warn if suspicious, allow if clean"
  - "VT rate limiting: 15-second minimum interval between requests (4 req/min public API limit)"
  - "npm keyword-based skill discovery: packages with 'openclaw-skill' keyword auto-discovered"
  - "Route ordering: literal paths before parameter routes to prevent capture conflicts"

# Metrics
duration: 11min
completed: 2026-02-15
---

# Phase 6 Plan 02: Skills Backend Summary

**SkillsService with ClawHub discovery via npm registry, npm-based install/uninstall, VirusTotal security scanning with rate limiting, 6 REST routes, and 10 TypeScript-bound types**

## Performance

- **Duration:** 11 min (682s)
- **Started:** 2026-02-15T11:07:01Z
- **Completed:** 2026-02-15T11:18:23Z
- **Tasks:** 3
- **Files modified:** 18 (6 modified + 12 created)

## Accomplishments
- SkillsService with 6 methods: search_skills, get_skill_details, install_skill, uninstall_skill, list_installed, scan_skill
- VirusTotal integration: scan packages before install, BLOCK malicious (403 Forbidden), warn on suspicious, graceful degradation when VT unavailable
- VT rate limiting enforced (15s min interval = 4 req/min public API limit) via global AtomicU64 timestamp tracking
- 6 Skills REST routes registered under /api/skills/* with correct ordering (literal paths before {name} parameter)
- 10 TypeScript bindings generated via ts-rs for all Skills/VT types
- 12 new unit tests for category mapping, VT report parsing, URL encoding, npm version parsing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Skills/VT types and virustotal3 dependency** - `5ccfca2` (feat)
2. **Task 2: Create SkillsService with ClawHub discovery, npm install, and VT scanning** - `530b2b9` (feat)
3. **Task 3: Create Skills REST routes and register in main.rs** - `5018c6b` (feat)

## Files Created/Modified
- `backend/Cargo.toml` - Added virustotal3 = "3.0" dependency
- `backend/src/models/types.rs` - Added 10 Skills/VT types (SkillCategory, SkillMetadata, SkillSearchRequest/Response, SkillInstallRequest/Response, InstalledSkill, ThreatLevel, ScanResult, ScanRequest)
- `backend/src/error.rs` - Added 4 error variants (SkillNotFound, SkillInstallFailed, VirusTotalError, SkillBlocked)
- `backend/src/services/skills.rs` - SkillsService with 6 async methods, VT integration, rate limiting, npm helpers (783 lines)
- `backend/src/services/mod.rs` - Added skills module and SkillsService re-export
- `backend/src/routes/skills.rs` - 6 route handlers for skills CRUD and VT scanning (164 lines)
- `backend/src/routes/mod.rs` - Added skills module
- `backend/src/main.rs` - Registered 6 skills routes under /api/skills/*
- `backend/bindings/SkillMetadata.ts` - TypeScript binding for skill metadata
- `backend/bindings/ScanResult.ts` - TypeScript binding for VT scan results
- `backend/bindings/ThreatLevel.ts` - TypeScript binding for threat level enum
- `backend/bindings/SkillCategory.ts` - TypeScript binding for category enum
- `backend/bindings/InstalledSkill.ts` - TypeScript binding for installed skill info
- `backend/bindings/SkillSearchRequest.ts` - TypeScript binding for search request
- `backend/bindings/SkillSearchResponse.ts` - TypeScript binding for search response
- `backend/bindings/SkillInstallRequest.ts` - TypeScript binding for install request
- `backend/bindings/SkillInstallResponse.ts` - TypeScript binding for install response
- `backend/bindings/ScanRequest.ts` - TypeScript binding for scan request

## Decisions Made
- SkillsService created per-request (stateless) following DockerService pattern -- reqwest client creation is cheap, no shared state needed
- npm registry API used for ClawHub discovery in MVP (keywords:openclaw-skill search) -- dedicated registry deferred to when skill volume grows
- VT scan_file wrapped in tokio::task::spawn_blocking because virustotal3 uses reqwest::blocking internally
- Global AtomicU64 for VT rate limit tracking -- lightweight, lock-free, sufficient for single-value timestamp
- Graceful degradation on VT failure: log warning and proceed with install (VT unavailability should not block the user)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - VIRUSTOTAL_API_KEY is optional. If not set, security scanning is disabled (not an error). Skills discovery and install/uninstall work without any external configuration.

## Next Phase Readiness
- Skills backend foundation complete for Plans 03-05
- Plan 03 (Docker UI) can use Docker TypeScript bindings and API routes immediately
- Plan 04 (Skills Marketplace UI) can use all 10 Skills TypeScript bindings and 6 API routes
- Plan 05 (Integration) has both Docker and Skills backends ready for end-to-end testing
- All 86 tests pass (74 existing + 12 new skills unit tests)

## Self-Check: PASSED

- All 12 created files verified on disk
- All 3 task commits verified in git history (5ccfca2, 530b2b9, 5018c6b)
- skills.rs: 783 lines (min 200 required)
- skills routes: 164 lines (min 100 required)
- 6 Skills routes registered in main.rs
- 6 public async methods in SkillsService
- VT integration confirmed (scan_file, rate limiting, malicious blocking)
- No Docker socket mounting anywhere in codebase

---
*Phase: 06-docker-skills-management*
*Completed: 2026-02-15*
