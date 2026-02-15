# Phase 6: Docker Sandbox & Skills Management -- UI Screen Specifications

## Overview

This document specifies all UI screens, components, flows, states, and data requirements for Phase 6 (Docker Sandbox & Skills Management). A frontend engineer with NO prior knowledge of this codebase should be able to implement the entire interface using only this document and the OpenAPI spec at `.planning/api-specs/phase-06-openapi.yaml`.

### Technology Context

- Framework: React 19 with TypeScript
- Styling: Tailwind CSS v4
- State: React Context (WizardProvider from v1.0)
- Forms: react-hook-form + zod
- API: REST endpoints (see phase-06-openapi.yaml)
- Types: Auto-generated from Rust via ts-rs (in frontend/src/types/)

### Color Palette (existing dark mode)

- Background: `bg-zinc-900` (#18181B)
- Surface: `bg-zinc-800` (#27272A)
- Border: `border-zinc-700` (#3F3F46)
- Primary button: `bg-sky-400/60` (#38BDF8 at 60%)
- Accent (warnings): `text-orange-700` (#C2410C)
- Success: `text-emerald-400` (#34D399)
- Error: `text-red-400` (#F87171)
- Text primary: `text-zinc-100` (#F4F4F5)
- Text secondary: `text-zinc-400` (#A1A1AA)

### Requirement Mapping

| Req ID   | Requirement                                              | Screen(s)            |
|----------|----------------------------------------------------------|----------------------|
| SETUP-02 | Docker sandbox mode during setup                         | Screen 1             |
| SKIL-01  | Browse ClawHub skills with categories and search         | Screen 2             |
| SKIL-02  | Install and uninstall skills with one click              | Screen 4             |
| SKIL-03  | Skill detail view with descriptions and capabilities     | Screen 2, Screen 3   |
| SKIL-04  | VirusTotal security scan results before installation     | Screen 3, Screen 4   |

---

## Screen 1: Docker Sandbox Setup (SETUP-02)

**Purpose:** User sets up a Docker sandbox container for safe OpenClaw experimentation. Part of the wizard flow, appears after the "Setup Mode Selection" screen when user chooses Docker sandbox mode.

**Entry point:** Setup Mode Selection card -- add a third option alongside "Local Setup" and "Remote VPS Setup":
- Card 3: "Docker Sandbox" -- icon: container/box, description: "Run OpenClaw in an isolated Docker container (safe for experimentation)"

### States

#### State 1: Checking Docker Availability

**Visual:**
- Centered spinner animation
- Text: "Checking Docker availability..."
- Subtext (muted): "Looking for Docker Desktop or Docker Engine"

**Behavior:**
- On mount: call `GET /api/docker/status`
- Spinner shows for duration of API call
- Transition to State 2 (Not Available) or State 3 (Available) based on response

**Data:** `DockerStatusResponse` from `GET /api/docker/status`

#### State 2: Docker Not Available

**Visual:**
- Info icon (blue circle with "i")
- Title: "Docker Not Available"
- Body text: "Docker Desktop or Docker Engine is required for sandbox mode. Install Docker to continue, or choose a different setup mode."
- Link: "Install Docker Desktop" -> https://www.docker.com/products/docker-desktop (opens in new tab)
- Two buttons:
  - "Retry" (secondary) -- re-checks `GET /api/docker/status`
  - "Continue without Docker" (primary) -- navigates back to setup mode selection

**Trigger:** `DockerStatusResponse.available === false`

#### State 3: Docker Available

**Visual:**
- Green checkmark badge with "Docker Available"
- Docker version display: "Docker Engine v{version}"
- Explanation box (zinc-800 background, rounded, padded):
  - Title: "What is sandbox mode?"
  - Body: "Runs OpenClaw in an isolated container with resource limits (512MB RAM, 1 CPU). Safe for experimentation -- will not affect your host system."
  - Bullet points:
    - "Isolated from your files and network"
    - "Automatic resource limits prevent runaway processes"
    - "Easy cleanup -- just remove the container"
- Input field: Container name (text, placeholder: "my-sandbox", validation: alphanumeric + hyphens)
- Button: "Create Sandbox" (primary, sky-400/60)

**Data:** `DockerStatusResponse.available === true`, `DockerStatusResponse.version`

#### State 4: Creating Container

**Visual:**
- Spinner with "Creating sandbox container..."
- Subtext: "Setting up isolated environment with security limits"
- Below spinner: security checklist (items appear as applied):
  - [ ] Memory limit: 512MB
  - [ ] CPU limit: 1 core
  - [ ] Process limit: 100
  - [ ] Capabilities restricted
  - [ ] Non-root user

**Behavior:**
- Call `POST /api/docker/create` with `{ name: containerName, image: null }`
- Each checklist item checks after ~300ms delay (visual feedback, not real)
- On success: transition to State 5 (Running)
- On 429: transition to State 6 (Error) with limit message

**Data:** `DockerCreateRequest` -> `DockerCreateResponse`

#### State 5: Container Running

**Visual:**
- Success banner: green border, "Sandbox Running" with lock icon
- Container info card:
  - Container ID (first 12 chars): `abc123def456`
  - Status badge: green dot + "Running"
  - Port: "http://localhost:{port}"
  - Image: "node:20-alpine"
  - Created: relative time ("just now")
- Security badge: lock icon + "Sandboxed" pill (emerald background)
  - Tooltip on hover: "This container runs with restricted capabilities: 512MB memory limit, 1 CPU, no root access, no Docker socket access"
- Action buttons:
  - "Open in Browser" (primary) -- opens http://localhost:{port} in new tab
  - "View Logs" (secondary) -- expands log viewer
  - "Stop Sandbox" (secondary, red text on hover) -- calls `POST /api/docker/{id}/stop`

**Data:** `DockerCreateResponse.container_id`, `DockerCreateResponse.port`

#### State 6: Error

**Visual:**
- Red error banner with error icon
- Error message from API response
- "Retry" button

### Container Management Panel

Shown below the main state area when containers exist. Visible in States 3, 5, and 6.

**Layout:**
- Section title: "Your Containers" with count badge: "{count}/5"
- Container limit indicator: progress bar showing `{count}/5` usage
- Container list (vertical stack):

**Each container row:**
```
[Status dot] container-name    node:20-alpine    :49152    2 min ago    [Stop] [Remove]
```
- Status dot: green (Running), gray (Stopped/Created), red (Error/Exited)
- Container name (bold, truncated)
- Image name (muted text)
- Port (if mapped, otherwise "--")
- Created time (relative)
- Actions:
  - Running: "Stop" button, "Logs" button, "Remove" button (with confirmation)
  - Stopped: "Remove" button
  - "Logs" button opens expandable section

**Expandable Logs Section:**
- Triggered by "View Logs" button on container row
- Dark background (`bg-zinc-950`), monospaced font
- Shows last 100 lines from `GET /api/docker/{id}/logs?tail=100`
- Auto-scrolls to bottom
- "Refresh" button to re-fetch
- "Close" button to collapse

**Security Indicators:**
- Lock icon with "Sandboxed" badge on all running containers
- Tooltip: "This container runs with restricted capabilities: 512MB memory limit, 1 CPU, no root access, no Docker socket access"
- If container is in Error state: yellow warning icon + error description

**Data:** `GET /api/docker/containers` -> `ContainerInfo[]`, `GET /api/docker/{id}/logs` -> `ContainerLogsResponse`

### Component Structure

```tsx
<WizardStep title="Docker Sandbox" description="Run OpenClaw in an isolated container">
  {status === 'checking' && <DockerCheckingSpinner />}
  {status === 'not-available' && <DockerNotAvailable onRetry={checkDocker} onSkip={goBack} />}
  {status === 'available' && (
    <DockerAvailable
      version={dockerStatus.version}
      onCreateSandbox={handleCreate}
    />
  )}
  {status === 'creating' && <DockerCreating />}
  {status === 'running' && (
    <DockerRunning container={container} onStop={handleStop} onViewLogs={handleLogs} />
  )}
  {status === 'error' && <DockerError error={errorMessage} onRetry={handleRetry} />}

  {containers.length > 0 && (
    <ContainerManagementPanel
      containers={containers}
      maxContainers={5}
      onStop={handleStopContainer}
      onRemove={handleRemoveContainer}
      onViewLogs={handleViewLogs}
    />
  )}
</WizardStep>
```

---

## Screen 2: Skills Browser (SKIL-01, SKIL-03)

**Purpose:** Browse and search OpenClaw skills from the ClawHub registry. Accessed from the dashboard/control center navigation, NOT the wizard flow.

**Entry point:** Dashboard sidebar or tab: "Skills" with puzzle-piece icon.

### Layout

**Top section:**
- Page title: "Skills" (large, bold)
- Subtitle: "Browse and manage OpenClaw skills from ClawHub"

**Search bar:**
- Full-width input with search icon (left) and clear button (right, when non-empty)
- Placeholder: "Search OpenClaw skills..."
- Debounce: 300ms before triggering API call
- On change: `GET /api/skills/search?q={query}&category={selectedCategory}`

**Category filter pills:**
- Horizontal scrollable row of pill/chip buttons
- Categories: "All" (default), "DevTools", "Data Processing", "API Integration", "Automation", "Security", "Monitoring"
- Active pill: sky-400/60 background, white text
- Inactive pill: zinc-800 background, zinc-400 text
- Clicking a category immediately updates results (combined with search query)

**Tab bar:**
- Two tabs: "Browse" (active by default) | "Installed ({count})"
- "Browse" tab shows search results from ClawHub
- "Installed" tab shows locally installed skills (see Screen 5)

**Main content area (Browse tab):**
- Grid layout: 2 columns on desktop (md+), 1 column on mobile
- Skill cards (see Skill Card component below)

### Skill Card Component

```
+--------------------------------------------------+
|  data-transform                        v1.2.0    |
|  by openclaw-community                           |
|                                                  |
|  Transform and process data in CSV, JSON,        |
|  XML, and YAML formats. Supports streaming...    |
|                                                  |
|  [csv] [json] [xml] [transform]                  |
|                                                  |
|  ↓ 15,420 downloads                              |
|                                                  |
|  [View Details]              [Install]           |
+--------------------------------------------------+
```

- **Name** (bold, zinc-100, text-lg)
- **Version badge** (pill, zinc-700 bg, zinc-300 text, text-xs)
- **Author** (muted, zinc-400, text-sm): "by {author}"
- **Description** (zinc-300, text-sm, 2 lines max with truncation via `line-clamp-2`)
- **Tags** (row of small pills: zinc-800 bg, zinc-400 text, text-xs, max 4 visible, "+N more" if overflow)
- **Download count** (muted, zinc-500): download icon + formatted number (15,420)
- **Action buttons:**
  - "View Details" (secondary/ghost button) -- opens Skill Detail (Screen 3)
  - "Install" (primary, sky-400/60) -- triggers install flow (Screen 4)
  - If already installed: button shows "Installed" (emerald text, checkmark icon, disabled) with "Uninstall" secondary action

### States

#### Loading State
- Skeleton cards: 4 placeholder cards with pulsing animation
- Skeleton elements: gray rectangle for name, short rectangle for version, two lines for description, row of small circles for tags

#### Results State
- Grid of skill cards
- If search active: results count text above grid: "{total} skills found"

#### Empty State
- Centered illustration (optional: simple line art of empty box or magnifying glass)
- Title: "No skills found"
- Body: "Try a different search or category."
- If search active: "Clear search" link to reset

#### Error State
- Red error banner
- Title: "Could not load skills"
- Body: "Check your internet connection and try again."
- "Retry" button

### Component Structure

```tsx
<DashboardPage title="Skills" subtitle="Browse and manage OpenClaw skills from ClawHub">
  <SearchBar
    value={query}
    onChange={setQuery}
    placeholder="Search OpenClaw skills..."
    debounceMs={300}
  />

  <CategoryFilters
    categories={['All', 'DevTools', 'DataProcessing', 'ApiIntegration', 'Automation', 'Security', 'Monitoring']}
    selected={selectedCategory}
    onSelect={setSelectedCategory}
  />

  <TabBar
    tabs={[
      { id: 'browse', label: 'Browse' },
      { id: 'installed', label: `Installed (${installedCount})` },
    ]}
    active={activeTab}
    onSelect={setActiveTab}
  />

  {activeTab === 'browse' && (
    <>
      {isLoading && <SkillCardSkeleton count={4} />}
      {error && <SkillsError error={error} onRetry={refetch} />}
      {skills.length === 0 && !isLoading && <SkillsEmpty query={query} onClear={clearSearch} />}
      {skills.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {skills.map((skill) => (
            <SkillCard
              key={skill.name}
              skill={skill}
              installed={isInstalled(skill.name)}
              onViewDetails={() => openDetail(skill)}
              onInstall={() => startInstall(skill)}
              onUninstall={() => startUninstall(skill)}
            />
          ))}
        </div>
      )}
    </>
  )}

  {activeTab === 'installed' && <InstalledSkillsList />}
</DashboardPage>
```

**Data requirements:**
- Browse: `GET /api/skills/search?q={query}&category={category}` -> `SkillSearchResponse`
- Installed count: `GET /api/skills/installed` -> `InstalledSkill[]`

---

## Screen 3: Skill Detail View (SKIL-03, SKIL-04)

**Purpose:** Show full details for a specific skill including description, capabilities, and VirusTotal scan results. Displayed as a slide-over panel from the right edge (preferred) or a modal.

### Layout

**Header:**
- Skill name (text-2xl, bold, zinc-100)
- Version badge (pill)
- Author with link: "by {author}" -- if homepage exists, author name is a link
- Close button (X) in top-right corner

**Full description:**
- Rendered as markdown if the skill description contains markdown formatting
- Plain text fallback otherwise
- Max height with scroll if very long

**Capabilities section:**
- Section title: "Required Capabilities"
- List of capabilities with icons:
  - `network_access`: globe icon + "Network Access"
  - `filesystem_read`: folder-open icon + "Read Files"
  - `filesystem_write`: pencil icon + "Write Files"
  - `process_spawn`: terminal icon + "Run Processes"
  - `docker_access`: container icon + "Docker Access" (red warning if present)
- Each capability on its own line with icon + label
- If no capabilities: "This skill requires no special permissions"

**Tags/Keywords:**
- Section title: "Tags"
- Row of pills (same style as skill card tags)

**Links:**
- Repository link (if available): GitHub icon + "Source Code"
- Homepage link (if available): globe icon + "Homepage"

**Download count:**
- download icon + "{downloads} downloads"

**VirusTotal Scan Section (SKIL-04):**

This section is visually prominent -- bordered box with scan results.

**If scan is available:**

*Clean (threat_level = "Clean"):*
```
+--------------------------------------------------+
|  [green checkmark]  No threats detected           |
|  0/72 scanners flagged this skill                |
|  Scanned: Feb 15, 2026                           |
|  [View Full Report]                              |
+--------------------------------------------------+
```
- Green border and emerald-400 checkmark icon
- Text: "No threats detected by {total_scanners} antivirus engines"
- "View Full Report" link to VirusTotal permalink (opens in new tab)

*Suspicious (threat_level = "Suspicious"):*
```
+--------------------------------------------------+
|  [yellow warning]  Caution: Suspicious detections |
|  0 malicious / 4 suspicious / 72 total scanners |
|  Review before installing.                       |
|  Scanned: Feb 15, 2026                           |
|  [View Full Report]                              |
+--------------------------------------------------+
```
- Yellow/amber border and warning triangle icon
- Text: "Caution: {suspicious_count} scanners flagged potential issues. Review before installing."
- "View Full Report" link

*Malicious (threat_level = "Malicious"):*
```
+--------------------------------------------------+
|  [red X]  BLOCKED: Malware detected               |
|  5 malicious / 2 suspicious / 72 total scanners  |
|  This skill cannot be installed.                  |
|  Scanned: Feb 15, 2026                           |
|  [View Full Report]                              |
+--------------------------------------------------+
```
- Red border and red X icon
- Text: "BLOCKED: {malicious_count} scanners detected malware. This skill cannot be installed."
- Install button disabled
- "View Full Report" link

**If no VT API key configured:**
```
+--------------------------------------------------+
|  [gray info]  VirusTotal scanning not configured  |
|  Set VIRUSTOTAL_API_KEY to enable security        |
|  scanning for skills.                             |
+--------------------------------------------------+
```
- Gray border and gray info icon
- Text: "VirusTotal scanning not configured. Set VIRUSTOTAL_API_KEY to enable security scanning."

**If scan not yet performed:**
```
+--------------------------------------------------+
|  [gray shield]  Not yet scanned                   |
|  Scan will run automatically before installation. |
|  [Scan Now]                                       |
+--------------------------------------------------+
```
- "Scan Now" button calls `POST /api/skills/scan` with skill name and version

**Install/Uninstall button (large, full width at bottom):**
- If not installed: "Install {name}" (primary, sky-400/60, large)
- If installed: "Uninstall {name}" (destructive, red border, red text on hover)
- If malicious: "Install {name}" (disabled, gray, with tooltip "Blocked: malware detected")

### Component Structure

```tsx
<SlideOverPanel onClose={onClose} title={skill.name}>
  <div className="space-y-6">
    <SkillDetailHeader
      name={skill.name}
      version={skill.version}
      author={skill.author}
      homepage={skill.homepage}
    />

    <SkillDescription description={skill.description} />

    <SkillCapabilities capabilities={skill.capabilities} />

    <SkillTags tags={skill.tags} />

    <SkillLinks repository={skill.repository} homepage={skill.homepage} />

    <SkillDownloads count={skill.downloads} />

    <VirusTotalSection
      scanResult={scanResult}
      vtConfigured={vtConfigured}
      onScanNow={() => scanSkill(skill.name, skill.version)}
      isScanning={isScanning}
    />

    <SkillInstallButton
      installed={isInstalled}
      blocked={scanResult?.threat_level === 'Malicious'}
      onInstall={() => startInstall(skill)}
      onUninstall={() => startUninstall(skill)}
      skillName={skill.name}
    />
  </div>
</SlideOverPanel>
```

**Data requirements:**
- Skill details: `GET /api/skills/{name}` -> `SkillMetadata`
- Scan results: `POST /api/skills/scan` -> `ScanResult`
- Install check: cross-reference with `GET /api/skills/installed`

---

## Screen 4: Skill Install/Uninstall Flow (SKIL-02, SKIL-04)

**Purpose:** Handle the full install and uninstall lifecycle with VirusTotal scanning integration. These flows are triggered from skill cards (Screen 2) or the detail view (Screen 3).

### Install Flow

The install flow can be triggered from:
1. "Install" button on a skill card in the browser
2. "Install {name}" button in the detail view

**Step 1: Initiate Scan (if VT configured and not cached)**

**Visual (inline in card or modal):**
- Spinner icon
- Text: "Scanning for threats..."
- Subtext: "Checking with VirusTotal ({total_scanners} antivirus engines)"

**Behavior:**
- Call `POST /api/skills/scan` with `{ name, version }`
- If scan cached (within 24h): skip directly to Step 2
- If 429 rate limit: show "VirusTotal rate limit reached. Wait 60 seconds or skip scan." with "Skip" option

**Step 2: Scan Result Decision**

*If Clean (threat_level = "Clean"):*
- Brief green flash: "No threats detected" (1 second)
- Auto-proceed to Step 3

*If Suspicious (threat_level = "Suspicious"):*
- Confirmation dialog (modal):
  ```
  +------------------------------------------+
  |  [warning icon]  Suspicious Detections    |
  |                                          |
  |  {suspicious_count} scanners flagged      |
  |  potential issues with this skill.        |
  |                                          |
  |  Scan details:                           |
  |  - {suspicious_count} suspicious         |
  |  - 0 malicious                           |
  |  - {total_scanners} total scanners       |
  |                                          |
  |  [View Report]                           |
  |                                          |
  |  [Cancel]              [Install Anyway]  |
  +------------------------------------------+
  ```
- "Cancel" -- aborts installation
- "Install Anyway" -- proceeds to Step 3 with `force: true`

*If Malicious (threat_level = "Malicious"):*
- Error modal:
  ```
  +------------------------------------------+
  |  [red X icon]  Installation Blocked       |
  |                                          |
  |  {malicious_count} antivirus engines      |
  |  detected malware in this skill.          |
  |                                          |
  |  This skill cannot be installed.          |
  |                                          |
  |  [View Report]           [Close]         |
  +------------------------------------------+
  ```
- No install option. Malicious skills are always blocked.

**Step 3: Installing**

**Visual (inline or modal):**
- Spinner: "Installing {skill_name}..."
- Progress text: "Downloading and extracting skill package"

**Behavior:**
- Call `POST /api/skills/install` with `{ name, version, force }`
- On success: proceed to Step 4
- On error: show error with retry button

**Step 4: Installed Successfully**

**Visual:**
- Green checkmark animation
- Text: "Installed {skill_name} v{version}"
- The skill card button changes from "Install" to "Installed" (with checkmark)
- Auto-dismiss after 3 seconds (or click to dismiss)

**On error (at any step):**
- Red error banner
- Error message from API
- "Retry" and "Cancel" buttons

### Uninstall Flow

**Step 1: Confirmation Dialog**

Triggered from "Uninstall" button in detail view or installed skills list.

```
+------------------------------------------+
|  Remove {skill_name}?                     |
|                                          |
|  This will uninstall the skill globally.  |
|  You can reinstall it later from ClawHub. |
|                                          |
|  [Cancel]              [Uninstall]       |
+------------------------------------------+
```

- "Cancel" -- closes dialog
- "Uninstall" -- red/destructive button style

**Step 2: Removing**

**Visual:**
- Spinner: "Removing {skill_name}..."

**Behavior:**
- Call `DELETE /api/skills/{name}`
- On success: proceed to Step 3
- On error: show error with retry

**Step 3: Removed Successfully**

**Visual:**
- Green checkmark: "Uninstalled {skill_name}"
- Skill card button changes back to "Install"
- Auto-dismiss after 2 seconds

### Component Structure

```tsx
{/* Install confirmation modal */}
<ConfirmDialog
  open={showSuspiciousConfirm}
  title="Suspicious Detections"
  icon={<WarningIcon className="text-amber-400" />}
  description={`${scanResult.suspicious_count} scanners flagged potential issues.`}
  actions={[
    { label: 'Cancel', variant: 'secondary', onClick: cancelInstall },
    { label: 'Install Anyway', variant: 'primary', onClick: () => confirmInstall(true) },
  ]}
  footer={<a href={scanResult.permalink} target="_blank">View Full Report</a>}
/>

{/* Malicious block modal */}
<AlertDialog
  open={showMaliciousBlock}
  title="Installation Blocked"
  icon={<XCircleIcon className="text-red-400" />}
  description={`${scanResult.malicious_count} antivirus engines detected malware.`}
  actions={[
    { label: 'Close', variant: 'secondary', onClick: closeBlock },
  ]}
  footer={<a href={scanResult.permalink} target="_blank">View Full Report</a>}
/>

{/* Uninstall confirmation */}
<ConfirmDialog
  open={showUninstallConfirm}
  title={`Remove ${skillName}?`}
  description="This will uninstall the skill globally. You can reinstall it later from ClawHub."
  actions={[
    { label: 'Cancel', variant: 'secondary', onClick: cancelUninstall },
    { label: 'Uninstall', variant: 'destructive', onClick: confirmUninstall },
  ]}
/>
```

**Data requirements:**
- Scan: `POST /api/skills/scan` -> `ScanResult`
- Install: `POST /api/skills/install` -> `SkillInstallResponse`
- Uninstall: `DELETE /api/skills/{name}` -> `EmptyResponse`

---

## Screen 5: Installed Skills List

**Purpose:** Show all currently installed OpenClaw skills with version, path, and uninstall actions. Displayed as the "Installed" tab within the Skills Browser (Screen 2).

### Layout

**Tab context:** Active when "Installed ({count})" tab is selected in Skills Browser.

**List view** (not grid -- more appropriate for management):

**Each installed skill row:**
```
+------------------------------------------------------------------+
|  web-scraper            v2.0.1       240 KB        [Uninstall]   |
|  /home/user/.openclaw/skills/web-scraper                         |
|  Installed Feb 14, 2026                                          |
+------------------------------------------------------------------+
```

- **Name** (bold, zinc-100)
- **Version** (pill badge, zinc-700)
- **Size** (muted, formatted: KB/MB)
- **Path** (muted, monospaced, text-xs, truncated with tooltip for full path)
- **Installed date** (muted, relative or formatted)
- **Uninstall button** (secondary, red on hover, right-aligned)

### States

#### Loading State
- Skeleton list rows (3 placeholder rows with pulse animation)

#### With Skills
- List of installed skills
- Subtitle above list: "{count} skills installed"

#### Empty State
- Centered content:
  - Title: "No OpenClaw skills installed"
  - Body: "Browse available skills to get started."
  - Button: "Browse Skills" (primary) -- switches to Browse tab

### Component Structure

```tsx
<div className="space-y-3">
  {isLoading && <InstalledSkillSkeleton count={3} />}

  {!isLoading && installedSkills.length === 0 && (
    <EmptyState
      title="No OpenClaw skills installed"
      description="Browse available skills to get started."
      action={{ label: 'Browse Skills', onClick: () => setActiveTab('browse') }}
    />
  )}

  {installedSkills.length > 0 && (
    <>
      <p className="text-sm text-zinc-400">{installedSkills.length} skills installed</p>
      {installedSkills.map((skill) => (
        <InstalledSkillRow
          key={skill.name}
          skill={skill}
          onUninstall={() => startUninstall(skill.name)}
        />
      ))}
    </>
  )}
</div>
```

**Data requirements:** `GET /api/skills/installed` -> `InstalledSkill[]`

---

## Data Flow Summary

### Wizard State Extensions (for Docker Sandbox)

```ts
interface WizardFormData {
  setupMode: {
    mode: 'local' | 'remote' | 'docker'; // 'docker' added for Phase 6
  };
  dockerSandbox?: {
    containerId: string;
    containerName: string;
    port: number;
  };
  // ... existing v1.0 and Phase 5 fields
}
```

### Skills State (Dashboard Context)

```ts
interface SkillsState {
  // Browse tab
  searchQuery: string;
  selectedCategory: SkillCategory | 'All';
  searchResults: SkillMetadata[];
  totalResults: number;
  isSearching: boolean;
  searchError: string | null;

  // Installed tab
  installedSkills: InstalledSkill[];
  isLoadingInstalled: boolean;

  // Detail view
  selectedSkill: SkillMetadata | null;
  isDetailOpen: boolean;

  // Install/Uninstall
  installingSkill: string | null; // name of skill being installed
  uninstallingSkill: string | null; // name of skill being uninstalled
  scanResult: ScanResult | null;
  isScanning: boolean;
}
```

### API Integration Summary

| Endpoint                       | Method | Screen(s)        | Purpose                        |
|-------------------------------|--------|------------------|--------------------------------|
| `/api/docker/status`          | GET    | Screen 1         | Check Docker availability      |
| `/api/docker/containers`      | GET    | Screen 1         | List managed containers        |
| `/api/docker/create`          | POST   | Screen 1         | Create sandbox container       |
| `/api/docker/{id}/stop`       | POST   | Screen 1         | Stop running container         |
| `/api/docker/{id}`            | DELETE | Screen 1         | Remove container               |
| `/api/docker/{id}/logs`       | GET    | Screen 1         | Fetch container logs           |
| `/api/skills/search`          | GET    | Screen 2         | Search ClawHub skills          |
| `/api/skills/installed`       | GET    | Screen 2, 5      | List installed skills          |
| `/api/skills/install`         | POST   | Screen 4         | Install a skill                |
| `/api/skills/scan`            | POST   | Screen 3, 4      | VirusTotal scan                |
| `/api/skills/{name}`          | GET    | Screen 3         | Get skill details              |
| `/api/skills/{name}`          | DELETE | Screen 4, 5      | Uninstall a skill              |

### TypeScript Types (from backend/bindings/)

Docker types (from Plan 01):
- `ContainerInfo`
- `ContainerStatus`
- `DockerCreateRequest`
- `DockerCreateResponse`
- `DockerStatusResponse`
- `ContainerLogsResponse`

Skills types (to be created in Plan 02):
- `SkillMetadata`
- `SkillCategory`
- `SkillSearchResponse`
- `SkillInstallRequest`
- `SkillInstallResponse`
- `InstalledSkill`
- `ScanResult`
- `ScanRequest`
- `ThreatLevel`

---

## Component Inventory

### New Components to Create

**Docker Sandbox (Screen 1):**
1. `DockerSandboxStep` -- main wizard step container for Docker sandbox
2. `DockerCheckingSpinner` -- loading state during Docker check
3. `DockerNotAvailable` -- Docker missing info with install link
4. `DockerAvailable` -- Docker found, create sandbox form
5. `DockerCreating` -- creation progress with security checklist
6. `DockerRunning` -- running container info with actions
7. `ContainerManagementPanel` -- container list with actions
8. `ContainerRow` -- individual container in management panel
9. `ContainerLogViewer` -- expandable log display
10. `SecurityBadge` -- "Sandboxed" pill with lock icon and tooltip

**Skills Browser (Screens 2-5):**
11. `SkillsBrowser` -- main skills page container (tab management, search, filters)
12. `SearchBar` -- debounced search input with clear button
13. `CategoryFilters` -- horizontal pill/chip category filter row
14. `SkillCard` -- skill display card for browse grid
15. `SkillCardSkeleton` -- loading placeholder for skill card
16. `SkillDetail` -- slide-over panel with full skill info
17. `VirusTotalSection` -- VT scan results display (clean/suspicious/malicious/unconfigured)
18. `SkillInstallButton` -- context-aware install/uninstall/blocked button
19. `InstalledSkillsList` -- list view of installed skills
20. `InstalledSkillRow` -- individual installed skill row
21. `SkillCapabilities` -- capability list with icons
22. `ConfirmDialog` -- generic confirmation dialog (reusable)

### Reused from v1.0 / Phase 5

- `WizardStep`, `WizardNavigation`, `WizardProvider`
- `InputField`, `Button`, `Checkbox`
- `useWizard` hook
- `ErrorAlert`, `SuccessAlert`
- Dark mode color scheme and Tailwind v4 setup

### New Hooks to Create

23. `useDockerSandbox` -- manages Docker state, API calls, container lifecycle
24. `useSkills` -- manages skills search, install, uninstall, scan state

---

## Error States (All Screens)

### Docker Errors

| Error | Message | Action |
|-------|---------|--------|
| Docker not available | "Docker Desktop or Docker Engine is required" | Install link + Skip button |
| Container limit | "Container limit reached (5/5). Remove a container first." | Link to container management |
| Create failed | "Failed to create container: {error}" | Retry button |
| Stop failed | "Failed to stop container: {error}" | Retry button |
| Remove failed | "Failed to remove container: {error}" | Retry button |
| Logs unavailable | "Could not retrieve logs: {error}" | Retry button |

### Skills Errors

| Error | Message | Action |
|-------|---------|--------|
| Search failed | "Could not load skills. Check your internet connection." | Retry button |
| Skill not found | "Skill '{name}' not found on ClawHub" | Back to browser |
| Install failed | "Failed to install {name}: {error}" | Retry button |
| Uninstall failed | "Failed to remove {name}: {error}" | Retry button |
| VT rate limit | "VirusTotal rate limit reached. Wait 60 seconds." | Wait timer + Skip option |
| VT not configured | "Set VIRUSTOTAL_API_KEY to enable scanning" | Settings link |
| Malicious blocked | "BLOCKED: {N} scanners detected malware" | View Report link, no install |

---

## Accessibility

- All form inputs have associated labels and ARIA attributes
- Error messages linked to inputs via `aria-describedby`
- Container status badges have `aria-label` describing state
- VirusTotal section has `role="status"` with `aria-live="polite"` for scan results
- Skill cards are keyboard navigable (Tab to card, Enter to view details)
- Confirmation dialogs trap focus and support Escape to close
- Loading states have `aria-busy="true"` and screen reader announcements
- Color coding supplemented with icons (not color-only indicators)

---

## Mobile Responsiveness

- **Screen 1 (Docker):** Full-width cards and buttons, container rows stack vertically
- **Screen 2 (Skills Browser):** Single column grid on mobile, search bar full width, category pills horizontally scrollable
- **Screen 3 (Skill Detail):** Full-screen slide-over on mobile (instead of side panel)
- **Screen 4 (Install/Uninstall):** Full-width modals on mobile
- **Screen 5 (Installed):** Full-width list rows, path truncated aggressively
- **Breakpoint:** Tailwind `md` (768px) for desktop layout, below is mobile

---

This completes the UI screen specifications for Phase 6. A frontend engineer should now have everything needed to implement the Docker sandbox setup flow and Skills browser without additional context.

**Implementation Notes:**
- All Tailwind classes use v4 syntax (already configured in v1.0)
- Form validation uses react-hook-form + zod (already configured)
- TypeScript types imported from frontend/src/types/ (symlinked from backend/bindings/)
- Docker types are available now from Plan 01; Skills types will be available after Plan 02
- Docker sandbox is a wizard step; Skills browser is a dashboard page
- OpenAPI spec at `.planning/api-specs/phase-06-openapi.yaml` has full endpoint documentation
