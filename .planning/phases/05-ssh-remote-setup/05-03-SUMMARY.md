---
phase: 05-ssh-remote-setup
plan: 03
subsystem: frontend-wizard
tags: [ui-specs, wizard-steps, phase-5, security-ack, advanced-config]
dependency-graph:
  requires:
    - v1.0 wizard infrastructure (WizardStep, WizardNavigation, useWizard)
    - react-hook-form + zod validation
  provides:
    - UI specifications for Phase 5 remote setup flow
    - SecurityAck step component with security warning
    - AdvancedConfig step component with bind mode, auth, Tailscale
  affects:
    - Future remote setup UI implementation (Screens 1, 2, 5)
tech-stack:
  added:
    - None (uses existing v1.0 dependencies)
  patterns:
    - UI specifications as implementation guide
    - Zod schema validation with refine() for conditional rules
    - react-hook-form watch() for conditional rendering
    - Dark mode with Tailwind CSS v4 (gray-50/zinc-800)
key-files:
  created:
    - .planning/ui-specs/phase-05-screens.md
    - frontend/src/components/steps/SecurityAck.tsx
    - frontend/src/components/steps/AdvancedConfig.tsx
  modified:
    - frontend/src/schemas/wizardSchemas.ts
decisions:
  - "UI specs document provides standalone implementation guide (543 lines) for frontend engineers"
  - "Security acknowledgement requires checkbox before proceeding (SETUP-04 requirement)"
  - "Gateway bind mode defaults to localhost (safer option)"
  - "Gateway auth mode defaults to none (user can enable basic auth)"
  - "Tailscale integration is optional checkbox (not required for basic remote setup)"
  - "Conditional fields use react-hook-form watch() pattern (follows v1.0 approach)"
metrics:
  duration: 4 minutes
  completed: 2026-02-14T17:12:57Z
---

# Phase 5 Plan 3: UI Specs & Wizard Steps Summary

**Document UI screen specifications for remote setup flow and implement skipped wizard steps (security acknowledgement, gateway bind mode, auth mode, Tailscale).**

## What Was Built

Created comprehensive UI specifications for Phase 5 remote setup flow (5 screens) and implemented 2 new wizard step components (SecurityAck, AdvancedConfig) that were skipped in v1.0.

### Task 1: UI Screen Specifications (da3742c)

Created `.planning/ui-specs/phase-05-screens.md` with complete specifications for all Phase 5 screens:

**Screen 1: Setup Mode Selection**
- Two-card layout: Local Setup vs Remote VPS Setup
- User selects installation target
- Routing: local → v1.0 SystemCheck, remote → SSH Credentials

**Screen 2: SSH Credentials Form**
- 3 input fields: hostname, username, SSH key path
- "Test Connection" button before Continue
- Info callout about keychain security
- Validation with Zod schema
- API: POST /api/remote/test-connection

**Screen 3: Security Acknowledgement** (implemented in Task 2)
- Warning box with security implications
- Checkbox acknowledgement required
- Stores timestamp with acknowledgement

**Screen 4: Advanced Gateway Configuration** (implemented in Task 3)
- Gateway bind mode: localhost vs all interfaces
- Gateway auth: none vs basic auth (username/password)
- Optional Tailscale integration with auth key
- Conditional field rendering

**Screen 5: Remote Installation Progress**
- 7-stage progress display (connecting, checking Node, installing, etc.)
- Real-time updates via WebSocket
- Console output panel (optional)
- Error states with troubleshooting links
- API: WS /ws/remote/install

**Additional Documentation:**
- Data flow summary with WizardFormData interface
- Component inventory (10 new components to create)
- Error states and messages for SSH/installation failures
- Accessibility guidelines (ARIA, keyboard nav, focus management)
- Mobile responsiveness patterns
- Implementation notes for frontend engineer

**Metrics:** 543 lines covering all 5 screens with component structures, state management, API calls, validation, error handling.

### Task 2: SecurityAck Step Component (4414c44)

Implemented `frontend/src/components/steps/SecurityAck.tsx`:

**Features:**
- Warning box with orange-700 border, amber-50/amber-950 background (light/dark)
- Warning triangle icon (SVG)
- Security notice with 4 bullet points:
  - AI agents can read, write, execute files
  - Commands run with user privileges
  - Malicious prompts could harm system
  - Review connected channels
- Checkbox: "I understand the security implications and accept the risks..."
- Continue button disabled until acknowledged
- Stores `{ acknowledged: true, timestamp: Date.now() }` in wizard state

**Validation:**
- Added `securityAckSchema` to wizardSchemas.ts
- Zod refine() ensures acknowledged === true
- TypeScript type: SecurityAckData

**Styling:**
- Follows v1.0 patterns (WizardStep, WizardNavigation, useWizard)
- Dark mode support with Tailwind CSS v4
- Sky-400 checkbox accent color (brand color)

### Task 3: AdvancedConfig Step Component (b97a1a3)

Implemented `frontend/src/components/steps/AdvancedConfig.tsx`:

**Section 1: Gateway Bind Mode**
- Radio buttons: "Localhost only (127.0.0.1)" vs "All interfaces (0.0.0.0)"
- Default: localhost (recommended for security)
- Help text explaining security implications

**Section 2: Gateway Authentication**
- Radio buttons: "No authentication" vs "Basic authentication"
- Default: none
- Conditional username/password fields when basic auth selected
- Fields rendered in indented gray-50/zinc-800 background box

**Section 3: Tailscale (Optional)**
- Checkbox: "Enable Tailscale"
- Default: disabled
- Conditional auth key input field when enabled
- Help text: "Get this from Tailscale admin console (Settings → Keys)"

**Form Handling:**
- react-hook-form with zodResolver(advancedConfigSchema)
- watch('authMode') and watch('tailscaleEnabled') for conditional rendering
- handleSubmit → updateFormData('advancedConfig', data) → nextStep()

**Validation:**
- Added `advancedConfigSchema` to wizardSchemas.ts
- Zod refine() ensures username/password required when authMode === 'basic'
- TypeScript type: AdvancedConfigData

**Styling:**
- Radio/checkbox inputs with sky-400 accent color
- Hover states on selectable labels (hover:bg-gray-50 dark:hover:bg-zinc-800)
- Conditional fields indented with ml-6 and background color
- Error messages in red-600 below invalid fields

## Deviations from Plan

None - plan executed exactly as written.

All three tasks completed without issues:
- UI specs document created with 543 lines (exceeds 200-line minimum)
- SecurityAck component follows v1.0 patterns precisely
- AdvancedConfig component implements all required sections with validation

No bugs found, no missing critical functionality, no blocking issues, no architectural changes needed.

## Key Technical Details

**UI Specifications Document:**
- Standalone implementation guide (no context needed)
- Component structures with full TSX examples
- State management following v1.0 WizardProvider pattern
- API integration details (endpoints, request/response types)
- Error states with user-facing messages
- Accessibility and mobile responsiveness guidelines

**SecurityAck Component:**
- Pure presentation component (no API calls)
- Local state for checkbox, wizard state for persistence
- Simple flow: read warning → check box → continue
- Timestamp recorded for audit trail

**AdvancedConfig Component:**
- Form-based with react-hook-form
- watch() pattern for conditional rendering (auth fields, Tailscale field)
- Zod schema with refine() for cross-field validation
- Default values from formData.advancedConfig or safe defaults

**Validation Patterns:**
- securityAckSchema: refine() ensures acknowledged === true
- advancedConfigSchema: refine() ensures username/password when authMode === 'basic'
- Both schemas export TypeScript types for type safety

**Styling Consistency:**
- Sky-400 accent color for all interactive elements (brand color)
- Gray-50/zinc-800 for conditional field backgrounds (light/dark)
- Orange-700/amber for warning box (security notice)
- Red-600 for error messages
- Tailwind CSS v4 with dark mode selector strategy

## Files Modified

**Created:**
- `.planning/ui-specs/phase-05-screens.md` (543 lines) - Complete UI specifications for Phase 5
- `frontend/src/components/steps/SecurityAck.tsx` (86 lines) - Security acknowledgement step
- `frontend/src/components/steps/AdvancedConfig.tsx` (197 lines) - Advanced configuration step

**Modified:**
- `frontend/src/schemas/wizardSchemas.ts` - Added securityAckSchema, advancedConfigSchema, and type exports

**Total:** 3 files created, 1 file modified, 826 new lines of code/documentation.

## Success Criteria Met

- [x] .planning/ui-specs/phase-05-screens.md exists with 543 lines (minimum: 200)
- [x] UI specs document covers all 5 screens with component structures, state management, API calls
- [x] SecurityAck.tsx component exists with warning box, checkbox, timestamp storage
- [x] AdvancedConfig.tsx component exists with bind mode, auth mode, Tailscale sections
- [x] Zod schemas added to wizardSchemas.ts: securityAckSchema, advancedConfigSchema
- [x] npx tsc --noEmit passes (no TypeScript errors)
- [x] Components follow v1.0 wizard patterns (WizardStep, WizardNavigation, useWizard)
- [x] Tailwind CSS v4 classes used consistently with dark mode support
- [x] Validation includes refine() for conditional requirements (basic auth, security ack)

All verification steps passed. TypeScript compilation successful. All must-have artifacts created with correct content.

## Self-Check: PASSED

Verified all created files exist:
- [x] .planning/ui-specs/phase-05-screens.md - FOUND (543 lines)
- [x] frontend/src/components/steps/SecurityAck.tsx - FOUND (export function SecurityAck)
- [x] frontend/src/components/steps/AdvancedConfig.tsx - FOUND (export function AdvancedConfig)

Verified all commits exist:
- [x] da3742c - FOUND (feat(05-03): create UI screen specifications for Phase 5 remote setup)
- [x] 4414c44 - FOUND (feat(05-03): implement SecurityAck step component)
- [x] b97a1a3 - FOUND (feat(05-03): implement AdvancedConfig step component)

Verified TypeScript compilation:
- [x] npx tsc --noEmit - PASSED (no errors)

Verified schemas exist:
- [x] securityAckSchema in wizardSchemas.ts - FOUND
- [x] advancedConfigSchema in wizardSchemas.ts - FOUND

All files, commits, and validations verified successfully.
