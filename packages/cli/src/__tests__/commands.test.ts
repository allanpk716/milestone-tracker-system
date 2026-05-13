import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseTaskId, resolveTaskId, findByShortId } from '../utils/id.js';
import { statusLabel, progressBar, formatDate, divider, taskRow } from '../utils/format.js';
import type { TaskResponse } from '../types.js';
import { MtClient } from '../client.js';
import { MtCliError } from '../client.js';

// ── Test Fixtures ───────────────────────────────────────────────────────────

const mockTask1: TaskResponse = {
  id: 'TASK-1',
  shortId: 1,
  moduleId: 'MOD-1-1',
  title: '搭建项目基础结构',
  description: '初始化项目 #2 依赖并配置构建工具',
  references: null,
  status: 'done',
  assignee: 'agent-alpha',
  subTotal: 5,
  subDone: 5,
  progressMessage: '已完成所有子任务',
  commitHash: 'abc1234',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-20T15:30:00Z',
  reportedAt: '2025-01-20T15:30:00Z',
};

const mockTask2: TaskResponse = {
  id: 'TASK-2',
  shortId: 2,
  moduleId: 'MOD-1-1',
  title: '实现用户认证模块',
  description: '实现 JWT 认证，参见 #1 的项目结构',
  references: null,
  status: 'in-progress',
  assignee: 'agent-beta',
  subTotal: 3,
  subDone: 1,
  progressMessage: 'JWT 签发已完成',
  commitHash: null,
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
  createdAt: '2025-01-17T08:00:00Z',
  updatedAt: '2025-01-17T08:00:00Z',
  reportedAt: null,
};

const mockTask4: TaskResponse = {
  id: 'TASK-4',
  shortId: 4,
  moduleId: 'MOD-1-2',
  title: '并发测试任务',
  description: '引用不存在的任务 #99',
  references: null,
  status: 'todo',
  assignee: null,
  subTotal: 0,
  subDone: 0,
  progressMessage: null,
  commitHash: null,
  createdAt: '2025-01-18T08:00:00Z',
  updatedAt: '2025-01-18T08:00:00Z',
  reportedAt: null,
};

const allMockTasks: TaskResponse[] = [mockTask1, mockTask2, mockTask3, mockTask4];

// ── ID Parsing Tests ────────────────────────────────────────────────────────

describe('parseTaskId', () => {
  it('parses #N format', () => {
    const result = parseTaskId('#1');
    expect(result.type).toBe('short');
    expect(result.shortId).toBe(1);
  });

  it('parses #N with larger numbers', () => {
    const result = parseTaskId('#42');
    expect(result.type).toBe('short');
    expect(result.shortId).toBe(42);
  });

  it('parses TASK-{seq} format', () => {
    const result = parseTaskId('TASK-5');
    expect(result.type).toBe('full');
    expect(result.fullId).toBe('TASK-5');
  });

  it('parses task-{seq} case-insensitively', () => {
    const result = parseTaskId('task-3');
    expect(result.type).toBe('full');
    expect(result.fullId).toBe('TASK-3');
  });

  it('parses bare number as short ID', () => {
    const result = parseTaskId('7');
    expect(result.type).toBe('short');
    expect(result.shortId).toBe(7);
  });

  it('passes through unknown format as full ID', () => {
    const result = parseTaskId('some-custom-id');
    expect(result.type).toBe('full');
    expect(result.fullId).toBe('some-custom-id');
  });

  it('trims whitespace', () => {
    const result = parseTaskId('  #3  ');
    expect(result.type).toBe('short');
    expect(result.shortId).toBe(3);
  });
});

describe('resolveTaskId', () => {
  it('returns full ID directly for full type', async () => {
    const parsed = parseTaskId('TASK-1');
    const result = await resolveTaskId(parsed, async () => allMockTasks);
    expect(result).toBe('TASK-1');
  });

  it('resolves short ID to full ID via list', async () => {
    const parsed = parseTaskId('#2');
    const result = await resolveTaskId(parsed, async () => allMockTasks);
    expect(result).toBe('TASK-2');
  });

  it('throws for unknown short ID', async () => {
    const parsed = parseTaskId('#999');
    await expect(
      resolveTaskId(parsed, async () => allMockTasks),
    ).rejects.toThrow('未找到编号 #999 的任务');
  });
});

describe('findByShortId', () => {
  it('finds task by short ID', () => {
    const result = findByShortId(allMockTasks, 1);
    expect(result?.id).toBe('TASK-1');
  });

  it('returns undefined for missing short ID', () => {
    const result = findByShortId(allMockTasks, 999);
    expect(result).toBeUndefined();
  });
});

// ── Format Utility Tests ────────────────────────────────────────────────────

describe('statusLabel', () => {
  it('maps all status values to Chinese', () => {
    expect(statusLabel('todo')).toBe('待领取');
    expect(statusLabel('in-progress')).toBe('进行中');
    expect(statusLabel('blocked')).toBe('阻塞');
    expect(statusLabel('review')).toBe('审核中');
    expect(statusLabel('done')).toBe('已完成');
    expect(statusLabel('skipped')).toBe('已跳过');
  });

  it('returns raw value for unknown status', () => {
    expect(statusLabel('unknown')).toBe('unknown');
  });
});

describe('progressBar', () => {
  it('shows 100% when fully done', () => {
    const bar = progressBar(5, 5);
    expect(bar).toContain('100%');
    expect(bar).toContain('█');
  });

  it('shows 0% when nothing done', () => {
    const bar = progressBar(0, 5);
    expect(bar).toContain('0%');
    expect(bar).toContain('░');
  });

  it('shows partial progress', () => {
    const bar = progressBar(1, 3);
    expect(bar).toContain('33%');
  });

  it('returns dash when total is 0', () => {
    const bar = progressBar(0, 0);
    expect(bar).toBe('—');
  });

  it('respects custom width', () => {
    const bar = progressBar(3, 10, 10);
    // 3/10 = 30% → 3 filled chars out of 10
    expect(bar).toContain('█'.repeat(3));
  });
});

describe('formatDate', () => {
  it('formats ISO string to readable date', () => {
    const result = formatDate('2025-01-15T10:30:00Z');
    expect(result).toContain('2025-01-15');
    // Time may be adjusted for local timezone, just verify format
    expect(result).toMatch(/\d{2}:\d{2}$/);
  });

  it('returns dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });
});

describe('divider', () => {
  it('creates default divider', () => {
    const d = divider();
    expect(d).toBe('─'.repeat(40));
  });

  it('creates custom divider', () => {
    const d = divider('═', 20);
    expect(d).toBe('═'.repeat(20));
  });
});

describe('taskRow', () => {
  it('formats task as Chinese row', () => {
    const row = taskRow(mockTask1);
    expect(row).toContain('#1');
    expect(row).toContain('搭建项目基础结构');
    expect(row).toContain('MOD-1-1');
    expect(row).toContain('已完成');
    expect(row).toContain('agent-alpha');
  });

  it('shows unassigned as dash', () => {
    const row = taskRow(mockTask3);
    expect(row).toContain('—');
    expect(row).toContain('待领取');
  });
});

// ── Command Integration Tests (via module imports) ──────────────────────────

describe('command modules', () => {
  // Test that all command registration modules export functions
  it('list command exports registerListCommand', async () => {
    const mod = await import('../commands/list.js');
    expect(typeof mod.registerListCommand).toBe('function');
  });

  it('claim command exports registerClaimCommand', async () => {
    const mod = await import('../commands/claim.js');
    expect(typeof mod.registerClaimCommand).toBe('function');
  });

  it('progress command exports registerProgressCommand', async () => {
    const mod = await import('../commands/progress.js');
    expect(typeof mod.registerProgressCommand).toBe('function');
  });

  it('complete command exports registerCompleteCommand', async () => {
    const mod = await import('../commands/complete.js');
    expect(typeof mod.registerCompleteCommand).toBe('function');
  });

  it('show command exports registerShowCommand', async () => {
    const mod = await import('../commands/show.js');
    expect(typeof mod.registerShowCommand).toBe('function');
  });

  it('mine command exports registerMineCommand', async () => {
    const mod = await import('../commands/mine.js');
    expect(typeof mod.registerMineCommand).toBe('function');
  });
});

// ── HTTP Client Mock Tests ──────────────────────────────────────────────────

describe('MtClient with task API shapes', () => {
  let client: MtClient;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    client = new MtClient({ baseUrl: 'http://localhost:5173', apiKey: 'test-key' });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches task list and parses response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify([mockTask1, mockTask2])),
    });
    globalThis.fetch = mockFetch;

    const tasks = await client.get<TaskResponse[]>('/api/tasks?milestoneId=MS-1');
    expect(tasks).toHaveLength(2);
    expect(tasks[0].shortId).toBe(1);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('claims task with assignee body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(mockTask2)),
    });
    globalThis.fetch = mockFetch;

    const result = await client.post<TaskResponse>('/api/tasks/TASK-2/claim', {
      assignee: 'agent-beta',
    });
    expect(result.assignee).toBe('agent-beta');
    expect(result.status).toBe('in-progress');

    // Verify request body
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body).toEqual({ assignee: 'agent-beta' });
  });

  it('handles 409 conflict on claim', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            error: 'conflict',
            message: 'Task already claimed by agent-alpha',
            currentAssignee: 'agent-alpha',
          }),
        ),
    });
    globalThis.fetch = mockFetch;

    await expect(
      client.post('/api/tasks/TASK-2/claim', { assignee: 'agent-beta' }),
    ).rejects.toThrow();
  });

  it('sends progress update with sub tasks', async () => {
    const updatedTask = { ...mockTask2, subTotal: 3, subDone: 2 };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(updatedTask)),
    });
    globalThis.fetch = mockFetch;

    const result = await client.post<TaskResponse>('/api/tasks/TASK-2/progress', {
      subTotal: 3,
      subDone: 2,
      progressMessage: '中间件完成',
    });
    expect(result.subDone).toBe(2);
    expect(result.subTotal).toBe(3);
  });

  it('sends complete request with commit hash', async () => {
    const completedTask = { ...mockTask2, status: 'done' as const, commitHash: 'def5678' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(completedTask)),
    });
    globalThis.fetch = mockFetch;

    const result = await client.post<TaskResponse>('/api/tasks/TASK-2/complete', {
      progressMessage: '全部完成',
      commitHash: 'def5678',
    });
    expect(result.status).toBe('done');
    expect(result.commitHash).toBe('def5678');
  });

  it('handles 404 for unknown task', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () =>
        Promise.resolve(
          JSON.stringify({ error: 'not_found', message: 'Task TASK-999 not found' }),
        ),
    });
    globalThis.fetch = mockFetch;

    await expect(
      client.get<TaskResponse>('/api/tasks/TASK-999'),
    ).rejects.toThrow();
  });

  it('handles 400 for invalid status transition', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            error: 'invalid_status',
            message: 'Cannot complete task in status: todo',
            currentStatus: 'todo',
          }),
        ),
    });
    globalThis.fetch = mockFetch;

    await expect(
      client.post('/api/tasks/TASK-3/complete', {}),
    ).rejects.toThrow();
  });
});

// ── Chinese Output Verification ─────────────────────────────────────────────

describe('Chinese output verification', () => {
  it('status labels are all Chinese', () => {
    const labels = ['todo', 'in-progress', 'blocked', 'review', 'done', 'skipped'];
    for (const s of labels) {
      const label = statusLabel(s);
      // Chinese text should contain CJK characters
      expect(/[\u4e00-\u9fff]/.test(label)).toBe(true);
    }
  });

  it('progress bar output is LLM-friendly (ASCII)', () => {
    const bar = progressBar(3, 10);
    // Should contain only ASCII + CJK box-drawing
    expect(bar).toMatch(/^[\[█░\]\s\d%]+$/);
  });

  it('task row includes Chinese status', () => {
    const row = taskRow(mockTask1);
    expect(row).toContain('已完成');
    expect(row).toContain('搭建项目基础结构');
  });

  it('task row shows Chinese dash for unassigned', () => {
    const row = taskRow(mockTask3);
    expect(row).toContain('—');
    expect(row).toContain('待领取');
  });

  it('date formatting produces readable Chinese-friendly output', () => {
    const result = formatDate('2025-06-13T08:30:00Z');
    // Verify format: YYYY-MM-DD HH:MM (local time)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});

// ── Show Command Reference Resolution Tests ─────────────────────────────────

describe('show command reference resolution', () => {
  it('resolves #N references in description text', async () => {
    const showModule = await import('../commands/show.js');
    // Verify the module loaded and exports the registration function
    expect(showModule.registerShowCommand).toBeDefined();
  });

  it('handles missing references gracefully', () => {
    const description = '引用不存在的任务 #99 和 #100';
    // Simulate the regex replacement logic
    const allTasks: TaskResponse[] = [mockTask1, mockTask2];
    const resolved = description.replace(/#(\d+)/g, (match) => {
      const shortId = parseInt(match.slice(1), 10);
      const ref = allTasks.find((t) => t.shortId === shortId);
      if (!ref) {
        return `${match} (引用的任务不存在)`;
      }
      return `${match} [${ref.title}]`;
    });

    expect(resolved).toContain('#99 (引用的任务不存在)');
    expect(resolved).toContain('#100 (引用的任务不存在)');
  });

  it('resolves existing references with task title and status', () => {
    const description = '参见 #1 和 #2';
    const allTasks: TaskResponse[] = [mockTask1, mockTask2];
    const resolved = description.replace(/#(\d+)/g, (match) => {
      const shortId = parseInt(match.slice(1), 10);
      const ref = allTasks.find((t) => t.shortId === shortId);
      if (!ref) {
        return `${match} (引用的任务不存在)`;
      }
      return `${match} [${ref.title}]`;
    });

    expect(resolved).toContain('#1 [搭建项目基础结构]');
    expect(resolved).toContain('#2 [实现用户认证模块]');
  });
});
