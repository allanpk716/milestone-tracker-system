/**
 * Integration tests for modules list and show CLI commands.
 *
 * Strategy mirrors json-commands.test.ts:
 * - Mock globalThis.fetch for controlled API responses.
 * - Register commands on a Commander program and run the action handler.
 * - Capture stdout/stderr for assertions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import type { ModuleResponse } from '../commands/modules-list.js';

// ── Test Fixtures ───────────────────────────────────────────────────────────

const mockModule1: ModuleResponse = {
  id: 'MOD-1-1',
  milestoneId: 'MS-1',
  name: '用户认证',
  description: 'JWT 认证与授权模块',
  status: 'completed',
  sortOrder: 0,
};

const mockModule2: ModuleResponse = {
  id: 'MOD-1-2',
  milestoneId: 'MS-1',
  name: 'API 网关',
  description: '请求路由与限流',
  status: 'in-progress',
  sortOrder: 1,
};

const mockModule3: ModuleResponse = {
  id: 'MOD-1-3',
  milestoneId: 'MS-1',
  name: '数据持久化',
  description: null,
  status: 'draft',
  sortOrder: 2,
};

const allMockModules: ModuleResponse[] = [mockModule1, mockModule2, mockModule3];

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

async function runModulesCommand(
  registerFn: (parent: Command, getConfig: () => ResolvedConfig) => void,
  args: string[],
  config: ResolvedConfig = mockConfig,
): Promise<{ stdout: string[]; stderr: string[]; exitCode: number }> {
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
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  program.exitOverride();

  const modulesGroup = program.command('modules');
  registerFn(modulesGroup, () => config);

  try {
    await program.parseAsync(argv);
  } catch (e) {
    if (!(e instanceof Error && e.message.startsWith('__process_exit__'))) {
      const exitErr = e as Error & { code?: string };
      if (exitErr.code !== 'commander.exitOverride') throw e;
    }
  }

  stdoutSpy.mockRestore();
  stderrSpy.mockRestore();
  exitSpy.mockRestore();

  return { stdout: stdoutChunks, stderr: stderrChunks, exitCode };
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

// ── modules list --json ────────────────────────────────────────────────────

describe('modules list --json', () => {
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

  it('outputs JSON array with all modules', async () => {
    const { registerModulesListCommand } = await import('../commands/modules-list.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: allMockModules });

    const { stdout, exitCode } = await runModulesCommand(registerModulesListCommand, [
      'modules', 'list', '--json',
    ]);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
    expect((parsed as ModuleResponse[])[0].id).toBe('MOD-1-1');
  });

  it('outputs empty array when no modules', async () => {
    const { registerModulesListCommand } = await import('../commands/modules-list.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: [] });

    const { stdout, exitCode } = await runModulesCommand(registerModulesListCommand, [
      'modules', 'list', '--json',
    ]);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout);
    expect(parsed).toEqual([]);
  });

  it('outputs error JSON on HTTP 401', async () => {
    const { registerModulesListCommand } = await import('../commands/modules-list.js');
    globalThis.fetch = makeMockFetch({
      ok: false, status: 401,
      body: { error: 'unauthorized', message: 'API 密钥无效' },
    });

    const { stdout, exitCode } = await runModulesCommand(registerModulesListCommand, [
      'modules', 'list', '--json',
    ]);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_401');
    expect(parsed.error).toBeTruthy();
  });

  it('outputs error JSON on HTTP 500', async () => {
    const { registerModulesListCommand } = await import('../commands/modules-list.js');
    globalThis.fetch = makeMockFetch({
      ok: false, status: 500,
      body: { error: 'internal', message: '服务器内部错误' },
    });

    const { stdout, exitCode } = await runModulesCommand(registerModulesListCommand, [
      'modules', 'list', '--json',
    ]);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_500');
  });

  it('human-readable mode exits cleanly on success', async () => {
    const { registerModulesListCommand } = await import('../commands/modules-list.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: allMockModules });

    const { exitCode } = await runModulesCommand(registerModulesListCommand, [
      'modules', 'list',
    ]);

    expect(exitCode).toBe(0);
  });

  it('human-readable mode exits cleanly when empty', async () => {
    const { registerModulesListCommand } = await import('../commands/modules-list.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: [] });

    const { exitCode } = await runModulesCommand(registerModulesListCommand, [
      'modules', 'list',
    ]);

    expect(exitCode).toBe(0);
  });
});

// ── modules show --json ────────────────────────────────────────────────────

describe('modules show --json', () => {
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

  it('outputs single module JSON with all fields', async () => {
    const { registerModulesShowCommand } = await import('../commands/modules-show.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: mockModule1 });

    const { stdout, exitCode } = await runModulesCommand(registerModulesShowCommand, [
      'modules', 'show', 'MOD-1-1', '--json',
    ]);

    expect(exitCode).toBe(0);
    const parsed = parseStdoutJson(stdout) as ModuleResponse;
    expect(parsed.id).toBe('MOD-1-1');
    expect(parsed.name).toBe('用户认证');
    expect(parsed.status).toBe('completed');
    expect(parsed.description).toBe('JWT 认证与授权模块');
  });

  it('outputs error JSON on HTTP 404', async () => {
    const { registerModulesShowCommand } = await import('../commands/modules-show.js');
    globalThis.fetch = makeMockFetch({
      ok: false, status: 404,
      body: { error: 'not_found', message: 'Module MOD-99-99 not found' },
    });

    const { stdout, exitCode } = await runModulesCommand(registerModulesShowCommand, [
      'modules', 'show', 'MOD-99-99', '--json',
    ]);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_404');
  });

  it('outputs error JSON on HTTP 401', async () => {
    const { registerModulesShowCommand } = await import('../commands/modules-show.js');
    globalThis.fetch = makeMockFetch({
      ok: false, status: 401,
      body: { error: 'unauthorized', message: 'API 密钥无效' },
    });

    const { stdout, exitCode } = await runModulesCommand(registerModulesShowCommand, [
      'modules', 'show', 'MOD-1-1', '--json',
    ]);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { error: string; code: string };
    expect(parsed.code).toBe('HTTP_401');
  });

  it('human-readable mode exits cleanly on success', async () => {
    const { registerModulesShowCommand } = await import('../commands/modules-show.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: mockModule1 });

    const { exitCode } = await runModulesCommand(registerModulesShowCommand, [
      'modules', 'show', 'MOD-1-1',
    ]);

    expect(exitCode).toBe(0);
  });

  it('human-readable mode handles null description', async () => {
    const { registerModulesShowCommand } = await import('../commands/modules-show.js');
    globalThis.fetch = makeMockFetch({ ok: true, status: 200, body: mockModule3 });

    const { exitCode } = await runModulesCommand(registerModulesShowCommand, [
      'modules', 'show', 'MOD-1-3',
    ]);

    expect(exitCode).toBe(0);
  });

  it('error JSON includes details with url and suggestion', async () => {
    const { registerModulesShowCommand } = await import('../commands/modules-show.js');
    globalThis.fetch = makeMockFetch({
      ok: false, status: 404,
      body: { error: 'not_found', message: 'Module not found' },
    });

    const { stdout, exitCode } = await runModulesCommand(registerModulesShowCommand, [
      'modules', 'show', 'MOD-99-99', '--json',
    ]);

    expect(exitCode).toBe(1);
    const parsed = parseLastJsonLine(stdout) as { details: Record<string, string> };
    expect(parsed.details).toBeDefined();
    expect(parsed.details.url).toBeTruthy();
    expect(parsed.details.suggestion).toBeTruthy();
  });
});
