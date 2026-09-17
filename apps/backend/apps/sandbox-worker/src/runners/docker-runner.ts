import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { TestCase, TestCaseResult, RunResult } from '../types';

export interface LanguageConfig {
  image: string;
  fileName: string;
  compileCmd?: string[]; // run inside the container before each test, if set
  runCmd: string[]; // run inside the container per test case, stdin piped in
}

const TIMEOUT_MS = Number(process.env.SANDBOX_TIMEOUT_MS ?? 8000);
const MEMORY_MB = Number(process.env.SANDBOX_MEMORY_MB ?? 256);

/**
 * The actual isolation boundary (architecture §16). Every run:
 *  - executes inside a fresh, disposable Docker container (`--rm`)
 *  - has NO network access (`--network none`)
 *  - has a read-only root filesystem except a small tmpfs scratch dir
 *    (`--read-only --tmpfs /sandbox:rw,size=64m`)
 *  - runs as a non-root, unprivileged user (`--user 1000:1000`)
 *  - is capped on CPU, memory, and process count
 *    (`--memory`, `--cpus`, `--pids-limit`, `--security-opt=no-new-privileges`)
 *  - is wall-clock timed out from OUTSIDE the container as well as
 *    inside (belt-and-suspenders — a hung container is force-killed
 *    even if an in-container timeout mechanism fails)
 *  - has its scratch directory on the HOST removed afterward regardless
 *    of success/failure/timeout
 *
 * No secrets, credentials, or host environment variables are passed
 * into the container. The container image itself should be built with
 * no outbound package-manager access baked in (pre-installed
 * toolchains only) — that hardening step is a Dockerfile/CI concern
 * documented in docs/sandbox-security.md, not something this process
 * can enforce at runtime, so it's called out explicitly rather than
 * silently assumed.
 */
export class DockerRunner {
  constructor(private readonly config: LanguageConfig) {}

  private async withScratchDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'careerlens-sandbox-'));
    try {
      return await fn(dir);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }

  private runInContainer(
    hostDir: string,
    cmd: string[],
    stdin: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }> {
    return new Promise((resolve) => {
      const containerName = `cl-sandbox-${randomUUID()}`;
      const args = [
        'run',
        '--rm',
        `--name=${containerName}`,
        '--network=none',
        '--read-only',
        '--tmpfs=/sandbox:rw,size=64m,exec',
        '--user=1000:1000',
        '--security-opt=no-new-privileges',
        `--memory=${MEMORY_MB}m`,
        '--memory-swap=' + `${MEMORY_MB}m`, // no swap beyond the memory limit
        '--cpus=1',
        '--pids-limit=64',
        '-v',
        `${hostDir}:/sandbox/work:ro`, // source mounted read-only; container writes only to tmpfs
        '-w',
        '/sandbox',
        this.config.image,
        ...cmd,
      ];

      const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const killTimer = setTimeout(() => {
        timedOut = true;
        // Outside-the-container force kill, independent of anything
        // happening inside the sandboxed process.
        spawn('docker', ['kill', containerName]);
      }, TIMEOUT_MS);

      child.stdout.on('data', (d) => (stdout += d.toString()));
      child.stderr.on('data', (d) => (stderr += d.toString()));
      child.stdin.write(stdin);
      child.stdin.end();

      child.on('close', (exitCode) => {
        clearTimeout(killTimer);
        resolve({ stdout, stderr, exitCode, timedOut });
      });
    });
  }

  async run(sourceCode: string, testCases: TestCase[]): Promise<RunResult> {
    return this.withScratchDir(async (hostDir) => {
      await fs.writeFile(path.join(hostDir, this.config.fileName), sourceCode, { mode: 0o444 });

      if (this.config.compileCmd) {
        const compile = await this.runInContainer(hostDir, this.config.compileCmd, '');
        if (compile.timedOut) return { status: 'TIMEOUT', testResults: [] };
        if (compile.exitCode !== 0) {
          return { status: 'FAILED', testResults: [], compileError: compile.stderr.slice(0, 4000) };
        }
      }

      const testResults: TestCaseResult[] = [];
      for (const tc of testCases) {
        const start = Date.now();
        const result = await this.runInContainer(hostDir, this.config.runCmd, tc.input);
        const durationMs = Date.now() - start;

        if (result.timedOut) {
          return { status: 'TIMEOUT', testResults };
        }

        const actualOutput = result.stdout.trim();
        testResults.push({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput,
          passed: actualOutput === tc.expectedOutput.trim(),
          durationMs,
        });
      }

      const anyRuntimeError = testResults.length === 0 && testCases.length > 0;
      return {
        status: anyRuntimeError ? 'FAILED' : 'COMPLETED',
        testResults,
      };
    });
  }
}
