# Code Execution Sandbox — Security Model

Corresponds to master-prompt §16. This is the concrete threat model and
set of controls for `apps/sandbox-worker`, the only component that ever
executes user-submitted code.

## Isolation boundary

Each submission runs in a **fresh, single-use Docker container** (see
`apps/sandbox-worker/src/runners/docker-runner.ts`):

| Control | Flag | Purpose |
|---|---|---|
| Disposable | `--rm` | No state persists between runs; nothing to clean up on the container side |
| No network | `--network none` | Submitted code cannot exfiltrate data, call out, or attack other services |
| Read-only rootfs | `--read-only` | Code cannot modify the image or write outside its scratch space |
| Scratch space only | `--tmpfs /sandbox:rw,size=64m` | The only writable location is a small, memory-backed, ephemeral tmpfs |
| Non-root user | `--user 1000:1000` | Limits what a container-escape or misconfigured binary could do |
| No privilege escalation | `--security-opt=no-new-privileges` | setuid binaries can't gain more privilege than the sandbox user |
| Memory cap | `--memory`, `--memory-swap` (equal, no extra swap) | Bounds memory-exhaustion attacks on the host |
| CPU cap | `--cpus=1` | One submission cannot starve the host or other concurrent runs |
| Process cap | `--pids-limit=64` | Prevents fork-bombs |
| Source mounted read-only | `-v hostDir:/sandbox/work:ro` | Submitted source cannot be modified by the process running it |

## Timeout — belt and suspenders

`SANDBOX_TIMEOUT_MS` (default 8000ms) is enforced **from the host process**,
independent of anything happening inside the container: if the container
hasn't exited by the deadline, the orchestrator issues `docker kill` on
it directly. This means a submission that disables/ignores an in-language
timeout mechanism is still bounded.

## What is explicitly NOT trusted

- The submitted source code itself (obviously).
- Any output the process prints — captured, size-bounded, and only ever
  compared against expected test output; never `eval`'d or otherwise
  executed by the orchestrator.
- The container's exit code alone — combined with stdout/stderr and the
  timeout flag to classify COMPLETED / FAILED / TIMEOUT.

## Secrets and credentials

No environment variables, API keys, or database credentials are passed
into the sandbox container. The only data that crosses the boundary is
the submitted source code (in) and stdout/stderr (out).

## Image hardening (build-time, not runtime-enforced here)

The per-language images (`careerlens/sandbox-python`, `-cpp`, `-java`)
are expected to be built in CI as minimal, pinned-version images with
**no package-manager network access baked in** — i.e., they should not
be able to `pip install` / `apt-get install` anything at runtime even if
`--network none` were somehow bypassed. This is a Dockerfile/CI
responsibility, not something the worker process can verify at
execution time, so it's called out explicitly here rather than assumed.

## Deployment topology

`apps/sandbox-worker` should run with access to a Docker daemon via
either "Docker-outside-of-Docker" (mounting the host's Docker socket
into a dedicated, otherwise-unprivileged worker host) or a dedicated
VM — **not** Docker-in-Docker sharing a daemon with other tenants, which
would undermine the isolation this document describes. Ideally this
worker runs on hosts with no other sensitive workloads, as an additional
blast-radius reduction if a container escape were ever found.

## Known limitations (stated explicitly, not fabricated as "solved")

- This is container-level isolation, not a hardened microVM (e.g.
  Firecracker/gVisor). For a genuinely hostile-code threat model at
  scale, migrating to a microVM-based runner is the documented next
  step — flagged, not implemented, in this v1.
- No static analysis / code scanning of submissions before execution
  in v1 — the isolation boundary is the sole defense. Not measured as
  sufficient for any particular compliance requirement.
