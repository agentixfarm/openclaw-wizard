# Pitfalls Research

**Domain:** Setup Wizard/Installer GUI (wrapping complex CLI tools)
**Researched:** 2026-02-14
**Confidence:** MEDIUM-HIGH

## Critical Pitfalls

### Pitfall 1: Hardcoded Shell Commands with No Escape Sanitization

**What goes wrong:**
The installer executes shell commands constructed from user input (API keys, file paths, configuration values) without proper escaping or validation. Malicious input like `; rm -rf /` or backtick command substitution can execute arbitrary commands with the installer's permissions.

**Why it happens:**
Developers treat Tauri's shell API like a simple wrapper around Node.js `child_process.exec()` without understanding that user-controlled data in shell commands is a code injection vector. The convenience of string interpolation (`sh -c "command ${userInput}"`) obscures the security boundary.

**How to avoid:**
- Use Tauri's shell command scope configuration to allowlist ONLY the specific programs and exact argument patterns needed
- Never use shell string interpolation with user input
- Pass user data as separate arguments, not embedded in command strings
- Validate all user input against strict schemas before using in commands
- Use Tauri's Stronghold plugin for sensitive data like API keys
- Enable Tauri's isolation pattern to verify IPC inputs

**Warning signs:**
- Code patterns like `Command::new("sh").args(["-c", format!("echo {}", user_input)])`
- Shell commands built with template literals or string concatenation
- No input validation before shell execution
- API keys or paths directly interpolated into command strings

**Phase to address:**
Phase 1 (Security Foundation) - Set up shell command scopes and input validation architecture before any installer logic

---

### Pitfall 2: Assuming Upstream CLI Stability (OpenClaw's 9,833 Commits Problem)

**What goes wrong:**
The wizard hardcodes assumptions about OpenClaw's CLI flags, config format, directory structure, or installation steps. OpenClaw releases a breaking change, and the wizard starts failing for all users with cryptic errors because it's executing commands or reading configs that no longer exist.

**Why it happens:**
GUI wrappers treat the underlying CLI as a stable API without versioning or compatibility checks. With OpenClaw's very active development (9,833 commits), installation steps, config schema, or CLI behavior will change. The wizard doesn't detect version mismatches or adapt to changes.

**How to avoid:**
- Query OpenClaw's version at runtime and maintain a compatibility matrix
- Use OpenClaw's config schema directly (Zod schemas if exposed) rather than duplicating validation logic
- Monitor OpenClaw's GitHub releases via webhook or polling for breaking changes
- Design the wizard to fail gracefully with actionable error messages ("This wizard supports OpenClaw 1.x-2.x. You have 3.0. Please upgrade the wizard.")
- Consider embedding specific OpenClaw version or using version ranges
- Build automated tests that run against multiple OpenClaw versions
- Parse OpenClaw's help output or config schema at runtime to detect structure changes

**Warning signs:**
- No version compatibility checks in code
- Config file parsing logic duplicated from OpenClaw's source
- Hard-coded paths like `/usr/local/lib/openclaw`
- Integration tests only run against one OpenClaw version
- No CI job monitoring OpenClaw's release feed

**Phase to address:**
Phase 1 (Version Compatibility) - Establish version detection and compatibility framework from the start. Phase 2+ will extend the compatibility matrix as OpenClaw evolves.

---

### Pitfall 3: Cross-Platform Path Assumptions

**What goes wrong:**
The installer uses hardcoded file paths like `/usr/local/bin` or `C:\Program Files`, assumes Unix-style path separators (`/`), or doesn't handle spaces in paths. Installation fails on different OS configurations, particularly on Windows WSL2 where paths like `/mnt/c/` behave differently than native Linux filesystems.

**Why it happens:**
Developers test only on their own machine (macOS `/usr/local`, Linux `/home/user`, Windows `C:\Users\`) and assume those paths are universal. Cross-platform development requires understanding different filesystem conventions, permission models, and path resolution rules for each OS.

**How to avoid:**
- Never hardcode absolute paths - always detect OS-specific defaults at runtime
- Use platform-independent path construction (Rust's `std::path::PathBuf`, JavaScript's `path.join()`)
- Double-quote all paths in shell commands to handle spaces
- For WSL2: detect if running in WSL vs native Linux, avoid working in `/mnt/c/` (20x slower), guide users to keep projects in Linux filesystem
- Test on all target platforms (macOS, Linux, Windows WSL2) with CI/CD matrix
- Document assumptions about user's filesystem (e.g., "requires writable home directory")

**Warning signs:**
- String concatenation for path building (`"/usr/local/bin/" + filename`)
- No quotes around paths in shell commands
- Paths not tested with spaces or special characters
- No OS detection logic (`process.platform`, `std::env::consts::OS`)
- Integration tests only run on developer's OS

**Phase to address:**
Phase 1 (Cross-Platform Foundation) - Establish path handling utilities and OS detection. Test on all platforms from the beginning.

---

### Pitfall 4: Unrecoverable Failed Installation State

**What goes wrong:**
Installation fails halfway through (network timeout, permission denied, disk full). The system is left in a broken state: some files installed, some config written, some services registered. Re-running the installer fails because "OpenClaw is already installed" but it's not actually working. Users have no way to clean up and retry.

**Why it happens:**
Installers implement "happy path" logic without rollback/cleanup on failure. Each step modifies system state (files, config, launchd/systemd services) but doesn't track what succeeded. When one step fails, there's no automated way to undo previous steps.

**How to avoid:**
- Implement transactional installation: track each operation in a manifest/log file
- On failure, run cleanup routine that undoes completed steps in reverse order
- Provide explicit "uninstall/reset" command to clean up broken states
- Validate preconditions before starting (disk space, permissions, network connectivity)
- Use atomic operations where possible (write to temp file, then move)
- Test failure scenarios: kill installer mid-process, simulate network failures, fill disk
- Show clear recovery instructions in error messages

**Warning signs:**
- No error handling around file operations, shell commands, or network requests
- No tracking of which installation steps completed
- No "uninstall" or "clean" functionality
- User feedback: "stuck in half-installed state", "can't reinstall"

**Phase to address:**
Phase 2 (Robust Installation) - After basic installation works, add rollback/recovery logic before users encounter broken states.

---

### Pitfall 5: npm Global Install Permission Battles

**What goes wrong:**
The wizard runs `npm install -g openclaw` which fails with EACCES permission errors on `/usr/local/lib/node_modules`. Users resort to `sudo npm install`, which succeeds but creates root-owned files that break future updates and introduces security risks (malicious packages run as root).

**Why it happens:**
npm's default global install location requires root permissions. Developers don't understand the security implications of sudo npm or the existence of safer alternatives (nvm, user-scoped globals).

**How to avoid:**
- Detect if user has nvm installed and use it (automatically manages permissions correctly)
- If no nvm: guide user to install it, or configure npm to use user directory (`npm config set prefix ~/.npm-global`)
- NEVER suggest `sudo npm install` in error messages or documentation
- Pre-flight check: test write permissions to global npm directory before attempting install
- Consider local installation instead of global (install to user's home directory)
- Provide clear, actionable error messages with permission fix steps

**Warning signs:**
- Error messages suggesting "try sudo"
- Installation instructions mentioning sudo/root
- No npm permission checks before installation
- Installation fails on fresh macOS/Linux with default npm setup

**Phase to address:**
Phase 2 (Installation Prerequisites) - Before installing OpenClaw, set up proper npm configuration.

---

### Pitfall 6: Async Shell Command UI Freezes

**What goes wrong:**
The wizard runs long-running shell commands (npm install, downloading dependencies) synchronously. The UI freezes with no progress indication. Users think the app has crashed and force-quit, interrupting the installation.

**Why it happens:**
Developers call synchronous shell APIs or await promises without streaming output. There's no progress indicator because the command doesn't report progress until completion.

**How to avoid:**
- Use async shell command execution with stdout/stderr streaming
- Implement proper progress indicators (spinners for indeterminate, progress bars with percentage when parseable)
- Parse command output to estimate progress (e.g., npm shows download percentages)
- Show realtime log output in a collapsible panel so advanced users can debug
- Set realistic timeout values and show elapsed time
- Test on slow networks and machines to verify UX doesn't feel frozen
- Add "This may take several minutes" messaging for long operations

**Warning signs:**
- UI thread blocked during shell commands
- No visual feedback during long operations
- Timeout errors from users with slow networks
- User reports of "frozen" or "crashed" app during installation

**Phase to address:**
Phase 2 (Installation UX) - Add progress indicators when implementing core installation logic.

---

### Pitfall 7: Config Schema Drift (JSON5/Zod Sync)

**What goes wrong:**
The wizard validates OpenClaw's config using its own schema validation logic. OpenClaw updates its config format (new required fields, deprecated options, different types). The wizard either rejects valid configs or generates invalid configs that OpenClaw rejects with cryptic errors.

**Why it happens:**
The wizard duplicates OpenClaw's config validation logic instead of reusing it or treating OpenClaw as the source of truth. When OpenClaw's Zod schemas change, the wizard doesn't know about it.

**How to avoid:**
- If OpenClaw exposes its Zod schemas: import and use them directly (requires TypeScript integration)
- If not: parse OpenClaw's JSON5 schema or help output to validate dynamically
- Minimal validation in wizard: check only what's strictly necessary for installation
- Let OpenClaw validate final config - just catch its errors and surface them clearly
- Monitor OpenClaw's config schema changes in CI (diff schema between versions)
- Version the wizard's understanding of config: "supports OpenClaw config v1-v3"

**Warning signs:**
- Duplicated validation logic between wizard and OpenClaw
- Config validation fails but OpenClaw accepts the config (or vice versa)
- No tests comparing wizard's validation to OpenClaw's actual behavior
- Hard-coded config field lists that don't match OpenClaw's current version

**Phase to address:**
Phase 3 (Configuration Management) - When building config editing features, establish schema sync strategy.

---

### Pitfall 8: System Service Registration Without Cleanup

**What goes wrong:**
The wizard registers OpenClaw as a launchd (macOS) or systemd (Linux) service but doesn't provide uninstall/disable functionality. Orphaned services continue trying to start on boot, creating confusion when users uninstall OpenClaw manually.

**Why it happens:**
Developers focus on "getting it working" (registration) without thinking about the full lifecycle (unregistration, updates, conflicts with existing services).

**How to avoid:**
- Implement matching uninstall/disable for every system modification
- Check for existing service registrations before installing (prevent duplicates)
- Provide UI to enable/disable autostart without uninstalling
- Document service registration locations (~/Library/LaunchAgents, /etc/systemd/system)
- Test uninstall/reinstall scenarios, not just clean installations
- Consider using service names with version/hash to prevent conflicts

**Warning signs:**
- No uninstall functionality
- No handling of "service already exists" errors
- User reports of "OpenClaw won't stop" or "starts unexpectedly"
- Multiple service definitions for same app

**Phase to address:**
Phase 4 (Service Management) - When adding autostart features, build disable/uninstall alongside enable/install.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Embedding specific OpenClaw version | No version detection needed, guaranteed compatibility | Breaks when users want newer OpenClaw, requires wizard updates for every OpenClaw release | Early alpha only - must be removed before beta |
| Sudo/root installation | Bypasses permission errors | Security risk, breaks updates, leaves root-owned files | Never - always use nvm or user-scoped npm |
| Skipping rollback on errors | Faster initial implementation | Users stuck in broken states, support burden | Prototype only - critical for production |
| Hard-coded config templates | No need to parse OpenClaw's schema | Breaks when config format changes, generates invalid configs | MVP if versioned properly and validated against OpenClaw |
| Synchronous shell commands | Simpler code structure | Frozen UI, bad UX, appears crashed | Internal tools only - never user-facing |
| Single-platform testing | Faster iteration on main dev platform | Breaks on other platforms, poor cross-platform UX | Early development - must test all platforms before beta |
| Generic error messages | Don't need error type detection | Users can't fix problems, support burden | Never - specific errors save hours of debugging |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Tauri shell commands | Using string interpolation: `format!("echo {}", input)` | Use command scope allowlist + separate args: `Command::new("echo").args([input])` |
| npm global install | Suggesting `sudo npm install -g` | Detect/install nvm, or configure user-scoped npm prefix |
| OpenClaw CLI | Assuming CLI flags are stable | Version detection + compatibility matrix + runtime help parsing |
| WSL2 filesystem | Working in `/mnt/c/` Windows paths | Detect WSL, guide users to Linux filesystem (~20x faster) |
| launchd/systemd | Registering service without checking existing | Check for existing, provide enable/disable/uninstall |
| JSON5 config | Validating with duplicated schema logic | Import OpenClaw's Zod schemas or minimal validation + let OpenClaw validate |
| API key storage | Storing in plain text config files | Use Tauri Stronghold plugin for encrypted storage |
| Node.js version | Assuming user's Node.js works with OpenClaw | Check Node.js version requirements, suggest nvm if incompatible |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| WSL2 `/mnt/c/` operations | npm install takes 10x longer, file watchers miss changes | Detect WSL, keep projects in Linux filesystem, warn users | Immediately on WSL2 with Windows paths |
| Synchronous shell commands blocking UI | UI freezes during installation, appears crashed | Async execution + progress indicators | Any operation >1 second |
| Re-parsing config on every validation | Config editor feels sluggish | Cache parsed config, validate only changed fields | Config files >100KB or complex Zod schemas |
| No stdout buffering from long commands | UI updates flood, consume memory | Buffer/throttle output updates, show summary + expandable details | Commands with >10K lines of output |
| Downloading without progress | Users force-quit during long downloads | Stream download progress, show MB/total, time remaining | Downloads >10MB on slow connections |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Shell command injection via user input | Remote code execution with wizard's permissions | Use Tauri shell scope, never interpolate user data in commands |
| Running npm with sudo | Malicious packages execute as root, compromise system | Detect/use nvm or user-scoped npm, never suggest sudo |
| Storing API keys in plain text | Keys exposed in backups, git repos, logs | Use Tauri Stronghold or OS keychain APIs |
| No Content Security Policy | XSS in web UI could escape to shell commands | Enable Tauri CSP, restrict IPC to validated inputs |
| Downloading dependencies over HTTP | Man-in-the-middle attacks, code injection | Always use HTTPS, verify checksums if available |
| Overly broad shell command scope | Tauri shell allowlist includes wildcards or dangerous tools | Minimal scope - exact programs and argument patterns only |
| Node.js fuses enabled (runAsNode) | Allows CLI arguments to execute arbitrary code | Verify Electron/Tauri security fuses are properly configured |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication during long operations | Users think app crashed, force-quit mid-install | Spinners, progress bars, elapsed time, output streaming |
| Generic errors: "Installation failed" | Users can't self-resolve, flood support | Specific errors with recovery steps: "Node.js not found. Install from nodejs.org or run: brew install node" |
| Assuming users understand technical concepts | Confusion about "npm global prefix", "launchd", "WSL2" | Plain language + progressive disclosure: "Install for all users (requires password)" |
| No validation until final step | Users complete 10-minute wizard then discover error | Validate each field on blur, pre-flight checks before installation |
| Can't go back after starting installation | Users notice wrong config mid-install, have to start over | Allow pause/cancel with rollback, or pre-installation review screen |
| No copy-paste from error messages | Users manually transcribe errors for support | Make errors selectable text, provide "Copy diagnostic info" button |
| Wizard flow doesn't match mental model | Users confused about what's happening when | Overview screen at start, clear step labels, "why this step?" help text |

## "Looks Done But Isn't" Checklist

- [ ] **Installation success screen:** Often missing rollback on post-install failures - verify service actually started, config is valid, OpenClaw responds to health check
- [ ] **Permission handling:** Often missing pre-flight checks - verify write permissions before attempting operations, not after failures
- [ ] **Cross-platform support:** Often tested on one OS only - verify on fresh macOS, Linux, and Windows WSL2 VMs before release
- [ ] **Error recovery:** Often missing uninstall/cleanup - verify users can recover from failed installations, not stuck in broken state
- [ ] **Async operations:** Often missing timeout/cancellation - verify long operations can be cancelled and won't leak processes
- [ ] **Version compatibility:** Often assumes current OpenClaw version - verify against minimum, current, and next OpenClaw versions
- [ ] **User environment variations:** Often assumes clean environment - test with existing OpenClaw installs, multiple Node.js versions, conflicting services
- [ ] **Offline scenarios:** Often assumes internet connectivity - verify graceful degradation or clear "requires internet" messaging
- [ ] **Accessibility:** Often keyboard navigation broken - verify full wizard flow works with keyboard only, screen reader compatible
- [ ] **Logging for debugging:** Often no diagnostic output - verify logs are saved for troubleshooting failed installations

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Shell command injection vulnerability | HIGH | 1. Patch with proper input validation, 2. Notify users of security update, 3. Audit logs for exploitation, 4. Consider code signing to verify updates |
| Upstream CLI breaking changes | MEDIUM | 1. Add version compatibility check, 2. Release hotfix wizard version, 3. Add CI monitoring of OpenClaw releases, 4. Document supported version range |
| Hardcoded paths causing failures | LOW | 1. Replace with OS-specific path detection, 2. Test on affected platforms, 3. Release patch update |
| Unrecoverable installation state | MEDIUM | 1. Build manual cleanup script, 2. Add to troubleshooting docs, 3. Implement proper rollback in next version |
| npm permission errors | LOW | 1. Update docs with nvm instructions, 2. Add pre-flight npm permission check, 3. Provide automated npm config fix |
| Config schema drift | MEDIUM | 1. Fallback to minimal validation, 2. Let OpenClaw validate final config, 3. Surface OpenClaw's error messages, 4. Import actual Zod schemas in next version |
| Frozen UI during install | LOW | 1. Add async execution, 2. Implement progress indicators, 3. Release UX improvement update |
| Orphaned system services | MEDIUM | 1. Document manual service removal, 2. Build cleanup tool, 3. Add proper uninstall in next version |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Shell command injection | Phase 1 (Security Foundation) | Security audit, penetration testing, Tauri scope config review |
| Upstream CLI breaking changes | Phase 1 (Version Detection) | CI tests against multiple OpenClaw versions, compatibility matrix |
| Cross-platform path issues | Phase 1 (Cross-Platform Foundation) | CI matrix testing on macOS, Linux, WSL2 |
| Unrecoverable failed installation | Phase 2 (Robust Installation) | Chaos testing (kill mid-install, fill disk, deny permissions), verify cleanup works |
| npm permission errors | Phase 2 (Installation Prerequisites) | Test on fresh OS installs without nvm, verify user-scoped npm setup |
| Async shell command UI freezes | Phase 2 (Installation UX) | UX testing on slow machines/networks, verify progress indicators work |
| Config schema drift | Phase 3 (Configuration Management) | Integration tests with OpenClaw's actual validation, schema diff monitoring |
| System service registration without cleanup | Phase 4 (Service Management) | Install/uninstall/reinstall testing, verify no orphaned services |

## Sources

**Setup Wizard & Installer Best Practices:**
- [Creating a setup wizard (and when you shouldn't) - LogRocket Blog](https://blog.logrocket.com/ux-design/creating-setup-wizard-when-you-shouldnt/)
- [Setup Wizard: Benefits, Best Practices, and Implementation - Tumgazeteler](https://tumgazeteler.com/the-comprehensive-guide-to-setup-wizard/)

**GUI Wrappers for CLI Tools:**
- [Command Line Interface Guidelines](https://clig.dev/)
- [UX patterns for CLI tools](https://lucasfcosta.com/2022/06/01/ux-patterns-cli-tools.html)
- [GitHub - matyalatte/tuw: Tiny GUI wrapper for command-line tools](https://github.com/matyalatte/tuw)

**Electron/Tauri Security:**
- [Security | Electron](https://www.electronjs.org/docs/latest/tutorial/security)
- [Security | Tauri](https://v2.tauri.app/security/)
- [Isolation Pattern | Tauri](https://v2.tauri.app/concept/inter-process-communication/isolation/)
- [Stronghold | Tauri](https://v2.tauri.app/plugin/stronghold/)
- [Hacking Electron Apps: Security Risks And How To Protect Your Application | Redfox Security](https://redfoxsecurity.medium.com/hacking-electron-apps-security-risks-and-how-to-protect-your-application-9846518aa0c0)
- [Electron APIs Misuse: An Attacker's First Choice | Doyensec](https://blog.doyensec.com/2021/02/16/electron-apis-misuse.html)

**Cross-Platform Compatibility:**
- [What are the most common cross-platform compatibility mistakes to avoid? - LinkedIn](https://www.linkedin.com/advice/1/what-most-common-cross-platform-compatibility)

**Upstream Maintenance:**
- [Staying Close to Upstream Projects :: Fedora Docs](https://docs.fedoraproject.org/en-US/package-maintainers/Staying_Close_to_Upstream_Projects/)
- [Platform engineering maintenance pitfalls and smart strategies to stay ahead | CNCF](https://www.cncf.io/blog/2026/01/21/platform-engineering-maintenance-pitfalls-and-smart-strategies-to-stay-ahead/)

**Node.js & npm Permissions:**
- [Resolving EACCES permissions errors when installing packages globally | npm Docs](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally/)
- [Running Your Node.js App With Systemd - Part 1](https://nodesource.com/blog/running-your-node-js-app-with-systemd-part-1)
- [Permissions | Node.js Documentation](https://nodejs.org/api/permissions.html)

**React to Tauri Migration:**
- [State Management | Tauri](https://v2.tauri.app/develop/state-management/)
- [Recommended architecture? (migrating from Next.js) | tauri-apps/tauri Discussion](https://github.com/tauri-apps/tauri/discussions/11389)

**Dependency Management:**
- [Should you Pin your JavaScript Dependencies? - Renovate Docs](https://docs.renovatebot.com/dependency-pinning/)
- [How should you pin dependencies and why? (The Guild)](https://the-guild.dev/blog/how-should-you-pin-dependencies-and-why)

**WSL2:**
- [How to Run Linux Software on Windows in 2026 (WSL2 and VMs, the Practical Way) – TheLinuxCode](https://thelinuxcode.com/how-to-run-linux-software-on-windows-in-2026-wsl2-and-vms-the-practical-way/)
- [Comparing WSL Versions | Microsoft Learn](https://learn.microsoft.com/en-us/windows/wsl/compare-versions)

**Progress Indicators & UX:**
- [CLI UX best practices: 3 patterns for improving progress displays | Evil Martians](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays)
- [Progress Trackers and Indicators – With 6 Examples To Do It Right](https://userguiding.com/blog/progress-trackers-and-indicators)

**Config Validation:**
- [Schema Validation | App Config](https://app-config.dev/guide/intro/schema-validation.html)
- [Schema Validation for JSON5 | JSON Schema Everywhere](https://json-schema-everywhere.github.io/json5)

**Installation Rollback:**
- [Rollback Installation - Win32 apps | Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/msi/rollback-installation)
- [InstallBuilder User Guide 25](https://releases.installbuilder.com/installbuilder/docs/installbuilder-userguide/_rollback.html)

---
*Pitfalls research for: OpenClaw Wizard - GUI setup wizard for OpenClaw CLI*
*Researched: 2026-02-14*
