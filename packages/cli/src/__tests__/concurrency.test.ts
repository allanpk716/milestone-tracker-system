import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MtClient, MtCliError } from '../client.js';
import type { TaskResponse } from '../types.js';

// ── Test Fixtures ───────────────────────────────────────────────────────────

const todoTask: TaskResponse = {
  id: 'TASK-10',
  shortId: 10,
  moduleId: 'MOD-1-1',
  title: '并发领取测试任务',
  description: null,
  references: null,
  status: 'todo',
  assignee: null,
  subTotal: 2,
  subDone: 0,
  progressMessage: null,
  commitHash: null,
  createdAt: '2025-06-01T10:00:00Z',
  updatedAt: '2025-06-01T10:00:00Z',
  reportedAt: null,
};

const inProgressTask: TaskResponse = {
  id: 'TASK-11',
  shortId: 11,
  moduleId: 'MOD-1-1',
  title: '进行中的任务',
  description: null,
  references: null,
  status: 'in-progress',
  assignee: 'agent-alpha',
  subTotal: 3,
  subDone: 1,
  progressMessage: '进行中',
  commitHash: null,
  createdAt: '2025-06-01T10:00:00Z',
  updatedAt: '2025-06-01T10:00:00Z',
  reportedAt: null,
};

const doneTask: TaskResponse = {
  id: 'TASK-12',
  shortId: 12,
  moduleId: 'MOD-1-2',
  title: '已完成的任务',
  description: null,
  references: null,
  status: 'done',
  assignee: 'agent-alpha',
  subTotal: 1,
  subDone: 1,
  progressMessage: '已完成',
  commitHash: 'abc1234',
  createdAt: '2025-05-01T10:00:00Z',
  updatedAt: '2025-05-10T10:00:00Z',
  reportedAt: '2025-05-10T10:00:00Z',
};

const blockedTask: TaskResponse = {
  id: 'TASK-13',
  shortId: 13,
  moduleId: 'MOD-1-2',
  title: '被阻塞的任务',
  description: null,
  references: null,
  status: 'blocked',
  assignee: null,
  subTotal: 0,
  subDone: 0,
  progressMessage: null,
  commitHash: null,
  createdAt: '2025-06-01T10:00:00Z',
  updatedAt: '2025-06-01T10:00:00Z',
  reportedAt: null,
};

const reviewTask: TaskResponse = {
  id: 'TASK-14',
  shortId: 14,
  moduleId: 'MOD-1-3',
  title: '审核中的任务',
  description: null,
  references: null,
  status: 'review',
  assignee: 'agent-beta',
  subTotal: 4,
  subDone: 4,
  progressMessage: '提交审核',
  commitHash: 'def5678',
  createdAt: '2025-06-01T10:00:00Z',
  updatedAt: '2025-06-05T10:00:00Z',
  reportedAt: null,
};

function mockResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(),
  } as Response;
}

// ── Concurrent Claim Tests ──────────────────────────────────────────────────

describe('Concurrent claim verification', () => {
  let originalFetch: typeof globalThis.fetch;
  let callLog: Array<{ method: string; url: string; body: unknown }>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    callLog = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('two agents claiming the same task: one succeeds, one gets 409', async () => {
    // First claim succeeds, second claim returns 409
    let callCount = 0;
    const claimedTask: TaskResponse = {
      ...todoTask,
      status: 'in-progress',
      assignee: 'agent-alpha',
    };

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      callLog.push({
        method: opts.method,
        url: String(url),
        body: opts.body ? JSON.parse(opts.body) : undefined,
      });

      callCount++;
      if (callCount === 1) {
        // First claim → success
        return mockResponse(200, claimedTask);
      }
      // Second claim → 409 conflict
      return mockResponse(409, {
        error: 'conflict',
        message: 'Task already claimed by agent-alpha',
        currentAssignee: 'agent-alpha',
      });
    });

    const client = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'test-key',
    });

    // Agent-alpha claims → success
    const result = await client.post<TaskResponse>('/api/tasks/TASK-10/claim', {
      assignee: 'agent-alpha',
    });
    expect(result.status).toBe('in-progress');
    expect(result.assignee).toBe('agent-alpha');

    // Agent-beta claims same task → 409
    try {
      await client.post<TaskResponse>('/api/tasks/TASK-10/claim', {
        assignee: 'agent-beta',
      });
      expect.unreachable('should have thrown on 409');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      const cliErr = err as MtCliError;
      expect(cliErr.status).toBe(409);
      expect(cliErr.message).toContain('Task already claimed by agent-alpha');
      // Verify Chinese suggestion is present
      expect(cliErr.suggestion).toContain('先查询最新状态');
    }

    // Verify both calls were made to the same endpoint
    expect(callLog).toHaveLength(2);
    expect(callLog[0].url).toBe(callLog[1].url);
  });

  it('concurrent claims via Promise.all: exactly one succeeds', async () => {
    let callCount = 0;
    const claimedByAlpha: TaskResponse = {
      ...todoTask,
      status: 'in-progress',
      assignee: 'agent-alpha',
    };

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return mockResponse(200, claimedByAlpha);
      }
      return mockResponse(409, {
        error: 'conflict',
        message: 'Task already claimed by agent-alpha',
        currentAssignee: 'agent-alpha',
      });
    });

    const clientAlpha = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'key-alpha',
    });
    const clientBeta = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'key-beta',
    });

    const results = await Promise.allSettled([
      clientAlpha.post<TaskResponse>('/api/tasks/TASK-10/claim', {
        assignee: 'agent-alpha',
      }),
      clientBeta.post<TaskResponse>('/api/tasks/TASK-10/claim', {
        assignee: 'agent-beta',
      }),
    ]);

    // One should be fulfilled, one rejected
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // The fulfilled result should have the correct assignee
    if (fulfilled[0].status === 'fulfilled') {
      expect(fulfilled[0].value.assignee).toBe('agent-alpha');
    }

    // The rejected result should be a 409 error
    if (rejected[0].status === 'rejected') {
      expect(rejected[0].reason).toBeInstanceOf(MtCliError);
      expect((rejected[0].reason as MtCliError).status).toBe(409);
    }

    // Exactly 2 calls were made
    expect(callCount).toBe(2);
  });

  it('same agent claiming same task twice: idempotent (no 409)', async () => {
    // Server allows re-claiming by same agent (existing.assignee === data.assignee)
    const claimedTask: TaskResponse = {
      ...todoTask,
      status: 'in-progress',
      assignee: 'agent-alpha',
    };

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, claimedTask));

    const client = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'test-key',
    });

    // Both claims by same agent succeed
    const result1 = await client.post<TaskResponse>('/api/tasks/TASK-10/claim', {
      assignee: 'agent-alpha',
    });
    const result2 = await client.post<TaskResponse>('/api/tasks/TASK-10/claim', {
      assignee: 'agent-alpha',
    });

    expect(result1.assignee).toBe('agent-alpha');
    expect(result2.assignee).toBe('agent-alpha');
  });
});

// ── Claim After Status Change Tests ─────────────────────────────────────────

describe('Claim after status change', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('cannot claim a done task → 400 invalid_status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(400, {
        error: 'invalid_status',
        message: 'Cannot claim task in status: done',
        currentStatus: 'done',
      }),
    );

    const client = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'test-key',
    });

    try {
      await client.post<TaskResponse>('/api/tasks/TASK-12/claim', {
        assignee: 'agent-beta',
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      const cliErr = err as MtCliError;
      expect(cliErr.status).toBe(400);
      expect(cliErr.message).toContain('Cannot claim task in status: done');
    }
  });

  it('cannot claim a skipped task → 400 invalid_status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(400, {
        error: 'invalid_status',
        message: 'Cannot claim task in status: skipped',
        currentStatus: 'skipped',
      }),
    );

    const client = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'test-key',
    });

    try {
      await client.post<TaskResponse>('/api/tasks/TASK-99/claim', {
        assignee: 'agent-beta',
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      expect((err as MtCliError).status).toBe(400);
      expect((err as MtCliError).message).toContain('Cannot claim task in status: skipped');
    }
  });

  it('cannot claim a review task → 400 invalid_status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(400, {
        error: 'invalid_status',
        message: 'Cannot claim task in status: review',
        currentStatus: 'review',
      }),
    );

    const client = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'test-key',
    });

    try {
      await client.post<TaskResponse>('/api/tasks/TASK-14/claim', {
        assignee: 'agent-gamma',
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      expect((err as MtCliError).status).toBe(400);
    }
  });

  it('cannot claim a blocked task → 400 invalid_status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(400, {
        error: 'invalid_status',
        message: 'Cannot claim task in status: blocked',
        currentStatus: 'blocked',
      }),
    );

    const client = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'test-key',
    });

    try {
      await client.post<TaskResponse>('/api/tasks/TASK-13/claim', {
        assignee: 'agent-gamma',
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      expect((err as MtCliError).status).toBe(400);
      expect((err as MtCliError).message).toContain('Cannot claim task in status: blocked');
    }
  });

  it('can claim an in-progress task already assigned to same agent (re-claim)', async () => {
    // Re-claiming an in-progress task assigned to same agent should succeed
    const updatedTask: TaskResponse = {
      ...inProgressTask,
    };

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, updatedTask));

    const client = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'test-key',
    });

    const result = await client.post<TaskResponse>('/api/tasks/TASK-11/claim', {
      assignee: 'agent-alpha',
    });
    expect(result.assignee).toBe('agent-alpha');
    expect(result.status).toBe('in-progress');
  });

  it('cannot claim in-progress task assigned to another agent → 409', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(409, {
        error: 'conflict',
        message: 'Task already claimed by agent-alpha',
        currentAssignee: 'agent-alpha',
      }),
    );

    const client = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'test-key',
    });

    try {
      await client.post<TaskResponse>('/api/tasks/TASK-11/claim', {
        assignee: 'agent-beta',
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      const cliErr = err as MtCliError;
      expect(cliErr.status).toBe(409);
      expect(cliErr.message).toContain('Task already claimed by agent-alpha');
    }
  });

  it('claiming non-existent task → 404', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(404, {
        error: 'not_found',
        message: 'Task TASK-9999 not found',
      }),
    );

    const client = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'test-key',
    });

    try {
      await client.post<TaskResponse>('/api/tasks/TASK-9999/claim', {
        assignee: 'agent-alpha',
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      expect((err as MtCliError).status).toBe(404);
      expect((err as MtCliError).message).toContain('Task TASK-9999 not found');
    }
  });
});

// ── Claim with Invalid Input Tests ──────────────────────────────────────────

describe('Claim with invalid inputs', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('claim with empty task ID: server returns 404', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(404, {
        error: 'not_found',
        message: 'Task  not found',
      }),
    );

    const client = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'test-key',
    });

    try {
      await client.post<TaskResponse>('/api/tasks//claim', {
        assignee: 'agent-alpha',
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      expect((err as MtCliError).status).toBe(404);
    }
  });

  it('claim with missing assignee → server returns 400 validation error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(400, {
        error: 'validation_error',
        message: 'Validation failed',
        details: [
          { field: 'assignee', message: 'Required' },
        ],
      }),
    );

    const client = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'test-key',
    });

    try {
      await client.post<TaskResponse>('/api/tasks/TASK-10/claim', {});
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      expect((err as MtCliError).status).toBe(400);
    }
  });

  it('unauthenticated claim → 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(401, {
        error: 'unauthorized',
        message: 'Invalid or missing API key',
      }),
    );

    const client = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'invalid-key',
    });

    try {
      await client.post<TaskResponse>('/api/tasks/TASK-10/claim', {
        assignee: 'agent-alpha',
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      expect((err as MtCliError).status).toBe(401);
      expect((err as MtCliError).message).toContain('Invalid or missing API key');
    }
  });
});

// ── Optimistic Lock Behavior Tests ──────────────────────────────────────────

describe('Optimistic lock behavior', () => {
  it('server conflict response includes currentAssignee field', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(409, {
        error: 'conflict',
        message: 'Task already claimed by agent-charlie',
        currentAssignee: 'agent-charlie',
      }),
    );

    const client = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'test-key',
    });

    try {
      await client.post<TaskResponse>('/api/tasks/TASK-10/claim', {
        assignee: 'agent-delta',
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      const cliErr = err as MtCliError;
      // The message from server includes the current assignee name
      expect(cliErr.message).toContain('agent-charlie');
      // Suggestion tells agent to refresh and retry
      expect(cliErr.suggestion).toContain('先查询最新状态');
    }
  });

  it('server conflict response includes task data for inspection', async () => {
    const conflictResponse = mockResponse(409, {
      error: 'conflict',
      message: 'Task already claimed by agent-alpha',
      currentAssignee: 'agent-alpha',
      task: {
        ...todoTask,
        status: 'in-progress',
        assignee: 'agent-alpha',
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue(conflictResponse);

    const client = new MtClient({
      baseUrl: 'http://localhost:5173',
      apiKey: 'test-key',
    });

    try {
      await client.post<TaskResponse>('/api/tasks/TASK-10/claim', {
        assignee: 'agent-beta',
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      // The error message is from the server's 'message' field
      expect((err as MtCliError).message).toContain('agent-alpha');
    }
  });
});
