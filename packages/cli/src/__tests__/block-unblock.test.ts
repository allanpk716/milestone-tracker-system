/**
 * Integration-style tests for block/unblock --json CLI commands.
 *
 * Strategy:
 * - Mock globalThis.fetch to return controlled API responses.
 * - Create a Commander program per test, register the command, and call
 *   the action handler directly (avoids process.exit from Commander).
 * - Spy on process.stdout.write to capture JSON output.
 * - Stub process.exit so outputJsonError doesn't kill the test runner.
 * - Do NOT mock console.log so human-readable output flows through to stdout.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import type { TaskResponse } from '../types.js';

// ── Test Fixtures ───────────────────────────────────────────────────────────

const mockTaskInProgress: TaskResponse = {
  id: 'TASK-2',
  shortId: 2,
  moduleId: 'MOD-1-1',
  title: '实现用户认证模块',
  description: '实现 JWT 认证',
  references: null,
  status: 'in-progress',
  assignee: 'agent-beta',
  subTotal: 3,
  subDone: 1,
  progressMessage: 'JWT 签发已完成',
  blockedReason: null,
  commitHash: null,
  createdAt: '2025-01-16T09:00:00Z',
  updatedAt: '2025-01-21T11:00:00Z',
  reportedAt: null,
};

const mockTaskBlocked: TaskResponse = {
  id: 'TASK-2',
  shortId: 2,
  moduleId: 'MOD-1-1',
  title: '实现用户认证模块',
  description: '实现 JWT 认证',
  references: null,
  status: 'blocked',
  assignee: 'agent-beta',
  subTotal: 3,
  subDone: 1,
  progressMessage: null,
  blockedReason: '缺少 OAuth 配置',
  commitHash: null,
  createdAt: '2025-01-16T09:00:00Z',
  updatedAt: '2025-01-21T12:00:00Z',
  reportedAt: null,
};

const mockTask3: TaskResponse = {
  id: 'TASK-3',
  shortId: 3,
  moduleId: 'MOD-1-2',
  title: '编写 API 文档',
  description: null,
  references: null,
  status: 'todo',
  assignee: null,
  subTotal: 0,
  subDone: 0,
  progressMessage: null,
  blockedReason: null,
  commitHash: null,
  createdAt: '2025-01-17T08:00:00Z',
  updatedAt: '2025-01-17T08:00:00Z',
  reportedAt: null,
};

const allMockTasks: TaskResponse[] = [mockTaskInProgress, mockTask3];

const mockConfig: ResolvedConfig = {
  serverUrl: 'http://localhost:5173',
  milestoneId: 'MS-1',
  apiKey: 'test-api-key',
  agentName: 'agent-alpha',
  configPath: '/fake/.mt-cli.json',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeMockFetch(response: {
  ok: boolean;
  status: number;
  body?: unknown;
}) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    text: () => Promise.resolve(JSON.stringify(response.body)),
  });
}

async function runCommand(
  registerFn: (parent: Command, getConfig: () => ResolvedConfig) => void,
  args: string[],
  config: ResolvedConfig = mockConfig,
): Promise<{ stdout: string[]; stderr: string[]; exitCode: number }> {
  const argv = ['node', 'script.js', ...args];
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const consoleLogChunks: string[] = [];
  let exitCode = 0;

  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    stdoutChunks.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk));
    return true;
  });
  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
    stderrChunks.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk));
    return true;
  });
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    consoleLogChunks.push(args.map(String).join(' '));
    return true;
  });
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
    exitCode = code ?? 0;
    throw new Error(`__process_exit__${exitCode}`);
  });

  const program = new Command();
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  program.exitOverride();

  const parent = program.command('tasks');
  registerFn(parent, () => config);

  try {
    await program.parseAsync(argv);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('__process_exit__')) {
      // process.exit was called — exitCode already set
    } else {
      const exitErr = e as Error & { code?: string; exitCode?: number };
      if (exitErr.code?.startsWith('commander.')) {
        exitCode = exitErr.exitCode ?? 1;
      } else {
        throw e;
      }
    }
  }

  stdoutSpy.mockRestore();
  stderrSpy.mockRestore();
  consoleLogSpy.mockRestore();
  exitSpy.mockRestore();

  // Combine process.stdout.write output with console.log output
  const combinedStdout = [...stdoutChunks, ...consoleLogChunks.join('\n')];
  return { stdout: combinedStdout, stderr: stderrChunks, exitCode };
}

function parseStdoutJson(stdout: string[]): unknown {
  const raw = stdout.join('');
  return JSON.parse(raw);
}

function parseLastJsonLine(stdout: string[]): unknown {
  const raw = stdout.join('');
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON found in stdout: ${JSON.stringify(raw.slice(0, 200))}`);
  return JSON.parse(jsonMatch[0]);
}

// ── block --json ────────────────────────────────────────────────────────────

describe('block --json', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('outputs blocked task JSON with blockedReason', async () => {
    const { registerBlockCommand } = await import('../commands/block.js');
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(mockTaskBlocked)),
      });

    const { stdout, exitCode } = await runCommand(registerBlockCommand, [
      'tasks', 'block', '#2', '--reason', '缺少 OAuth 配置', '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse;
    expect(parsed.status).toBe('blocked');
    expect(parsed.blockedReason).toBe('缺少 OAuth 配置');
    expect(parsed.shortId).toBe(2);
  });

  it('outputs human-readable output without --json', async () => {
    const { registerBlockCommand } = await import('../commands/block.js');
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(mockTaskBlocked)),
      });

    const { stdout, exitCode } = await runCommand(registerBlockCommand, [
      'tasks', 'block', '#2', '--reason', '缺少 OAuth 配置',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const output = stdout.join('');
    expect(output).toContain('已阻塞');
    expect(output).toContain('#2');
    expect(output).toContain('实现用户认证模块');
    expect(output).toContain('缺少 OAuth 配置');
  });

  it('outputs HTTP_400 error for invalid status transition with --json', async () => {
    const { registerBlockCommand } = await import('../commands/block.js');
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: false, status: 400,
        text: () => Promise.resolve(JSON.stringify({
          error: 'invalid_status',
          message: '只有 in-progress 状态的任务可以被阻塞',
        })),
      });

    const { stdout, exitCode } = await runCommand(registerBlockCommand, [
      'tasks', 'block', '#3', '--reason', 'test', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_400');
  });

  it('outputs HTTP_404 error for non-existent task with --json', async () => {
    const { registerBlockCommand } = await import('../commands/block.js');
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: false, status: 404,
        text: () => Promise.resolve(JSON.stringify({ error: 'not_found', message: 'Task not found' })),
      });

    const { stdout, exitCode } = await runCommand(registerBlockCommand, [
      'tasks', 'block', '#2', '--reason', 'test', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_404');
  });

  it('exits with error when --reason is not provided', async () => {
    const { registerBlockCommand } = await import('../commands/block.js');
    globalThis.fetch = vi.fn();

    // Commander handles requiredOption validation — should exit with non-zero
    const { exitCode, stderr } = await runCommand(registerBlockCommand, [
      'tasks', 'block', '#2',
    ], mockConfig);

    expect(exitCode).toBe(1);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    // Commander writes error to stderr via writeErr (suppressed) or process.stderr
    // The exitOverride throws, so check that we got an error exit
  });

  it('handles unicode reason text', async () => {
    const { registerBlockCommand } = await import('../commands/block.js');
    const reason = '缺少 OAuth 🔑 配置 — 需要 API 密钥';
    const blocked = { ...mockTaskBlocked, blockedReason: reason };
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(blocked)),
      });

    const { stdout, exitCode } = await runCommand(registerBlockCommand, [
      'tasks', 'block', '#2', '--reason', reason, '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse;
    expect(parsed.blockedReason).toBe(reason);
  });
});

// ── unblock --json ──────────────────────────────────────────────────────────

describe('unblock --json', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('outputs unblocked task JSON with status in-progress and blockedReason null', async () => {
    const { registerUnblockCommand } = await import('../commands/unblock.js');
    const unblocked = { ...mockTaskBlocked, status: 'in-progress' as const, blockedReason: null, progressMessage: '配置已修复' };
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(unblocked)),
      });

    const { stdout, exitCode } = await runCommand(registerUnblockCommand, [
      'tasks', 'unblock', '#2', '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse;
    expect(parsed.status).toBe('in-progress');
    expect(parsed.blockedReason).toBeNull();
  });

  it('outputs human-readable output without --json', async () => {
    const { registerUnblockCommand } = await import('../commands/unblock.js');
    const unblocked = { ...mockTaskBlocked, status: 'in-progress' as const, blockedReason: null };
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(unblocked)),
      });

    const { stdout, exitCode } = await runCommand(registerUnblockCommand, [
      'tasks', 'unblock', '#2',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const output = stdout.join('');
    expect(output).toContain('已解除阻塞');
    expect(output).toContain('#2');
    expect(output).toContain('实现用户认证模块');
  });

  it('passes --message to API when provided', async () => {
    const { registerUnblockCommand } = await import('../commands/unblock.js');
    const unblocked = { ...mockTaskBlocked, status: 'in-progress' as const, blockedReason: null, progressMessage: '配置已修复' };
    let capturedBody: unknown;
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockImplementation(async (_input: string | URL | Request, init?: RequestInit) => {
        // Capture the request body from the second call (unblock POST)
        if (init?.body) {
          capturedBody = JSON.parse(init.body as string);
        }
        return {
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(unblocked)),
        };
      });

    const { stdout, exitCode } = await runCommand(registerUnblockCommand, [
      'tasks', 'unblock', '#2', '--message', '配置已修复', '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    expect(capturedBody).toEqual({ message: '配置已修复' });
    const parsed = parseStdoutJson(stdout) as TaskResponse;
    expect(parsed.status).toBe('in-progress');
  });

  it('does not send message field when --message is omitted', async () => {
    const { registerUnblockCommand } = await import('../commands/unblock.js');
    const unblocked = { ...mockTaskBlocked, status: 'in-progress' as const, blockedReason: null };
    let capturedBody: unknown;
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockImplementation(async (_input: string | URL | Request, init?: RequestInit) => {
        if (init?.body) {
          capturedBody = JSON.parse(init.body as string);
        }
        return {
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(unblocked)),
        };
      });

    await runCommand(registerUnblockCommand, [
      'tasks', 'unblock', '#2', '--json',
    ], mockConfig);

    expect(capturedBody).toEqual({});
  });

  it('outputs HTTP_400 error for non-blocked task with --json', async () => {
    const { registerUnblockCommand } = await import('../commands/unblock.js');
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: false, status: 400,
        text: () => Promise.resolve(JSON.stringify({
          error: 'invalid_status',
          message: '只有 blocked 状态的任务可以被解除阻塞',
        })),
      });

    const { stdout, exitCode } = await runCommand(registerUnblockCommand, [
      'tasks', 'unblock', '#2', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_400');
  });

  it('outputs HTTP_404 error for non-existent task with --json', async () => {
    const { registerUnblockCommand } = await import('../commands/unblock.js');
    // Use an existing short ID so resolveTaskId succeeds, but API returns 404
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: false, status: 404,
        text: () => Promise.resolve(JSON.stringify({ error: 'not_found', message: 'Task not found' })),
      });

    const { stdout, exitCode } = await runCommand(registerUnblockCommand, [
      'tasks', 'unblock', '#2', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_404');
  });
});
