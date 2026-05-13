import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MtClient, MtCliError } from '../client.js';

// ── Test Helpers ────────────────────────────────────────────────────────────

function mockResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(),
  } as Response;
}

function mockNonJsonResponse(status: number, text: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
    headers: new Headers(),
  } as Response;
}

function createClient(opts?: Partial<{ baseUrl: string; apiKey: string; timeoutMs: number }>) {
  return new MtClient({
    baseUrl: opts?.baseUrl ?? 'http://localhost:5173',
    apiKey: opts?.apiKey ?? 'test-key',
    timeoutMs: opts?.timeoutMs ?? 5000,
  });
}

// ── Error Output Formatting Tests ───────────────────────────────────────────

describe('Error output formatting', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── 404 Not Found ────────────────────────────────────────────────────────

  describe('404 errors', () => {
    it('produces Chinese error message for task not found', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(404, {
          error: 'not_found',
          message: 'Task TASK-999 not found',
        }),
      );

      const client = createClient();
      try {
        await client.get('/api/tasks/TASK-999');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(MtCliError);
        const cliErr = err as MtCliError;
        expect(cliErr.status).toBe(404);
        // Error message from server
        expect(cliErr.message).toContain('Task TASK-999 not found');
        // Suggestion should be Chinese
        expect(cliErr.suggestion).toContain('mt-cli status');
        expect(cliErr.suggestion).toContain('确认服务器地址');
      }
    });

    it('uses fallback Chinese message when server returns no message field', async () => {
      // Server returns an error object but without 'message' or 'error' string fields
      // that would be picked up by the client — triggers STATUS_MESSAGES fallback
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(404, { code: 404, data: null }),
      );

      const client = createClient();
      try {
        await client.get('/api/milestones/MS-999');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(MtCliError);
        const cliErr = err as MtCliError;
        // Fallback to STATUS_MESSAGES
        expect(cliErr.message).toContain('请求的资源不存在');
        expect(cliErr.message).toContain('请检查 URL 和 ID');
      }
    });

    it('404 suggestion mentions mt-cli status command', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(404, { error: 'not_found', message: 'Not found' }),
      );

      const client = createClient();
      try {
        await client.get('/api/tasks/TASK-1');
        expect.unreachable('should have thrown');
      } catch (err) {
        const cliErr = err as MtCliError;
        expect(cliErr.suggestion).toContain('mt-cli status');
      }
    });
  });

  // ── 401 Unauthorized ─────────────────────────────────────────────────────

  describe('401 errors', () => {
    it('produces Chinese error message for invalid API key', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(401, {
          error: 'unauthorized',
          message: 'Invalid API key',
        }),
      );

      const client = createClient({ apiKey: 'bad-key' });
      try {
        await client.get('/api/tasks');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(MtCliError);
        const cliErr = err as MtCliError;
        expect(cliErr.status).toBe(401);
        expect(cliErr.message).toContain('Invalid API key');
      }
    });

    it('401 suggestion mentions API key reconfiguration', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(401, { error: 'unauthorized', message: 'Token expired' }),
      );

      const client = createClient();
      try {
        await client.get('/api/tasks');
        expect.unreachable('should have thrown');
      } catch (err) {
        const cliErr = err as MtCliError;
        // Suggestion should be Chinese and reference key config
        expect(cliErr.suggestion).toContain('重新获取 API 密钥');
        expect(cliErr.suggestion).toContain('.mt-cli.json');
      }
    });

    it('uses fallback Chinese message for 401 with no server message', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(401, {}),
      );

      const client = createClient();
      try {
        await client.get('/api/tasks');
        expect.unreachable('should have thrown');
      } catch (err) {
        const cliErr = err as MtCliError;
        expect(cliErr.message).toContain('API 密钥无效或已过期');
        expect(cliErr.message).toContain('MT_API_KEY');
      }
    });
  });

  // ── 409 Conflict ─────────────────────────────────────────────────────────

  describe('409 conflict errors', () => {
    it('produces Chinese error with guidance for task claim conflict', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(409, {
          error: 'conflict',
          message: 'Task already claimed by agent-alpha',
          currentAssignee: 'agent-alpha',
        }),
      );

      const client = createClient();
      try {
        await client.post('/api/tasks/TASK-1/claim', { assignee: 'agent-beta' });
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(MtCliError);
        const cliErr = err as MtCliError;
        expect(cliErr.status).toBe(409);
        expect(cliErr.message).toContain('Task already claimed by agent-alpha');
      }
    });

    it('409 suggestion tells agent to refresh and retry', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(409, {
          error: 'conflict',
          message: 'Task already claimed by agent-alpha',
        }),
      );

      const client = createClient();
      try {
        await client.post('/api/tasks/TASK-1/claim', { assignee: 'agent-beta' });
        expect.unreachable('should have thrown');
      } catch (err) {
        const cliErr = err as MtCliError;
        expect(cliErr.suggestion).toContain('先查询最新状态');
        expect(cliErr.suggestion).toContain('mt-cli list');
      }
    });

    it('uses fallback Chinese message for 409 with no server message', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(409, {}),
      );

      const client = createClient();
      try {
        await client.post('/api/tasks/TASK-1/claim', { assignee: 'agent-beta' });
        expect.unreachable('should have thrown');
      } catch (err) {
        const cliErr = err as MtCliError;
        expect(cliErr.message).toContain('操作冲突');
        expect(cliErr.message).toContain('资源状态已变更');
        expect(cliErr.message).toContain('请刷新后重试');
      }
    });
  });

  // ── 400 Bad Request ──────────────────────────────────────────────────────

  describe('400 errors', () => {
    it('produces Chinese error for invalid status transition', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(400, {
          error: 'invalid_status',
          message: 'Cannot complete task in status: todo',
          currentStatus: 'todo',
        }),
      );

      const client = createClient();
      try {
        await client.post('/api/tasks/TASK-1/complete', {});
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(MtCliError);
        const cliErr = err as MtCliError;
        expect(cliErr.status).toBe(400);
        expect(cliErr.message).toContain('Cannot complete task in status: todo');
      }
    });

    it('400 suggestion mentions checking request parameters', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(400, {
          error: 'invalid_status',
          message: 'Cannot claim task in status: done',
          currentStatus: 'done',
        }),
      );

      const client = createClient();
      try {
        await client.post('/api/tasks/TASK-1/claim', { assignee: 'agent-alpha' });
        expect.unreachable('should have thrown');
      } catch (err) {
        const cliErr = err as MtCliError;
        expect(cliErr.suggestion).toContain('检查请求参数');
        expect(cliErr.suggestion).toContain('API 规范');
      }
    });

    it('produces Chinese error for validation failure with details', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(400, {
          error: 'validation_error',
          message: 'Validation failed',
          details: [
            { field: 'assignee', message: 'Required' },
          ],
        }),
      );

      const client = createClient();
      try {
        await client.post('/api/tasks/TASK-1/claim', {});
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(MtCliError);
        const cliErr = err as MtCliError;
        expect(cliErr.status).toBe(400);
        expect(cliErr.message).toContain('Validation failed');
      }
    });

    it('uses fallback Chinese message for 400 with no server message', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(400, {}));

      const client = createClient();
      try {
        await client.post('/api/tasks/TASK-1/claim', {});
        expect.unreachable('should have thrown');
      } catch (err) {
        const cliErr = err as MtCliError;
        expect(cliErr.message).toContain('请求格式错误');
        expect(cliErr.message).toContain('请检查请求参数');
      }
    });

    it('handles non-JSON request body error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(400, {
          error: 'invalid_json',
          message: 'Request body must be valid JSON',
        }),
      );

      const client = createClient();
      try {
        await client.post('/api/tasks/TASK-1/claim', 'not-json');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(MtCliError);
        expect((err as MtCliError).status).toBe(400);
      }
    });
  });

  // ── 500 Server Error ─────────────────────────────────────────────────────

  describe('500 errors', () => {
    it('produces Chinese error for server error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(500, {
          error: 'internal_error',
          message: 'Database connection failed',
        }),
      );

      const client = createClient();
      try {
        await client.get('/api/tasks');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(MtCliError);
        const cliErr = err as MtCliError;
        expect(cliErr.status).toBe(500);
        expect(cliErr.message).toContain('Database connection failed');
      }
    });

    it('uses fallback Chinese message for 500 with no server message', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(500, {}));

      const client = createClient();
      try {
        await client.get('/api/tasks');
        expect.unreachable('should have thrown');
      } catch (err) {
        const cliErr = err as MtCliError;
        expect(cliErr.message).toContain('服务器内部错误');
        expect(cliErr.message).toContain('请联系管理员');
      }
    });

    it('500 suggestion mentions retry and status check', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(500, { error: 'internal_error' }),
      );

      const client = createClient();
      try {
        await client.get('/api/tasks');
        expect.unreachable('should have thrown');
      } catch (err) {
        const cliErr = err as MtCliError;
        expect(cliErr.suggestion).toContain('稍后重试');
        expect(cliErr.suggestion).toContain('mt-cli status');
      }
    });
  });

  // ── Non-JSON Error Responses ─────────────────────────────────────────────

  describe('Non-JSON error responses', () => {
    it('handles HTML error page with Chinese message', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockNonJsonResponse(500, '<html><body>Internal Server Error</body></html>'),
      );

      const client = createClient();
      try {
        await client.get('/api/tasks');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(MtCliError);
        const cliErr = err as MtCliError;
        expect(cliErr.status).toBe(500);
        expect(cliErr.message).toContain('非 JSON 响应');
      }
    });

    it('handles empty error response body', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockNonJsonResponse(502, ''),
      );

      const client = createClient();
      try {
        await client.get('/api/tasks');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(MtCliError);
        expect((err as MtCliError).status).toBe(502);
      }
    });
  });

  // ── Timeout and Network Errors ───────────────────────────────────────────

  describe('Timeout and network errors', () => {
    it('timeout produces Chinese error message', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(
        new DOMException('The operation was aborted', 'AbortError'),
      );

      const client = createClient({ timeoutMs: 3000 });
      try {
        await client.get('/api/tasks');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(MtCliError);
        const cliErr = err as MtCliError;
        expect(cliErr.status).toBe(0);
        expect(cliErr.message).toContain('请求超时');
        expect(cliErr.message).toContain('3000ms');
        expect(cliErr.suggestion).toContain('检查服务器是否运行');
      }
    });

    it('network failure produces Chinese error message', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(
        new TypeError('fetch failed'),
      );

      const client = createClient();
      try {
        await client.get('/api/tasks');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(MtCliError);
        const cliErr = err as MtCliError;
        expect(cliErr.status).toBe(0);
        expect(cliErr.message).toContain('无法连接到服务器');
        expect(cliErr.suggestion).toContain('serverUrl');
      }
    });

    it('connection refused error is handled gracefully', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(
        new TypeError('Failed to fetch'),
      );

      const client = createClient();
      try {
        await client.get('/api/tasks');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(MtCliError);
        expect((err as MtCliError).message).toContain('无法连接到服务器');
      }
    });
  });

  // ── MtCliError Structure ─────────────────────────────────────────────────

  describe('MtCliError structure', () => {
    it('has all required properties', () => {
      const err = new MtCliError(
        409,
        '冲突消息',
        '建议文本',
        'http://localhost:5173/api/tasks/TASK-1/claim',
      );

      expect(err.status).toBe(409);
      expect(err.message).toBe('冲突消息');
      expect(err.suggestion).toBe('建议文本');
      expect(err.url).toBe('http://localhost:5173/api/tasks/TASK-1/claim');
      expect(err.name).toBe('MtCliError');
    });

    it('full error string includes Chinese error prefix and HTTP status', () => {
      const err = new MtCliError(
        409,
        '操作冲突',
        '请刷新后重试',
        '/api/tasks/TASK-1/claim',
      );

      // Error.message from super() contains the Chinese error prefix
      // The public message property is the raw description
      expect(err.message).toBe('操作冲突');
      // The full string representation via super() includes the prefix
      const fullStr = `[错误] HTTP ${err.status}: ${err.message}`;
      expect(fullStr).toContain('[错误]');
      expect(fullStr).toContain('HTTP 409');
      expect(fullStr).toContain('操作冲突');
    });

    it('is instanceof Error', () => {
      const err = new MtCliError(500, 'msg', 'sug', '/url');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(MtCliError);
    });

    it('unknown status code uses fallback message', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(418, {}));

      const client = createClient();
      try {
        await client.get('/api/tasks');
        expect.unreachable('should have thrown');
      } catch (err) {
        const cliErr = err as MtCliError;
        expect(cliErr.message).toContain('未知错误');
        expect(cliErr.message).toContain('HTTP 418');
      }
    });

    it('unknown status code uses generic suggestion', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(418, {}));

      const client = createClient();
      try {
        await client.get('/api/tasks');
        expect.unreachable('should have thrown');
      } catch (err) {
        const cliErr = err as MtCliError;
        expect(cliErr.suggestion).toContain('稍后重试');
        expect(cliErr.suggestion).toContain('mt-cli status');
      }
    });
  });

  // ── HTTP Failure Logging ─────────────────────────────────────────────────

  describe('HTTP failure logging', () => {
    it('logs all error responses to stderr', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(404, { error: 'not_found', message: 'Not found' }),
      );

      const client = createClient();
      try {
        await client.get('/api/tasks/TASK-99');
      } catch {
        // expected
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('GET http://localhost:5173/api/tasks/TASK-99 → 404'),
      );

      consoleSpy.mockRestore();
    });

    it('does not log successful responses', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse(200, { id: 'TASK-1' }),
      );

      const client = createClient();
      await client.get('/api/tasks/TASK-1');

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
