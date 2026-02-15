---
phase: 06-docker-skills-management
plan: 03
subsystem: api, ui, docs
tags: [openapi, ui-spec, docker, skills, virustotal, clawhub, screens]

# Dependency graph
requires:
  - phase: 06-docker-skills-management
    plan: 01
    provides: Docker types (ContainerInfo, DockerStatusResponse, etc.), Docker REST routes, DockerService
  - phase: 05-ssh-remote-setup
    provides: phase-05-openapi.yaml and phase-05-screens.md patterns to follow
provides:
  - OpenAPI 3.1 specification for all 12 Phase 6 endpoints (6 Docker + 6 Skills)
  - UI screen specifications for 5 screens (Docker sandbox, Skills browser, Skill detail, Install/Uninstall flow, Installed list)
  - Component inventory (22 new components + 2 hooks)
  - API-to-screen mapping for frontend implementation
affects: [06-04 docker-frontend, 06-05 skills-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns: [API-first spec-before-UI, slide-over detail panel, scan-before-install flow, tab-based browse/installed views]

key-files:
  created:
    - .planning/api-specs/phase-06-openapi.yaml
    - .planning/ui-specs/phase-06-screens.md
  modified: []

key-decisions:
  - "Skills browser is a dashboard page (not wizard step) — accessed from sidebar after setup"
  - "Docker sandbox adds third setup mode card alongside Local and Remote"
  - "Skill detail uses slide-over panel (full-screen on mobile) rather than modal"
  - "Malicious skills always blocked (no force override) — force only bypasses suspicious"
  - "VT scan section shows 4 states: clean, suspicious, malicious, not-configured"

patterns-established:
  - "VirusTotal display pattern: green/yellow/red borders with threat level badges and scanner counts"
  - "Scan-before-install flow: auto-scan -> decision (clean/suspicious/malicious) -> install or block"
  - "Category filter pills: horizontal scrollable row with 'All' default and immediate result updates"
  - "Container management panel: status dots (green/gray/red), expandable logs, 5-container limit indicator"

# Metrics
duration: 8min
completed: 2026-02-15
---

# Phase 6 Plan 03: OpenAPI Spec + UI Screen Specs Summary

**OpenAPI 3.1 spec documenting all 12 Docker/Skills endpoints with full schemas, plus 950-line UI screen spec covering Docker sandbox setup, Skills browser with VT scan display, and install/uninstall flows**

## Performance

- **Duration:** 8 min (482s)
- **Started:** 2026-02-15T11:07:09Z
- **Completed:** 2026-02-15T11:15:11Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- OpenAPI 3.1 spec (1,202 lines) with all 12 endpoints, full request/response schemas, error codes (400/403/404/429/500/503), security notes, and examples
- UI screen spec (950 lines) with 5 screens covering all Phase 6 requirements (SETUP-02, SKIL-01, SKIL-02, SKIL-03, SKIL-04)
- Component inventory: 22 new components + 2 hooks documented with component structure and data requirements
- API-to-screen mapping table linking all 12 endpoints to their consuming screens
- VirusTotal scan display documented in detail: clean/suspicious/malicious/not-configured states

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OpenAPI 3.1 specification for Phase 6 endpoints** - `f43810b` (docs)
2. **Task 2: Create UI screen specifications for Docker sandbox and Skills browser** - `3a799b1` (docs)

## Files Created/Modified
- `.planning/api-specs/phase-06-openapi.yaml` - OpenAPI 3.1 spec for all 12 Docker and Skills endpoints with schemas, examples, error codes
- `.planning/ui-specs/phase-06-screens.md` - UI screen spec for 5 screens: Docker sandbox setup, Skills browser, Skill detail, Install/Uninstall flow, Installed skills list

## Decisions Made
- Skills browser is a dashboard page (not wizard step) -- accessed from sidebar after setup is complete, separate from wizard flow
- Docker sandbox adds a third setup mode card alongside "Local Setup" and "Remote VPS Setup"
- Skill detail uses a slide-over panel from the right edge (full-screen on mobile) rather than a modal -- provides more space for description and VT results
- Malicious skills are always blocked with no force override possible -- `force: true` only bypasses suspicious threshold
- VirusTotal section displays 4 distinct states: clean (green), suspicious (yellow), malicious (red), and not-configured (gray)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. These are documentation/specification files only.

## Next Phase Readiness
- OpenAPI spec ready for Plan 04 (Docker frontend) and Plan 05 (Skills frontend) to reference
- UI screen spec provides complete implementation guide for frontend engineers
- Skills types referenced in specs need to be created by Plan 02 (Skills backend) before frontend work
- All Docker types already exist from Plan 01

## Self-Check: PASSED

- [x] `.planning/api-specs/phase-06-openapi.yaml` exists (1,202 lines, min 150)
- [x] `.planning/ui-specs/phase-06-screens.md` exists (950 lines, min 200)
- [x] OpenAPI spec is valid YAML (verified with yq)
- [x] All 12 operationIds present in OpenAPI spec
- [x] Requirement references in UI spec: 10 (min 5)
- [x] API endpoint references in UI spec: 33 (min 10)
- [x] Task 1 commit f43810b verified in git log
- [x] Task 2 commit 3a799b1 verified in git log

---
*Phase: 06-docker-skills-management*
*Completed: 2026-02-15*
