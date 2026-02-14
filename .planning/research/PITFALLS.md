# Pitfalls Research

**Domain:** Control Center Capabilities - SSH Remote Management, Docker Sandboxing, Skills Management, AI-Powered Auditing
**Researched:** 2026-02-14
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: SSH Credential Storage in Browser Process Memory

**What goes wrong:**
SSH private keys, passphrases, or credentials stored in React state, localStorage, or passed through Tauri IPC become accessible to XSS attacks or memory dumps. Worse, credentials stored in plain text config files or browser storage persist beyond the session, creating a permanent attack surface. When users connect to production servers, compromised credentials grant attackers direct server access.

**Why it happens:**
Developers treat SSH credentials like API keys without understanding the elevated risk. SSH keys grant shell access to servers running business-critical infrastructure. The convenience of localStorage.setItem() or useState() obscures the security boundary. russh library requires keys as byte arrays, tempting developers to load them into memory without proper protection.

**How to avoid:**
- Use macOS Keychain (keyring crate) or platform-specific secure enclaves for private key storage
- Never store SSH credentials in React state, localStorage, sessionStorage, or Tauri store
- Load keys from secure storage only when needed, zero them after use
- Use SSH agent forwarding when possible instead of storing keys in app
- For passphrase-protected keys: prompt for passphrase on each use, never cache
- Consider ephemeral SSH keys (short-lived, auto-expiring) for web app use case
- Enable Tauri's isolation pattern to encrypt IPC messages containing credentials
- Audit: grep codebase for `localStorage`, `useState.*password`, `useState.*key` patterns

**Warning signs:**
- SSH credentials in JSON config files or Tauri store plugin
- Private key files copied into app's data directory
- Passwords/passphrases in component state or Redux store
- No use of keyring/keychain integration
- Credentials logged to console or error messages

**Phase to address:**
Phase 1 (SSH Security Foundation) - Establish secure credential handling architecture before implementing any SSH functionality. This is non-negotiable.

---

### Pitfall 2: Unauthenticated Memory Allocation DoS in russh (CVE-2024-43410)

**What goes wrong:**
Using russh versions before 0.44.1 exposes the application to denial-of-service attacks where any unauthenticated remote user can cause the server to allocate arbitrary amounts of memory by setting untrusted packet lengths. This crashes the app and makes remote management unavailable precisely when users need it during incidents.

**Why it happens:**
russh allocates memory for incoming packet byte streams as a performance optimization, trusting the client-provided length field before authentication. Developers add russh to Cargo.toml without checking CVE databases or using cargo-audit.

**How to avoid:**
- Require russh >= 0.44.1 (fixed version) in Cargo.toml with exact version pinning
- Run cargo-audit in CI/CD pipeline to catch known vulnerabilities
- Subscribe to RustSec Advisory Database notifications
- Implement connection rate limiting at application level (max N connections per IP)
- Set resource limits (ulimit, cgroups) for the Rust backend process
- Monitor memory usage and implement circuit breakers

**Warning signs:**
- russh version in Cargo.toml < 0.44.1
- No cargo-audit in CI pipeline
- No rate limiting on SSH connection attempts
- Application crashes under connection spam

**Phase to address:**
Phase 1 (SSH Dependencies) - Before writing any SSH code, ensure dependencies are secure and monitoring is in place.

---

### Pitfall 3: Docker Socket Mounting = Root on Host

**What goes wrong:**
Mounting `/var/run/docker.sock` into a container (even one spawned by the wizard for "sandboxing") gives that container unrestricted root access to the host. An attacker who compromises the containerized skill can escape by creating a new privileged container that mounts the host's entire filesystem. The "sandbox" becomes an escalation vector.

**Why it happens:**
Docker-in-Docker tutorials show mounting the socket as the "simple way" to manage containers from within containers. Developers don't realize this grants host-level Docker API access, equivalent to unrestricted root. Skills that need Docker access seem to "require" socket access.

**How to avoid:**
- NEVER mount /var/run/docker.sock into containers
- Use Docker's rootless mode for daemon (requires Docker 20.10+)
- For container management from wizard: call Docker API from Rust backend, not from containers
- For skills that need Docker: use gVisor or Kata Containers for VM-level isolation
- Implement Docker API access controls: read-only endpoints, volume mount restrictions
- Use --security-opt=no-new-privileges flag on all containers
- Audit skills for socket mount requests, reject them

**Warning signs:**
- Dockerfile or docker run commands with `-v /var/run/docker.sock:/var/run/docker.sock`
- Skills requesting access to Docker API
- Privilege escalation in security testing (container can read /etc/shadow)
- No use of rootless Docker or alternative runtimes

**Phase to address:**
Phase 2 (Docker Security Architecture) - Design container execution model before implementing skills. Socket mounting must be architecturally prohibited.

---

### Pitfall 4: Skill Dependency Hell and Supply Chain Attacks

**What goes wrong:**
Skills are essentially plugins with arbitrary code execution. A malicious skill or a compromised dependency in a legitimate skill can steal SSH credentials, exfiltrate config files containing API keys, or mine cryptocurrency. When skills specify conflicting dependency versions (skill A needs libfoo 1.x, skill B needs libfoo 2.x), the system breaks unpredictably.

**Why it happens:**
Plugin systems prioritize developer experience (easy installation, rich capabilities) over security. Skills run in the same process/container as trusted code, sharing memory and filesystem access. Package managers (npm, pip, cargo) don't sandbox dependencies. Developers treat skills like libraries without understanding they're untrusted executables.

**How to avoid:**
- Implement WASM-based skill system with capability-based security (use wasmtime)
- Skills declare required capabilities (network access, file read/write, Docker API) - default deny all
- Run each skill in isolated WASI sandbox with explicit resource limits
- Use wasm-sandbox crate for resource limits (memory, execution time, syscalls)
- Verify skill signatures/checksums before loading (prevent supply chain attacks)
- Implement skill approval workflow - don't auto-install from registries
- Pin dependency versions in skill manifests, use lock files
- Scan skill dependencies with cargo-audit/npm-audit before installation
- Monitor skill behavior: log all capability usage, detect anomalies

**Warning signs:**
- Skills running as native code (not WASM)
- No capability system or permission model for skills
- Skills can access parent process memory or filesystem freely
- No dependency scanning or signature verification
- Skills auto-update without approval

**Phase to address:**
Phase 3 (Skills Sandbox Architecture) - Design sandboxing before building skill management. Retrofitting security is nearly impossible.

---

### Pitfall 5: Unbounded Channel Memory Leaks in Log Streaming

**What goes wrong:**
Using tokio::sync::mpsc::unbounded_channel() for log streaming creates memory leaks when producers (SSH sessions, Docker containers) output logs faster than consumers (WebSocket to browser) can process them. Memory usage grows until OOM kills the process. Even after backpressure resolves, tokio's unbounded channels don't free the allocated memory (known issue #4321).

**Why it happens:**
Developers choose unbounded channels for simplicity - no await on send(), no backpressure handling. Docker containers or remote commands can output megabytes of logs in seconds (compilation output, verbose error messages). WebSocket transmission to browser is slower than local process output, creating producer/consumer mismatch.

**How to avoid:**
- Use bounded channels (tokio::sync::mpsc::channel) with appropriate capacity (e.g., 1000 messages)
- Implement backpressure: when channel full, drop oldest messages or pause producer
- Apply rate limiting on log output (max N lines/second per source)
- Implement log rotation: buffer last N lines in memory, persist overflow to disk
- Add circuit breaker: disconnect log stream if buffer exceeds threshold
- Use ring buffer (ringbuf crate) for fixed-size log windows
- Monitor channel depth, alert on sustained high usage

**Warning signs:**
- tokio::sync::mpsc::unbounded_channel() in log streaming code
- Memory usage grows continuously during long-running operations
- OOM kills during heavy log output (npm install, Docker builds)
- No rate limiting or backpressure handling

**Phase to address:**
Phase 4 (Log Streaming Foundation) - Design buffering/backpressure strategy before implementing log streaming UI.

---

### Pitfall 6: ANSI Escape Sequence Injection in Log Output

**What goes wrong:**
Remote commands or Docker containers output ANSI escape sequences that execute arbitrary terminal commands when displayed in the wizard's log viewer. Malicious skills can include sequences like OSC52 (clipboard injection) to steal data or OSC8 (hyperlinks) to phish users. Output like `\x1b]8;;http://evil.com\x1b\\click here\x1b]8;;\x1b\\` creates clickable links to attacker sites.

**Why it happens:**
Terminal emulators interpret ANSI escape sequences for colors, cursor movement, hyperlinks. Developers render log output as-is to preserve colors without sanitizing control sequences. Skills or compromised dependencies can emit malicious sequences.

**How to avoid:**
- Strip or escape ANSI sequences before rendering in browser (use ansi_term or strip-ansi-escapes crate)
- Allowlist safe sequences (colors, basic formatting), block control sequences (OSC, CSI)
- Never render raw terminal output in innerHTML - use textContent or sanitization library
- Log raw output to disk for debugging, display sanitized version in UI
- Test with malicious input: `cat` files containing escape sequences
- Use terminal emulator libraries that sandbox escape sequence handling

**Warning signs:**
- Log output rendered with dangerouslySetInnerHTML or innerHTML
- No ANSI sanitization in log processing pipeline
- Terminal output passed directly from SSH/Docker to WebSocket
- No testing with malicious escape sequences

**Phase to address:**
Phase 4 (Log Sanitization) - Implement ANSI sanitization before building log streaming UI. Logs are untrusted input.

---

### Pitfall 7: AI Auditing Sends Production Secrets to OpenAI

**What goes wrong:**
Config auditing feature sends entire config files (containing API keys, database passwords, SSH host addresses) to OpenAI API for analysis. These secrets are now in OpenAI's logs/training data. Even with GPT's "not used for training" promise, logs persist for 30 days, creating compliance violations (GDPR, SOC2). Worse, hallucinated audit recommendations contradict actual security requirements or suggest insecure configurations.

**Why it happens:**
Developers treat AI as a black box utility without understanding data privacy implications. It's easy to JSON.stringify(config) and send to GPT. Users enable "AI-powered auditing" expecting magic without understanding their secrets leave their infrastructure.

**How to avoid:**
- Redact secrets before sending to AI (replace API keys, passwords with placeholders)
- Use local LLM (llama.cpp, ollama) for sensitive config analysis - never leave user's machine
- If using OpenAI: explicit user consent with clear warning "config will be sent to external AI service"
- Implement allowlist: only send non-sensitive config fields to AI
- For hallucination prevention: use GPT-5 (45% fewer errors) or o3 with chain-of-thought prompting
- Validate AI recommendations against known-good config schema before showing to user
- Show confidence scores, mark uncertain recommendations clearly
- Implement RAG: provide official OpenClaw docs as context to reduce hallucinations
- Set token budgets (max_completion_tokens) to control costs

**Warning signs:**
- Config sent to AI without secret redaction
- No user consent for external AI API usage
- AI recommendations applied automatically without validation
- No cost controls (token limits, budget alerts)
- Hallucinated recommendations not marked as uncertain

**Phase to address:**
Phase 5 (AI Privacy Foundation) - Design data privacy architecture before implementing AI features. Retrofitting redaction is error-prone.

---

### Pitfall 8: Multi-Server Partial Deployment Failures Without Rollback

**What goes wrong:**
Deploying a skill to 5 servers succeeds on 3, fails on 2 (network timeout, permission error). System state is now inconsistent - some servers run new skill version, others run old. Users don't know which servers are updated. Manually reconciling state is error-prone. Re-running deployment might duplicate resources or conflict with partial state.

**Why it happens:**
Multi-server orchestration is hard. Developers implement optimistic "deploy to all" without tracking which succeeded. No transactional model for distributed operations. Error handling is "log and continue" without state tracking or rollback.

**How to avoid:**
- Implement saga pattern with compensating transactions for rollback
- Track deployment state per server (pending/in_progress/success/failed/rolled_back)
- On partial failure: offer user options (rollback all, retry failed, keep partial)
- Make deployment operations idempotent (can safely retry without side effects)
- Use 2-phase commit: prepare phase (validate, download) then commit phase (activate)
- Log deployment manifest with server states for debugging
- Test network partition scenarios, timeout handling
- Implement health checks post-deployment to verify success

**Warning signs:**
- No deployment state tracking per server
- No rollback mechanism for partial failures
- Deployment marked "success" if any server succeeds
- Operations not idempotent (retry causes duplicates or errors)
- No testing of network failure scenarios

**Phase to address:**
Phase 6 (Multi-Server Orchestration) - Design state tracking and rollback before implementing remote deployment.

---

### Pitfall 9: SSH Session Reconnection Creates Duplicate Operations

**What goes wrong:**
Network hiccup disconnects SSH session mid-operation (copying files, installing package). App auto-reconnects and retries the operation. Now there are two concurrent installs, causing package manager lock conflicts or duplicate resource creation. Users see "already exists" errors or corrupted state.

**Why it happens:**
Developers implement naive retry logic: on disconnect, re-run the command. SSH commands aren't automatically idempotent. Network failures are transient, so connection is often re-established quickly, leading to overlapping operations.

**How to avoid:**
- Design all remote operations to be idempotent (safe to retry)
- Use unique operation IDs, check if operation already succeeded before retry
- For long operations: use persistent SSH session managers (screen, tmux on remote)
- Implement at-most-once semantics: track completed operations, don't retry
- Exponential backoff on retries, max retry limit
- SSH KeepAlive configuration to detect disconnects faster
- For file operations: use atomic operations (write to temp, then move)
- Test network instability: random disconnects during operations

**Warning signs:**
- Naive retry on SSH disconnect without idempotency checks
- Operations fail with "already exists" or lock errors
- No operation tracking or deduplication
- No use of persistent session managers for long operations

**Phase to address:**
Phase 2 (SSH Reliability) - Implement reconnection and retry logic with idempotency guarantees.

---

### Pitfall 10: Docker Container Resource Exhaustion Crashes Host

**What goes wrong:**
Skills running in Docker containers have no resource limits. Malicious or buggy skill allocates all host memory/CPU, making the system unresponsive. Host crashes or kills critical processes (database, SSH daemon). User loses access to system, can't stop the skill.

**Why it happens:**
Docker containers share host kernel and resources by default. Developers run containers with docker run without --memory, --cpus, --pids-limit flags. Skills are treated as "just code" without considering they're arbitrary executables.

**How to avoid:**
- Always set resource limits: --memory=512m --cpus=1.0 --pids-limit=100
- Use cgroups v2 for more granular control
- Implement resource quotas per skill (configurable by admins)
- Monitor container resource usage, kill containers exceeding limits
- Set --restart=no to prevent infinite restart loops on crashes
- Use read-only root filesystem where possible (--read-only)
- Drop unnecessary capabilities (--cap-drop=ALL --cap-add=NET_BIND_SERVICE)
- Test with resource-intensive skills (infinite loop, fork bomb, memory hog)

**Warning signs:**
- docker run commands without resource limit flags
- No monitoring of container resource usage
- System becomes unresponsive when running skills
- OOM killer terminates host processes
- No testing with malicious/buggy resource-intensive code

**Phase to address:**
Phase 3 (Docker Resource Management) - Set resource limits before allowing arbitrary skill execution.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing SSH keys in localStorage | Fast implementation, no keychain integration needed | Credentials exposed to XSS, permanently stored unencrypted | Never - critical security vulnerability |
| Mounting Docker socket for "easy" container access | Simplifies Docker API calls | Root access to host, container escape vector | Never - equivalent to sudo without password |
| Unbounded channels for log streaming | No backpressure handling needed, simpler code | Memory leaks, OOM crashes | Early prototype only - replace before beta |
| Sending unredacted configs to AI | Full context for better recommendations | Privacy violations, secrets leakage | Only with explicit user consent + local LLM option |
| No rollback on multi-server deployment failures | Faster initial implementation | Inconsistent state, manual reconciliation | Early alpha with single-server only - critical for multi-server |
| russh < 0.44.1 with known CVEs | Existing code works, no upgrade friction | DoS vulnerability, security audit failures | Never - update immediately |
| Skills as native code (not WASM) | Easier integration, better performance | No sandboxing, supply chain attacks | Internal trusted skills only, never user-submitted |
| Synchronous SSH operations blocking UI | Simpler async handling | Frozen UI during remote operations | Internal tools only - never user-facing |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| russh SSH library | Using versions < 0.44.1 with CVE-2024-43410 | Pin to russh >= 0.44.1, run cargo-audit in CI |
| Docker API | Mounting /var/run/docker.sock into containers | Use rootless Docker, call API from host, or use gVisor/Kata |
| SSH credentials | Storing in React state or localStorage | Use platform keychain (keyring crate), ephemeral keys |
| WASM skills | Assuming full filesystem/network access | Implement capability-based security with wasmtime |
| Log streaming | Using unbounded tokio channels | Use bounded channels with backpressure, rate limiting |
| ANSI escape sequences | Rendering raw terminal output in HTML | Strip/sanitize with strip-ansi-escapes before display |
| OpenAI API | Sending configs with secrets | Redact secrets or use local LLM (ollama) |
| Multi-server deployment | No state tracking or rollback | Implement saga pattern, track state per server |
| SSH reconnection | Naive retry without idempotency | Check operation ID, use persistent sessions (screen/tmux) |
| Docker resource limits | Running containers without --memory/--cpus | Always set limits, monitor usage, enforce quotas |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unbounded log buffers | Memory grows until OOM | Bounded channels, ring buffers, rate limiting | Any log-heavy operation (npm install, Docker build) |
| No SSH connection pooling | New SSH handshake for every operation (slow) | Reuse SSH sessions, implement connection pool | >10 operations per minute to same server |
| Docker pull on every skill run | Multi-minute delays, bandwidth waste | Cache images, use image digests, pre-pull common images | Every skill execution if not cached |
| Synchronous multi-server operations | Deploy to 10 servers takes 10x single server time | Parallel deployment with tokio tasks, concurrency limits | >3 servers with sequential operations |
| AI API calls in hot path | 500ms+ latency on every config change | Debounce, cache recommendations, run async | Every keystroke in config editor |
| Full config diff sent to AI | Token costs scale with config size | Send only changed sections, summarize large configs | Configs >10KB |
| No Docker log rotation | Container logs fill disk | Configure Docker log driver, size limits | Long-running containers with verbose logging |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| SSH credentials in browser storage | XSS steals production server access | Use platform keychain, never store in localStorage/sessionStorage |
| Docker socket mounted in containers | Container escape to root on host | Never mount socket, use rootless Docker or gVisor |
| WASM skills with unrestricted capabilities | Malicious skills exfiltrate data | Capability-based security, default deny, explicit grants |
| Unauthenticated Docker API access | Anyone can spawn containers | Docker TLS authentication, API access controls |
| ANSI escape sequence injection | Terminal emulator code execution, clipboard theft | Strip/sanitize ANSI codes before rendering |
| Secrets sent to AI APIs | Data leakage, compliance violations | Redact secrets, use local LLM, explicit user consent |
| No skill signature verification | Supply chain attacks, malicious skills | Verify signatures/checksums, approval workflow |
| Overly broad skill permissions | Skills access more than needed | Principle of least privilege, granular capabilities |
| No SSH rate limiting | Brute force attacks, DoS | Connection rate limits, fail2ban integration |
| Docker privileged containers | Container has full host access | Never use --privileged, drop capabilities |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No indication of which servers succeeded/failed | Users don't know system state after partial failure | Show per-server status, highlight failures, offer retry |
| SSH connection errors: "Connection refused" | Users don't know if it's credentials, network, or firewall | Specific errors: "SSH key rejected", "Host unreachable", "Port 22 blocked" with recovery steps |
| AI recommendations without confidence scores | Users trust hallucinated bad advice | Show confidence %, mark uncertain suggestions, link to official docs |
| Log output scrolls too fast to read | Users miss errors in verbose output | Pause/resume stream, highlight errors, filter by severity |
| No progress for long operations (Docker pull, npm install) | Users think it's frozen | Stream output or show indeterminate progress with "This may take 5 minutes" |
| Multi-server operations without preview | Users deploy to wrong servers | Show "will deploy to: [server1, server2, server3]" confirmation |
| Skill installation without permission review | Users unknowingly grant broad access | Show required permissions, "This skill needs: network access, file write to /data" |

## "Looks Done But Isn't" Checklist

- [ ] **SSH credential handling:** Often stored in localStorage - verify using platform keychain, test XSS doesn't expose keys
- [ ] **Docker security:** Often mounts socket for convenience - verify no socket mounting, test container can't escape
- [ ] **Skills sandbox:** Often native code with full access - verify WASM isolation, test malicious skill can't exfiltrate data
- [ ] **Log streaming memory:** Often uses unbounded channels - verify bounded channels with backpressure, test with heavy logs
- [ ] **ANSI sanitization:** Often renders raw output - verify escape sequences stripped, test with malicious input
- [ ] **AI secret redaction:** Often sends raw config - verify secrets redacted, test API keys don't appear in AI requests
- [ ] **Multi-server rollback:** Often no compensating transactions - verify rollback works, test partial failure recovery
- [ ] **SSH reconnection idempotency:** Often naive retry - verify operations are idempotent, test network instability
- [ ] **Docker resource limits:** Often unlimited - verify --memory/--cpus set, test resource exhaustion doesn't crash host
- [ ] **Dependency CVEs:** Often outdated libraries - verify cargo-audit passes, test against known vulnerabilities

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| SSH keys leaked via localStorage | CRITICAL | 1. Immediate: revoke compromised keys on all servers, 2. Generate new keys, 3. Force app update to use keychain, 4. Audit access logs for unauthorized use, 5. Notify users of breach |
| Docker socket mounting exploit | HIGH | 1. Kill containers with socket access, 2. Audit container activity logs, 3. Rebuild host from clean image if compromised, 4. Deploy fixed version without socket mounting |
| Malicious skill installed | HIGH | 1. Immediately stop skill containers, 2. Audit logs for data exfiltration, 3. Remove skill from all systems, 4. Implement signature verification, 5. Notify affected users |
| Unbounded channel OOM crash | MEDIUM | 1. Restart app, 2. Deploy hotfix with bounded channels, 3. Add monitoring to detect high memory usage |
| ANSI injection exploit | MEDIUM | 1. Sanitize existing logs, 2. Deploy fix with escape sequence stripping, 3. Test with known malicious sequences |
| Secrets sent to AI API | HIGH | 1. Contact OpenAI to delete data if possible, 2. Rotate all exposed secrets, 3. Deploy redaction fix, 4. Audit API logs |
| Multi-server inconsistent state | MEDIUM | 1. Document actual state per server, 2. Manually reconcile or rollback, 3. Deploy saga pattern fix |
| russh CVE-2024-43410 DoS | LOW | 1. Update russh to >= 0.44.1, 2. Add cargo-audit to CI, 3. Test connection spam doesn't crash |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| SSH credential storage | Phase 1 (SSH Security Foundation) | Security audit, verify keychain integration, XSS testing |
| russh CVE-2024-43410 | Phase 1 (SSH Dependencies) | cargo-audit in CI, version pinning verification |
| Docker socket mounting | Phase 2 (Docker Security Architecture) | Container escape testing, verify no socket mounts |
| Skill supply chain attacks | Phase 3 (Skills Sandbox Architecture) | WASM isolation testing, capability enforcement verification |
| Unbounded channel leaks | Phase 4 (Log Streaming Foundation) | Memory profiling under load, backpressure testing |
| ANSI escape injection | Phase 4 (Log Sanitization) | Fuzz testing with malicious sequences, rendering validation |
| AI secrets leakage | Phase 5 (AI Privacy Foundation) | Secret redaction audit, test configs with API keys |
| Multi-server partial failures | Phase 6 (Multi-Server Orchestration) | Chaos testing (network partitions), rollback verification |
| SSH reconnection duplicates | Phase 2 (SSH Reliability) | Network instability testing, idempotency validation |
| Docker resource exhaustion | Phase 3 (Docker Resource Management) | Resource limit enforcement testing, fork bomb survival |

## Sources

**SSH Security & Rust:**
- [SSH key management: Security best practices](https://graphite.com/guides/ssh-key-management-best-practices)
- [How Does SSH Key Management Strengthen Security?](https://www.encryptionconsulting.com/how-does-ssh-key-management-strengthen-security/)
- [Sherlock — Rust Security & Auditing Guide by Sherlock: 2026](https://sherlock.xyz/post/rust-security-auditing-guide-2026)
- [GitHub - Eugeny/russh: Rust SSH client & server library](https://github.com/Eugeny/russh)
- [CVE-2024-43410: russh Memory Allocation DoS](https://www.cvedetails.com/cve/CVE-2024-43410/)
- [CVE-2023-28113: russh Diffie-Hellman Key Validation](https://www.cvedetails.com/cve/CVE-2023-28113/)
- [Storing and Verifying Credentials for Auth in Rust Servers - Sling Academy](https://www.slingacademy.com/article/storing-and-verifying-credentials-for-auth-in-rust-servers/)

**Docker Security:**
- [Docker Security - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Docker Security Advisory: AuthZ Plugin Bypass Regression in Docker Engine](https://www.docker.com/blog/docker-security-advisory-docker-engine-authz-plugin/)
- [CVE-2024-41110: Docker AuthZ Plugin Bypass](https://www.upwind.io/feed/cve-2024-41110-docker-security-advisory-on-critical-update-for-docker-engine-authz-plugin-bypass)
- [Container Privilege Escalation Vulnerabilities Explained](https://www.aikido.dev/blog/container-privilege-escalation)
- [Docker Socket Security: A Critical Vulnerability Guide](https://medium.com/@instatunnel/docker-socket-security-a-critical-vulnerability-guide-76f4137a68c5)
- [9 Common Docker Container Security Vulnerabilities & Fixes](https://www.aikido.dev/blog/docker-container-security-vulnerabilities)
- [What is Container Escape: Detection & Prevention](https://www.wiz.io/academy/container-security/container-escape)

**Plugin/Skills Sandboxing:**
- [Plugins in Rust: The Technologies](https://nullderef.com/blog/plugin-tech/)
- [wasm-sandbox - Rust crate](https://docs.rs/wasm-sandbox/latest/wasm_sandbox/)
- [Security - Wasmtime](https://docs.wasmtime.dev/security.html)
- [CMU CSD PhD Blog - Provably-Safe Sandboxing with WebAssembly](https://www.cs.cmu.edu/~csd-phd-blog/2023/provably-safe-sandboxing-wasm/)
- [Building a Rust Plugin System](https://blog.anirudha.dev/rust-plugin-system)

**Tokio/Log Streaming:**
- [Unbounded MPSC does not free large amounts of memory - Issue #4321](https://github.com/tokio-rs/tokio/issues/4321)
- [Channels | Tokio Tutorial](https://tokio.rs/tokio/tutorial/channels)
- [Axum WebSocket resource leak - Issue #3359](https://github.com/tokio-rs/axum/issues/3359)
- [Axum streaming data with bounded memory usage](https://users.rust-lang.org/t/axum-streaming-data-to-multiple-http-clients-with-bounded-memory-usage/94668)
- [Rust concurrency: a streaming workflow with back-pressure](https://medium.com/@polyglot_factotum/rust-concurrency-a-streaming-workflow-served-with-a-side-of-back-pressure-955bdf0266b5)

**ANSI Escape Sequences:**
- [ANSI escape sequences remain open to abuse - The Register](https://www.theregister.com/2023/08/09/ansi_escape_sequence_risks/)
- [Weaponizing ANSI Escape Sequences](https://www.packetlabs.net/posts/weaponizing-ansi-escape-sequences)
- [Don't Trust This Title: Abusing Terminal Emulators with ANSI](https://www.cyberark.com/resources/threat-research-blog/dont-trust-this-title-abusing-terminal-emulators-with-ansi-escape-characters)
- [Terminal Escape Injection - InfosecMatter](https://www.infosecmatter.com/terminal-escape-injection/)
- [ANSI Escape Code Injection in OpenAI's Codex CLI Leading to RCE](https://dganev.com/posts/2026-02-12-ansi-escape-injection-codex-cli/)
- [ANSI Terminal security in 2023 and finding 10 CVEs](https://dgl.cx/2023/09/ansi-terminal-security)

**AI Security & Privacy:**
- [AI Risk & Compliance 2026: Enterprise Governance Overview](https://secureprivacy.ai/blog/ai-risk-compliance-2026)
- [The Top AI Security Risks (Updated 2026)](https://purplesec.us/learn/ai-security-risks/)
- [Top 10 Privacy, AI & Cybersecurity Issues for 2026](https://www.workplaceprivacyreport.com/2026/01/articles/consumer-privacy/top-10-privacy-ai-cybersecurity-issues-for-2026/)
- [How to Prevent LLM Hallucinations: 5 Proven Strategies](https://www.voiceflow.com/blog/prevent-llm-hallucinations)
- [Why language models hallucinate - OpenAI](https://openai.com/index/why-language-models-hallucinate/)
- [Managing costs - OpenAI API](https://platform.openai.com/docs/guides/realtime-costs)
- [Rate limits - OpenAI API](https://platform.openai.com/docs/guides/rate-limits)

**Multi-Server Orchestration:**
- [Automated Rollbacks in DevOps: Ensuring Stability (2026)](https://medium.com/@surbhi19/automated-rollbacks-in-devops-ensuring-stability-and-faster-recovery-in-ci-cd-pipelines-c197e39f9db6)
- [Recovering from Partial Failures in Enterprise MCP Tools](https://www.workato.com/the-connector/recovering-from-partial-failures-in-enterprise-mcp-tools/)
- [What are some common rollback and recovery challenges](https://www.linkedin.com/advice/0/what-some-common-rollback-recovery-challenges)
- [Making Retries Safe with Idempotent APIs - AWS Builders Library](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)

**SSH Session Persistence:**
- [5 Ways to Keep SSH Sessions Running After Disconnection](https://www.tecmint.com/keep-remote-ssh-sessions-running-after-disconnection/)
- [Keeping SSH Connections Alive: The Ultimate Guide](https://sivapraveenr.medium.com/keeping-ssh-connections-alive-the-ultimate-guide-to-uninterrupted-connectivity-cda0d3857100)

**Credential Management:**
- [GitHub - iqlusioninc/keychain-services.rs: Rust access to macOS Keychain](https://github.com/iqlusioninc/keychain-services.rs)
- [keyring - Rust crate](https://docs.rs/keyring)
- [Cryptex - Rust utility for secure secret storage](https://lib.rs/crates/cryptex)

**Tauri Security:**
- [Isolation Pattern - Tauri](https://v2.tauri.app/concept/inter-process-communication/isolation/)
- [Security - Tauri](https://v2.tauri.app/security/)
- [iFrames Bypass Origin Checks for Tauri API Access Control](https://github.com/tauri-apps/tauri/security/advisories/GHSA-57fm-592m-34r7)

---
*Pitfalls research for: OpenClaw Wizard v1.1 - Control Center Capabilities*
*Researched: 2026-02-14*
