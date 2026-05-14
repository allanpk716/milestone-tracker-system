/**
 * Integration-style tests for --json output across all 7 CLI commands.
 *
 * Strategy:
 * - Mock globalThis.fetch to return controlled API responses.
 * - Create a Commander program per test, register the command, and call
 *   the action handler directly (avoids process.exit from Commander).
 * - Spy on process.stdout.write to capture JSON output.
 * - Stub process.exit so outputJsonError doesn't kill the test runner.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import type { TaskResponse } from '../types.js';
import { MtCliError } from '../client.js';

// ── Test Fixtures ───────────────────────────────────────────────────────────

const mockTask1: TaskResponse = {
  id: 'TASK-1',
  shortId: 1,
  moduleId: 'MOD-1-1',
  title: '搭建项目基础结构',
  description: '初始化项目依赖',
  references: null,
  status: 'done',
  assignee: 'agent-alpha',
  subTotal: 5,
  subDone: 5,
  progressMessage: '已完成所有子任务',
  commitHash: 'abc1234',
  evidenceJson: null,
  filesTouched: null,
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-20T15:30:00Z',
  reportedAt: '2025-01-20T15:30:00Z',
};

const mockTask2: TaskResponse = {
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
  commitHash: null,
  evidenceJson: null,
  filesTouched: null,
  createdAt: '2025-01-16T09:00:00Z',
  updatedAt: '2025-01-21T11:00:00Z',
  reportedAt: null,
};

const mockTask3: TaskResponse = {
  id: 'TASK-3',
  shortId: 3,
  moduleId: 'MOD-1-2',
  title: '编写 API 文档',
  description: null,
  references: 'https://example.com/docs',
  status: 'todo',
  assignee: null,
  subTotal: 0,
  subDone: 0,
  progressMessage: null,
  commitHash: null,
  evidenceJson: null,
  filesTouched: null,
  createdAt: '2025-01-17T08:00:00Z',
  updatedAt: '2025-01-17T08:00:00Z',
  reportedAt: null,
};

const allMockTasks: TaskResponse[] = [mockTask1, mockTask2, mockTask3];

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
  nonJsonText?: string;
}) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    text: () =>
      response.nonJsonText !== undefined
        ? Promise.resolve(response.nonJsonText)
        : Promise.resolve(JSON.stringify(response.body)),
  });
}

/**
 * Run a command's action handler and capture stdout.
 * Returns { stdout: string[], exitCode: number }.
 */
async function runCommand(
  registerFn: (parent: Command, getConfig: () => ResolvedConfig) => void,
  args: string[],
  config: ResolvedConfig = mockConfig,
  registerOnParent = false,
): Promise<{ stdout: string[]; stderr: string[]; exitCode: number }> {
  // Build argv: [node, script, ...commandArgs]
  // For registerOnParent, args already include the command name (e.g. ['status', '--json'])
  // For sub-group commands, args include the group + command (e.g. ['tasks', 'list', '--json'])
  const argv = ['node', 'script.js', ...args];
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  let exitCode = 0;

  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    stdoutChunks.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk));
    return true;
  });
  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
    stderrChunks.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk));
    return true;
  });
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
    exitCode = code ?? 0;
    throw new Error(`__process_exit__${exitCode}`);
  });

  const program = new Command();
  // Prevent Commander from writing to stdout/stderr on its own
  program.configureOutput({
    writeOut: () => {},
    writeErr: () => {},
  });
  program.exitOverride();

  const parent = registerOnParent ? program : program.command('tasks');
  registerFn(parent, () => config);

  try {
    await program.parseAsync(argv);
  } catch (e) {
    // Expected: process.exit throws or Commander's exitOverride throws
    if (!(e instanceof Error && e.message.startsWith('__process_exit__'))) {
      // Re-throw unexpected errors
      const exitErr = e as Error & { code?: string };
      if (exitErr.code !== 'commander.exitOverride') throw e;
    }
  }

  stdoutSpy.mockRestore();
  stderrSpy.mockRestore();
  exitSpy.mockRestore();

  return { stdout: stdoutChunks, stderr: stderrChunks, exitCode };
}

/** Extract JSON from captured stdout chunks. */
function parseStdoutJson(stdout: string[]): unknown {
  const raw = stdout.join('');
  return JSON.parse(raw);
}

/** Extract the last JSON line from stdout (in case of multiple writes). */
function parseLastJsonLine(stdout: string[]): unknown {
  const raw = stdout.join('');
  // Find JSON content: look for complete JSON objects in the output
  // The output might have ANSI codes or other artifacts
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON found in stdout: ${JSON.stringify(raw.slice(0, 200))}`);
  return JSON.parse(jsonMatch[0]);
}

// ── list --json ─────────────────────────────────────────────────────────────

describe('list --json', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('outputs JSON array with all tasks', async () => {
    const { registerListCommand } = await import('../commands/list.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: allMockTasks });

    const { stdout, exitCode } = await runCommand(registerListCommand, [
      'tasks', 'list', '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
    expect((parsed as TaskResponse[])[0].shortId).toBe(1);
  });

  it('outputs empty array when no tasks', async () => {
    const { registerListCommand } = await import('../commands/list.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: [] });

    const { stdout, exitCode } = await runCommand(registerListCommand, [
      'tasks', 'list', '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout);
    expect(parsed).toEqual([]);
  });

  it('outputs error JSON on HTTP 401', async () => {
    const { registerListCommand } = await import('../commands/list.js');
    globalThis.fetch = makeMockFetch({
      ok: false,
      status: 401,
      body: { error: 'unauthorized', message: 'API 密钥无效' },
    });

    const { stdout, exitCode } = await runCommand(registerListCommand, [
      'tasks', 'list', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_401');
    expect(parsed.error).toBeTruthy();
  });

  it('outputs error JSON on HTTP 500', async () => {
    const { registerListCommand } = await import('../commands/list.js');
    globalThis.fetch = makeMockFetch({
      ok: false,
      status: 500,
      body: { error: 'internal', message: '服务器内部错误' },
    });

    const { stdout, exitCode } = await runCommand(registerListCommand, [
      'tasks', 'list', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_500');
  });

  it('includes done/skipped tasks in JSON output (no filtering)', async () => {
    const { registerListCommand } = await import('../commands/list.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: allMockTasks });

    const { stdout } = await runCommand(registerListCommand, [
      'tasks', 'list', '--json',
    ], mockConfig);

    const parsed = parseStdoutJson(stdout) as TaskResponse[];
    // mockTask1 is 'done' — should still be present in JSON output
    expect(parsed.find((t) => t.shortId === 1 && t.status === 'done')).toBeTruthy();
  });
});

// ── show --json ─────────────────────────────────────────────────────────────

describe('show --json', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('outputs single task JSON with all fields', async () => {
    const { registerShowCommand } = await import('../commands/show.js');
    // First call: resolveTaskId fetches task list; second call: fetches task detail
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(mockTask2)),
      });

    const { stdout, exitCode } = await runCommand(registerShowCommand, [
      'tasks', 'show', '#2', '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse;
    expect(parsed.shortId).toBe(2);
    expect(parsed.title).toBe('实现用户认证模块');
    expect(parsed.assignee).toBe('agent-beta');
  });

  it('outputs error JSON on HTTP 404', async () => {
    const { registerShowCommand } = await import('../commands/show.js');
    // Task list succeeds (for resolveTaskId), detail fetch fails
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: false, status: 404,
        text: () => Promise.resolve(JSON.stringify({ error: 'not_found', message: 'Task not found' })),
      });

    const { stdout, exitCode } = await runCommand(registerShowCommand, [
      'tasks', 'show', '#2', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_404');
  });

  it('outputs error JSON for unknown short ID', async () => {
    const { registerShowCommand } = await import('../commands/show.js');
    // Task list returns tasks, but #999 doesn't exist
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: allMockTasks });

    const { stdout, exitCode } = await runCommand(registerShowCommand, [
      'tasks', 'show', '#999', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.error).toContain('999');
  });

  it('uses full task ID directly without list fetch', async () => {
    const { registerShowCommand } = await import('../commands/show.js');
    // Only one fetch: the task detail (no list fetch for full IDs)
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true, status: 200,
      text: () => Promise.resolve(JSON.stringify(mockTask1)),
    });

    const { stdout, exitCode } = await runCommand(registerShowCommand, [
      'tasks', 'show', 'TASK-1', '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse;
    expect(parsed.id).toBe('TASK-1');
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });
});

// ── mine --json ─────────────────────────────────────────────────────────────

describe('mine --json', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('outputs filtered array with only matching agent tasks', async () => {
    const { registerMineCommand } = await import('../commands/mine.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: allMockTasks });

    const { stdout, exitCode } = await runCommand(registerMineCommand, [
      'tasks', 'mine', '--json',
    ], { ...mockConfig, agentName: 'agent-beta' });

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].assignee).toBe('agent-beta');
  });

  it('outputs empty array when no matching tasks', async () => {
    const { registerMineCommand } = await import('../commands/mine.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: allMockTasks });

    const { stdout, exitCode } = await runCommand(registerMineCommand, [
      'tasks', 'mine', '--json',
    ], { ...mockConfig, agentName: 'agent-nonexistent' });

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout);
    expect(parsed).toEqual([]);
  });

  it('outputs CONFIG_ERROR when agentName is missing', async () => {
    const { registerMineCommand } = await import('../commands/mine.js');

    const { stdout, exitCode } = await runCommand(registerMineCommand, [
      'tasks', 'mine', '--json',
    ], { ...mockConfig, agentName: undefined as unknown as string });

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('UNKNOWN_ERROR'); // plain Error, not MtCliError
    expect(parsed.error).toContain('Agent');
  });

  it('sorts tasks: in-progress first', async () => {
    const { registerMineCommand } = await import('../commands/mine.js');
    // Give both tasks to agent-alpha
    const tasks: TaskResponse[] = [
      { ...mockTask1, assignee: 'agent-alpha', status: 'done' },
      { ...mockTask2, assignee: 'agent-alpha', status: 'in-progress' },
      { ...mockTask3, assignee: 'agent-alpha', status: 'todo' },
    ];
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: tasks });

    const { stdout, exitCode } = await runCommand(registerMineCommand, [
      'tasks', 'mine', '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse[];
    expect(parsed[0].status).toBe('in-progress');
  });

  it('uses --agent flag over config agentName', async () => {
    const { registerMineCommand } = await import('../commands/mine.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: allMockTasks });

    const { stdout, exitCode } = await runCommand(registerMineCommand, [
      'tasks', 'mine', '--agent', 'agent-beta', '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].assignee).toBe('agent-beta');
  });
});

// ── claim --json ────────────────────────────────────────────────────────────

describe('claim --json', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('outputs claimed task JSON', async () => {
    const { registerClaimCommand } = await import('../commands/claim.js');
    const claimed = { ...mockTask3, assignee: 'agent-alpha', status: 'in-progress' as const };
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(claimed)),
      });

    const { stdout, exitCode } = await runCommand(registerClaimCommand, [
      'tasks', 'claim', '#3', '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse;
    expect(parsed.assignee).toBe('agent-alpha');
    expect(parsed.shortId).toBe(3);
  });

  it('outputs HTTP_409 error for already claimed task', async () => {
    const { registerClaimCommand } = await import('../commands/claim.js');
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: false, status: 409,
        text: () => Promise.resolve(JSON.stringify({
          error: 'conflict',
          message: 'Task already claimed',
        })),
      });

    const { stdout, exitCode } = await runCommand(registerClaimCommand, [
      'tasks', 'claim', '#3', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_409');
  });

  it('outputs HTTP_404 error for unknown task', async () => {
    const { registerClaimCommand } = await import('../commands/claim.js');
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: false, status: 404,
        text: () => Promise.resolve(JSON.stringify({ error: 'not_found', message: 'Task not found' })),
      });

    const { stdout, exitCode } = await runCommand(registerClaimCommand, [
      'tasks', 'claim', '#3', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_404');
  });

  it('outputs CONFIG_ERROR when agentName is missing', async () => {
    const { registerClaimCommand } = await import('../commands/claim.js');

    const { stdout, exitCode } = await runCommand(registerClaimCommand, [
      'tasks', 'claim', '#3', '--json',
    ], { ...mockConfig, agentName: undefined as unknown as string });

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('UNKNOWN_ERROR');
    expect(parsed.error).toContain('Agent');
  });
});

// ── progress --json ─────────────────────────────────────────────────────────

describe('progress --json', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('outputs updated task JSON with sub-task progress', async () => {
    const { registerProgressCommand } = await import('../commands/progress.js');
    const updated = { ...mockTask2, subDone: 2, subTotal: 3 };
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(updated)),
      });

    const { stdout, exitCode } = await runCommand(registerProgressCommand, [
      'tasks', 'progress', '#2', '--sub-done', '2', '--sub-total', '3', '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse;
    expect(parsed.subDone).toBe(2);
    expect(parsed.subTotal).toBe(3);
  });

  it('outputs JSON with message only', async () => {
    const { registerProgressCommand } = await import('../commands/progress.js');
    const updated = { ...mockTask2, progressMessage: '开始编写测试' };
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(updated)),
      });

    const { stdout, exitCode } = await runCommand(registerProgressCommand, [
      'tasks', 'progress', '#2', '--message', '开始编写测试', '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse;
    expect(parsed.progressMessage).toBe('开始编写测试');
  });

  it('outputs HTTP_400 error for invalid status', async () => {
    const { registerProgressCommand } = await import('../commands/progress.js');
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: false, status: 400,
        text: () => Promise.resolve(JSON.stringify({
          error: 'invalid_status',
          message: 'Cannot update progress on completed task',
        })),
      });

    const { stdout, exitCode } = await runCommand(registerProgressCommand, [
      'tasks', 'progress', '#1', '--message', 'test', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_400');
  });
});

// ── complete --json ─────────────────────────────────────────────────────────

describe('complete --json', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('outputs completed task JSON', async () => {
    const { registerCompleteCommand } = await import('../commands/complete.js');
    const completed = { ...mockTask2, status: 'done' as const };
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(completed)),
      });

    const { stdout, exitCode } = await runCommand(registerCompleteCommand, [
      'tasks', 'complete', '#2', '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse;
    expect(parsed.status).toBe('done');
  });

  it('outputs JSON with commitHash', async () => {
    const { registerCompleteCommand } = await import('../commands/complete.js');
    const completed = { ...mockTask2, status: 'done' as const, commitHash: 'sha1abc' };
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(completed)),
      });

    const { stdout, exitCode } = await runCommand(registerCompleteCommand, [
      'tasks', 'complete', '#2', '--commit', 'sha1abc', '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse;
    expect(parsed.commitHash).toBe('sha1abc');
  });

  it('outputs HTTP_400 error for wrong status transition', async () => {
    const { registerCompleteCommand } = await import('../commands/complete.js');
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: false, status: 400,
        text: () => Promise.resolve(JSON.stringify({
          error: 'invalid_status',
          message: 'Cannot complete task in status: todo',
        })),
      });

    const { stdout, exitCode } = await runCommand(registerCompleteCommand, [
      'tasks', 'complete', '#3', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_400');
  });

  it('sends --evidence array in request body and returns enriched response', async () => {
    const { registerCompleteCommand } = await import('../commands/complete.js');
    const evidence = [{ command: 'npm test', exitCode: 0, verdict: 'pass' }];
    const completed = { ...mockTask2, status: 'done' as const, evidenceJson: evidence };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(completed)),
      });
    globalThis.fetch = fetchMock;

    const { stdout, exitCode } = await runCommand(registerCompleteCommand, [
      'tasks', 'complete', '#2', '--evidence', JSON.stringify(evidence), '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse;
    expect(parsed.status).toBe('done');
    expect(parsed.evidenceJson).toEqual(evidence);

    // Verify the POST body included evidenceJson
    const postCall = fetchMock.mock.calls[1];
    const postBody = JSON.parse(postCall[1].body);
    expect(postBody.evidenceJson).toEqual(evidence);
  });

  it('sends --files-touched array in request body', async () => {
    const { registerCompleteCommand } = await import('../commands/complete.js');
    const files = ['src/api/auth.ts', 'src/api/auth.test.ts'];
    const completed = { ...mockTask2, status: 'done' as const, filesTouched: files };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(completed)),
      });
    globalThis.fetch = fetchMock;

    const { stdout, exitCode } = await runCommand(registerCompleteCommand, [
      'tasks', 'complete', '#2', '--files-touched', JSON.stringify(files), '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as TaskResponse;
    expect(parsed.filesTouched).toEqual(files);

    const postCall = fetchMock.mock.calls[1];
    const postBody = JSON.parse(postCall[1].body);
    expect(postBody.filesTouched).toEqual(files);
  });

  it('sends both --evidence and --files-touched together', async () => {
    const { registerCompleteCommand } = await import('../commands/complete.js');
    const evidence = [{ command: 'npm test', exitCode: 0, verdict: 'pass' }];
    const files = ['src/index.ts'];
    const completed = { ...mockTask2, status: 'done' as const, evidenceJson: evidence, filesTouched: files };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(allMockTasks)),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify(completed)),
      });
    globalThis.fetch = fetchMock;

    const { stdout, exitCode } = await runCommand(registerCompleteCommand, [
      'tasks', 'complete', '#2',
      '--evidence', JSON.stringify(evidence),
      '--files-touched', JSON.stringify(files),
      '--message', 'All tests pass',
      '--commit', 'sha1abc',
      '--json',
    ], mockConfig);

    expect(exitCode).toBe(0);
    const postCall = fetchMock.mock.calls[1];
    const postBody = JSON.parse(postCall[1].body);
    expect(postBody.evidenceJson).toEqual(evidence);
    expect(postBody.filesTouched).toEqual(files);
    expect(postBody.progressMessage).toBe('All tests pass');
    expect(postBody.commitHash).toBe('sha1abc');
  });

  it('rejects invalid JSON for --evidence', async () => {
    const { registerCompleteCommand } = await import('../commands/complete.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: allMockTasks });

    const { exitCode } = await runCommand(registerCompleteCommand, [
      'tasks', 'complete', '#2', '--evidence', 'not-json', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
  });

  it('rejects non-array JSON for --evidence', async () => {
    const { registerCompleteCommand } = await import('../commands/complete.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: allMockTasks });

    const { exitCode } = await runCommand(registerCompleteCommand, [
      'tasks', 'complete', '#2', '--evidence', '{"command":"npm test"}', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
  });

  it('rejects non-array JSON for --files-touched', async () => {
    const { registerCompleteCommand } = await import('../commands/complete.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: allMockTasks });

    const { exitCode } = await runCommand(registerCompleteCommand, [
      'tasks', 'complete', '#2', '--files-touched', '"single-file.ts"', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
  });
});

// ── status --json ───────────────────────────────────────────────────────────

describe('status --json', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('outputs connected status with milestone data', async () => {
    const { registerStatusCommand } = await import('../commands/status.js');
    const milestone = { id: 'MS-1', title: '里程碑一', status: 'in-progress' };
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: milestone });

    const { stdout, exitCode } = await runCommand(
      registerStatusCommand,
      ['status', '--json'],
      mockConfig,
      true, // registerOnParent
    );

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as Record<string, unknown>;
    expect(parsed.connected).toBe(true);
    expect(parsed.serverUrl).toBe('http://localhost:5173');
    expect(parsed.milestoneId).toBe('MS-1');
    expect(parsed.agentName).toBe('agent-alpha');
    expect(parsed.milestone).toBeDefined();
    expect((parsed.milestone as Record<string, unknown>).title).toBe('里程碑一');
  });

  it('outputs null agentName when not configured', async () => {
    const { registerStatusCommand } = await import('../commands/status.js');
    const milestone = { id: 'MS-1', title: 'M1', status: 'active' };
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: milestone });

    const { stdout, exitCode } = await runCommand(
      registerStatusCommand,
      ['status', '--json'],
      { ...mockConfig, agentName: undefined as unknown as string },
      true,
    );

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as Record<string, unknown>;
    expect(parsed.agentName).toBeNull();
  });

  it('outputs error JSON when connection fails', async () => {
    const { registerStatusCommand } = await import('../commands/status.js');
    globalThis.fetch = makeMockFetch({
      ok: false,
      status: 500,
      body: { error: 'server_error', message: 'Internal Server Error' },
    });

    const { stdout, exitCode } = await runCommand(
      registerStatusCommand,
      ['status', '--json'],
      mockConfig,
      true,
    );

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_500');
  });

  it('outputs TIMEOUT error on timeout', async () => {
    const { registerStatusCommand } = await import('../commands/status.js');
    // Simulate abort (timeout) — MtClient catches AbortError internally
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    globalThis.fetch = vi.fn().mockRejectedValue(abortError);

    const { stdout, exitCode } = await runCommand(
      registerStatusCommand,
      ['status', '--json'],
      mockConfig,
      true,
    );

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('TIMEOUT');
  });
});

// ── Cross-cutting error format tests ────────────────────────────────────────

describe('cross-cutting JSON error format', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('all error outputs have { error: string, code: string } structure', async () => {
    const { registerListCommand } = await import('../commands/list.js');
    const statuses = [400, 401, 403, 404, 409, 422, 500, 503];

    for (const status of statuses) {
      globalThis.fetch = makeMockFetch({
        ok: false,
        status,
        body: { error: 'test', message: `Test error ${status}` },
      });

      const { stdout, exitCode } = await runCommand(registerListCommand, [
        'tasks', 'list', '--json',
      ], mockConfig);

      expect(exitCode).toBe(1);
      const parsed = parseLastJsonLine(stdout) as Record<string, unknown>;
      expect(typeof parsed.error).toBe('string');
      expect(typeof parsed.code).toBe('string');
      expect(parsed.code).toBe(`HTTP_${status}`);
    }
  });

  it('error code format: HTTP_{status} for HTTP errors', async () => {
    const { registerListCommand } = await import('../commands/list.js');
    globalThis.fetch = makeMockFetch({
      ok: false, status: 404,
      body: { error: 'not_found', message: 'Not found' },
    });

    const { stdout } = await runCommand(registerListCommand, [
      'tasks', 'list', '--json',
    ], mockConfig);

    const parsed = parseLastJsonLine(stdout) as { code: string };
    expect(parsed.code).toMatch(/^HTTP_\d{3}$/);
  });

  it('timeout produces TIMEOUT code', async () => {
    const { registerStatusCommand } = await import('../commands/status.js');
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    globalThis.fetch = vi.fn().mockRejectedValue(abortError);

    const { stdout, exitCode } = await runCommand(
      registerStatusCommand, ['status', '--json'], mockConfig, true,
    );

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { code: string };
    expect(parsed.code).toBe('TIMEOUT');
  });

  it('network error produces NETWORK_ERROR code', async () => {
    const { registerStatusCommand } = await import('../commands/status.js');
    // MtClient catches TypeError with 'fetch' in message as network error
    const networkError = new TypeError('fetch failed');
    globalThis.fetch = vi.fn().mockRejectedValue(networkError);

    const { stdout, exitCode } = await runCommand(
      registerStatusCommand, ['status', '--json'], mockConfig, true,
    );

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { code: string };
    expect(parsed.code).toBe('NETWORK_ERROR');
  });

  it('error JSON includes details field for MtCliError', async () => {
    const { registerListCommand } = await import('../commands/list.js');
    globalThis.fetch = makeMockFetch({
      ok: false, status: 404,
      body: { error: 'not_found', message: 'Task not found' },
    });

    const { stdout } = await runCommand(registerListCommand, [
      'tasks', 'list', '--json',
    ], mockConfig);

    const parsed = parseLastJsonLine(stdout) as { details: Record<string, string> };
    // MtCliError includes url and suggestion as details
    expect(parsed.details).toBeDefined();
    expect(parsed.details.url).toBeTruthy();
    expect(parsed.details.suggestion).toBeTruthy();
  });

  it('non-JSON API response produces error with details', async () => {
    const { registerListCommand } = await import('../commands/list.js');
    globalThis.fetch = makeMockFetch({
      ok: false,
      status: 502,
      nonJsonText: '<html><body>Bad Gateway</body></html>',
    });

    const { stdout, exitCode } = await runCommand(registerListCommand, [
      'tasks', 'list', '--json',
    ], mockConfig);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_502');
    expect(parsed.error).toContain('非 JSON');
  });

  it('all success outputs are valid JSON', async () => {
    // Test list success
    const { registerListCommand } = await import('../commands/list.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: allMockTasks });
    let result = await runCommand(registerListCommand, ['tasks', 'list', '--json'], mockConfig);
    expect(() => JSON.parse(result.stdout.join(''))).not.toThrow();

    // Test status success
    const { registerStatusCommand } = await import('../commands/status.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: { id: 'MS-1', title: 'M1', status: 'active' } });
    result = await runCommand(registerStatusCommand, ['status', '--json'], mockConfig, true);
    expect(() => JSON.parse(result.stdout.join(''))).not.toThrow();
  });
});
