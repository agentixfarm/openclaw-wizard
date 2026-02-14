# Phase 5: SSH & Remote Setup — UI Screen Specifications

## Overview
This document specifies all UI screens, components, flows, states, and data requirements for Phase 5 (SSH & Remote Setup). A frontend engineer with NO prior knowledge of this codebase should be able to implement the entire interface using only this document.

### Technology Context
- Framework: React 19 with TypeScript
- Styling: Tailwind CSS v4
- State: React Context (WizardProvider from v1.0)
- Forms: react-hook-form + zod
- API: REST endpoints + WebSocket for progress streaming
- Types: Auto-generated from Rust via ts-rs (in frontend/src/types/)

### Screen 1: Setup Mode Selection

**Purpose:** User chooses between local setup (v1.0) and remote VPS setup (Phase 5).

**Visual Design:**
- Two large option cards side-by-side (desktop) or stacked (mobile)
- Card 1: "Local Setup" — icon: desktop/laptop, description: "Install on this computer"
- Card 2: "Remote VPS Setup" — icon: server/cloud, description: "Install on a remote server via SSH"
- Active selection: sky-400 border, inactive: gray border
- Clicking card selects and enables Continue button

**Component Structure:**
```tsx
<WizardStep title="Choose Setup Mode" description="...">
  <div className="grid md:grid-cols-2 gap-4">
    <SetupModeCard
      mode="local"
      icon={<DesktopIcon />}
      title="Local Setup"
      description="Install OpenClaw on this computer"
      selected={mode === 'local'}
      onClick={() => setMode('local')}
    />
    <SetupModeCard
      mode="remote"
      icon={<ServerIcon />}
      title="Remote VPS Setup"
      description="Install on a remote server via SSH"
      selected={mode === 'remote'}
      onClick={() => setMode('remote')}
    />
  </div>
  <WizardNavigation
    onNext={() => {
      updateFormData('setupMode', { mode });
      nextStep();
    }}
    nextDisabled={!mode}
  />
</WizardStep>
```

**State:**
- Local state: `mode: 'local' | 'remote' | null`
- Wizard state: `formData.setupMode.mode`

**Flow:**
- If local selected: proceed to v1.0 SystemCheck flow
- If remote selected: proceed to Screen 2 (SSH Credentials)

---

### Screen 2: SSH Credentials Form

**Purpose:** User enters SSH connection details for remote VPS.

**Visual Design:**
- Form with 3 input fields, each with label, input, validation error, help text
- Field 1: VPS Hostname or IP (text input, placeholder: "example.com or 192.168.1.100")
- Field 2: SSH Username (text input, placeholder: "root or your username")
- Field 3: SSH Private Key Path (text input, placeholder: "~/.ssh/id_rsa or ~/.ssh/id_ed25519")
- Info callout (blue): "Your SSH key will be stored securely in your system keychain"
- "Test Connection" button (secondary) + "Continue" button (primary, disabled until test passes)

**Component Structure:**
```tsx
<WizardStep title="SSH Credentials" description="...">
  <form onSubmit={handleSubmit(onSubmit)}>
    <InputField
      label="VPS Hostname or IP"
      {...register('host')}
      error={errors.host}
      helpText="Domain name or IP address of your VPS"
    />
    <InputField
      label="SSH Username"
      {...register('username')}
      error={errors.username}
      helpText="SSH user with sudo privileges"
    />
    <InputField
      label="SSH Private Key Path"
      {...register('keyPath')}
      error={errors.keyPath}
      helpText="Absolute path to your private key file"
    />

    <InfoCallout>
      Your SSH key path will be stored securely in your system keychain.
      The private key file itself never leaves your machine.
    </InfoCallout>

    <div className="flex gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={handleTestConnection}
        loading={isTesting}
      >
        Test Connection
      </Button>
      <Button
        type="submit"
        variant="primary"
        disabled={!connectionTested || !isValid}
      >
        Continue
      </Button>
    </div>
  </form>

  {connectionStatus === 'success' && (
    <SuccessAlert>SSH connection successful!</SuccessAlert>
  )}
  {connectionStatus === 'error' && (
    <ErrorAlert>{connectionError}</ErrorAlert>
  )}
</WizardStep>
```

**Validation (Zod schema):**
```ts
const sshCredentialsSchema = z.object({
  host: z.string()
    .min(1, "Hostname is required")
    .regex(/^[a-zA-Z0-9.-]+$/, "Invalid hostname format"),
  username: z.string()
    .min(1, "Username is required")
    .regex(/^[a-z_][a-z0-9_-]*$/, "Invalid username format"),
  keyPath: z.string()
    .min(1, "SSH key path is required"),
});
```

**State:**
- Form state: react-hook-form with sshCredentialsSchema
- Local state: `isTesting: boolean`, `connectionTested: boolean`, `connectionStatus: 'idle' | 'testing' | 'success' | 'error'`, `connectionError: string | null`

**API Calls:**
- Test Connection: `POST /api/remote/test-connection` with SshConnectionRequest
- Response: SshConnectionResponse with success/error

**Flow:**
1. User fills form fields
2. User clicks "Test Connection"
3. Frontend calls POST /api/remote/test-connection
4. If success: show green success alert, enable Continue button
5. If error: show red error alert with specific message, disable Continue
6. User clicks Continue: save to wizard state, proceed to next step

**Error Messages (from backend):**
- "SSH connection refused — check hostname and firewall rules"
- "SSH key rejected — verify key path and permissions (chmod 600)"
- "Host key verification failed — unknown host"
- Network timeout: "Connection timeout — check VPS is online"

---

### Screen 3: Security Acknowledgement

**Purpose:** User acknowledges security risks of running OpenClaw (per SETUP-04).

**Visual Design:**
- Warning box (orange-700 border, amber background):
  - Icon: warning triangle
  - Title: "Security Notice"
  - Body: "OpenClaw grants AI agents full shell access to execute commands on your system. Only connect channels you trust and monitor logs regularly."
- Checkbox: "I understand the security implications"
- Continue button disabled until checkbox checked

**Component Structure:**
```tsx
<WizardStep title="Security Acknowledgement" description="...">
  <WarningBox>
    <WarningIcon className="text-orange-700" />
    <div>
      <h3 className="font-semibold">Security Notice</h3>
      <p>
        OpenClaw grants AI agents full shell access to execute commands on your system.
        Only connect channels you trust and monitor logs regularly.
      </p>
      <ul className="list-disc list-inside mt-2 space-y-1">
        <li>AI agents can read, write, and execute files</li>
        <li>Commands run with your user privileges</li>
        <li>Malicious prompts could harm your system</li>
      </ul>
    </div>
  </WarningBox>

  <Checkbox
    checked={acknowledged}
    onChange={(e) => setAcknowledged(e.target.checked)}
    label="I understand the security implications and accept the risks"
  />

  <WizardNavigation
    onNext={() => {
      updateFormData('securityAck', { acknowledged, timestamp: Date.now() });
      nextStep();
    }}
    nextDisabled={!acknowledged}
  />
</WizardStep>
```

**State:**
- Local state: `acknowledged: boolean`
- Wizard state: `formData.securityAck = { acknowledged: true, timestamp: number }`

**Flow:**
- User reads warning
- User checks checkbox
- Continue button enables
- Click Continue: save acknowledgement with timestamp, proceed

---

### Screen 4: Advanced Gateway Configuration

**Purpose:** User configures gateway bind mode, auth mode, and Tailscale (per SETUP-04).

**Visual Design:**
- Section 1: Gateway Bind Mode
  - Radio buttons: "Localhost only (127.0.0.1)" vs "All interfaces (0.0.0.0)"
  - Help text for each option
  - Default: localhost (safer)

- Section 2: Gateway Auth Mode
  - Radio buttons: "No authentication" vs "Basic authentication"
  - If basic auth selected: show username + password fields
  - Help text: "Basic auth protects gateway from unauthorized access"

- Section 3: Tailscale Configuration (Optional)
  - Checkbox: "Enable Tailscale"
  - If enabled: show Tailscale auth key input field
  - Help text: "Connect via Tailscale for secure remote access"

**Component Structure:**
```tsx
<WizardStep title="Advanced Configuration" description="...">
  <Section title="Gateway Bind Mode">
    <RadioGroup value={bindMode} onChange={setBindMode}>
      <Radio
        value="localhost"
        label="Localhost only (127.0.0.1)"
        helpText="Gateway only accessible from this machine (recommended)"
      />
      <Radio
        value="all"
        label="All interfaces (0.0.0.0)"
        helpText="Gateway accessible from network (less secure)"
      />
    </RadioGroup>
  </Section>

  <Section title="Gateway Authentication">
    <RadioGroup value={authMode} onChange={setAuthMode}>
      <Radio
        value="none"
        label="No authentication"
        helpText="Gateway has no access control (use only for testing)"
      />
      <Radio
        value="basic"
        label="Basic authentication"
        helpText="Protect gateway with username and password"
      />
    </RadioGroup>

    {authMode === 'basic' && (
      <div className="ml-6 mt-2 space-y-2">
        <InputField label="Username" {...register('authUsername')} />
        <InputField label="Password" type="password" {...register('authPassword')} />
      </div>
    )}
  </Section>

  <Section title="Tailscale (Optional)">
    <Checkbox
      checked={tailscaleEnabled}
      onChange={(e) => setTailscaleEnabled(e.target.checked)}
      label="Enable Tailscale for secure remote access"
    />

    {tailscaleEnabled && (
      <InputField
        label="Tailscale Auth Key"
        {...register('tailscaleAuthKey')}
        helpText="Get this from Tailscale admin console"
      />
    )}
  </Section>

  <WizardNavigation
    onNext={() => {
      updateFormData('advancedConfig', {
        bindMode,
        authMode,
        authUsername: authMode === 'basic' ? authUsername : undefined,
        authPassword: authMode === 'basic' ? authPassword : undefined,
        tailscaleEnabled,
        tailscaleAuthKey: tailscaleEnabled ? tailscaleAuthKey : undefined,
      });
      nextStep();
    }}
  />
</WizardStep>
```

**Validation:**
```ts
const advancedConfigSchema = z.object({
  bindMode: z.enum(['localhost', 'all']),
  authMode: z.enum(['none', 'basic']),
  authUsername: z.string().optional(),
  authPassword: z.string().optional(),
  tailscaleEnabled: z.boolean(),
  tailscaleAuthKey: z.string().optional(),
}).refine(
  (data) => {
    if (data.authMode === 'basic') {
      return data.authUsername && data.authPassword;
    }
    return true;
  },
  { message: "Username and password required for basic auth" }
);
```

**State:**
- Form state: react-hook-form with advancedConfigSchema
- Wizard state: `formData.advancedConfig`

**Flow:**
- User selects bind mode (default: localhost)
- User selects auth mode (default: none)
- If basic auth: user enters username/password
- User optionally enables Tailscale and enters auth key
- Click Continue: save to wizard state, proceed

---

### Screen 5: Remote Installation Progress

**Purpose:** Show real-time progress during remote OpenClaw installation.

**Visual Design:**
- Progress stages list with status icons:
  1. Connecting to remote server (spinner/checkmark/X)
  2. Checking Node.js installation (spinner/checkmark/X)
  3. Installing Node.js (if needed) (spinner/checkmark/X)
  4. Installing OpenClaw (spinner/checkmark/X)
  5. Writing configuration (spinner/checkmark/X)
  6. Installing daemon (spinner/checkmark/X)
  7. Starting OpenClaw (spinner/checkmark/X)

- Each stage shows:
  - Icon: spinner (in progress), green checkmark (complete), red X (failed)
  - Stage name
  - Status message (from RemoteSetupProgress)
  - Timestamp

- Console output panel (optional): scrollable log of command output

- If error: red error alert with message + "View Troubleshooting Guide" link

**Component Structure:**
```tsx
<WizardStep title="Installing OpenClaw" description="...">
  <ProgressStages>
    {stages.map((stage) => (
      <ProgressStage
        key={stage.id}
        icon={getStageIcon(stage.status)}
        title={stage.title}
        message={stage.message}
        timestamp={stage.timestamp}
        status={stage.status}
      />
    ))}
  </ProgressStages>

  {showConsole && (
    <ConsolePanel>
      {consoleOutput.map((line, i) => (
        <ConsoleLine key={i}>{line}</ConsoleLine>
      ))}
    </ConsolePanel>
  )}

  {error && (
    <ErrorAlert>
      <p>{error}</p>
      <Link to="/troubleshooting">View Troubleshooting Guide</Link>
    </ErrorAlert>
  )}

  {status === 'completed' && (
    <WizardNavigation onNext={nextStep} />
  )}
</WizardStep>
```

**State:**
- Local state: `stages: Array<{ id, title, status, message, timestamp }>`, `consoleOutput: string[]`, `error: string | null`, `status: 'in_progress' | 'completed' | 'failed'`
- WebSocket connection: useRemoteSetup hook

**API Calls:**
- WebSocket: `WS /ws/remote/install` with start message
- Receives: RemoteSetupProgress messages

**Flow:**
1. Component mounts: establish WebSocket connection
2. Send start message with SSH credentials (host, username) + wizard config
3. Receive progress messages: update stages with status/message/timestamp
4. If error message received: show error alert, set status: 'failed'
5. If completion message received: show success, enable Continue button
6. User clicks Continue: proceed to completion screen

---

## Data Flow Summary

**Wizard State Structure:**
```ts
interface WizardFormData {
  setupMode: {
    mode: 'local' | 'remote';
  };
  sshCredentials: {
    host: string;
    username: string;
    keyPath: string; // Not persisted to localStorage
  };
  securityAck: {
    acknowledged: boolean;
    timestamp: number;
  };
  advancedConfig: {
    bindMode: 'localhost' | 'all';
    authMode: 'none' | 'basic';
    authUsername?: string;
    authPassword?: string; // Not persisted to localStorage
    tailscaleEnabled: boolean;
    tailscaleAuthKey?: string; // Not persisted to localStorage
  };
  // ... v1.0 fields (providerConfig, gatewayConfig, etc.)
}
```

**API Integration:**
- POST /api/remote/test-connection: Test SSH connection before installation
- WS /ws/remote/install: Stream installation progress

**TypeScript Types (from backend/bindings/):**
- SshConnectionRequest
- SshConnectionResponse
- SshConnection
- RemoteSetupProgress
- WsMessage (from v1.0)

---

## Component Inventory

New components to create:
1. `SetupModeCard` — selectable card for setup mode
2. `SecurityAck` (step component) — security acknowledgement
3. `AdvancedConfig` (step component) — bind mode, auth mode, Tailscale
4. `RemoteSetupForm` (step component) — SSH credentials form
5. `RemoteInstallProgress` (step component) — installation progress display
6. `ProgressStages` — list of installation stages
7. `ProgressStage` — individual stage with icon/status/message
8. `ConsolePanel` — scrollable console output
9. `WarningBox` — warning callout component
10. `InfoCallout` — info callout component

Reused from v1.0:
- WizardStep, WizardNavigation, WizardProvider
- InputField, Checkbox, RadioGroup, Button
- useWizard hook, useWizardState hook

---

## Error States

**SSH Connection Errors:**
- "SSH connection refused" → Guide: "Check hostname and firewall rules"
- "SSH key rejected" → Guide: "Verify key path and run chmod 600 on key file"
- "Host key verification failed" → Guide: "Add host to known_hosts or verify fingerprint"
- Network timeout → Guide: "Check VPS is online and network connection"

**Installation Errors:**
- Node.js installation failed → Guide: "Check VPS has internet access and disk space"
- OpenClaw installation failed → Guide: "Check npm registry access and Node.js version"
- Daemon installation failed → Guide: "Check user has sudo privileges"

**Form Validation Errors:**
- Invalid hostname → "Use domain name or IP address (no http:// or path)"
- Invalid username → "Username must start with lowercase letter"
- Missing SSH key → "Provide path to private key file (~/.ssh/id_rsa)"

---

## Accessibility

- All form inputs have labels and ARIA attributes
- Error messages linked to inputs via aria-describedby
- Progress stages have aria-live regions for screen reader updates
- Keyboard navigation: Tab through form fields, Enter to submit
- Focus management: Focus first error field on validation failure

---

## Mobile Responsiveness

- Setup mode cards: stack vertically on mobile (<md breakpoint)
- Form inputs: full width on mobile
- Progress stages: compact view on mobile (icon + title only, tap to expand)
- Console panel: full width, max-height with scroll

---

This completes the UI screen specifications for Phase 5. A frontend engineer should now have everything needed to implement the remote setup flow without additional context.

**Implementation Notes:**
- All Tailwind classes use v4 syntax (already configured in v1.0)
- Form validation uses react-hook-form + zod (already configured)
- TypeScript types imported from frontend/src/types/ (symlinked from backend/bindings/)
- WebSocket connection pattern follows v1.0 install streaming (see frontend/src/hooks/useInstallWebSocket.ts for reference)
