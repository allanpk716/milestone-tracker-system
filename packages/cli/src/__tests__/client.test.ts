import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MtClient, MtCliError } from '../client.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('MtClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createClient(opts?: Partial<{ baseUrl: string; apiKey: string; timeoutMs: number }>) {
    return new MtClient({
      baseUrl: opts?.baseUrl ?? 'http://localhost:5173',
      apiKey: opts?.apiKey ?? 'test-key',
      timeoutMs: opts?.timeoutMs ?? 5000,
    });
  }

  function mockResponse(status: number, body: unknown) {
    return {
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(JSON.stringify(body)),
      headers: new Headers(),
    } as Response;
  }

  // ── Bearer Token Injection ──────────────────────────────────────────────

  it('sends Authorization Bearer header on requests', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'MS-1', title: 'Test' }));

    const client = createClient({ apiKey: 'my-secret-key' });
    await client.get('/api/milestones/MS-1');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5173/api/milestones/MS-1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-secret-key',
        }),
      }),
    );
  });

  it('sends Content-Type and Accept headers', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { ok: true }));

    const client = createClient();
    await client.post('/api/tasks', { title: 'test' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
      }),
    );
  });

  // ── Success responses ──────────────────────────────────────────────────

  it('parses JSON response body on success', async () => {
    const data = { id: 'MS-1', title: 'Milestone One', status: 'active' };
    mockFetch.mockResolvedValue(mockResponse(200, data));

    const client = createClient();
    const result = await client.get('/api/milestones/MS-1');

    expect(result).toEqual(data);
  });

  it('serializes body as JSON for POST requests', async () => {
    mockFetch.mockResolvedValue(mockResponse(201, { id: 'TASK-1' }));

    const client = createClient();
    await client.post('/api/tasks', { title: 'New Task', assignee: 'agent-1' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ title: 'New Task', assignee: 'agent-1' }),
      }),
    );
  });

  // ── 401 Handling ───────────────────────────────────────────────────────

  it('throws MtCliError with Chinese message on 401', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(401, { error: 'unauthorized', message: 'Invalid API key' }),
    );

    const client = createClient();
    await expect(client.get('/api/tasks')).rejects.toThrow(MtCliError);
    await expect(client.get('/api/tasks')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid API key',
    });
  });

  it('includes suggestion in MtCliError on 401', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(401, { error: 'unauthorized', message: 'Token expired' }),
    );

    const client = createClient();
    try {
      await client.get('/api/tasks');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      expect((err as MtCliError).suggestion).toContain('重新获取 API 密钥');
    }
  });

  // ── 409 Conflict ───────────────────────────────────────────────────────

  it('throws MtCliError with conflict message on 409', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(409, { error: 'conflict', message: 'Task already claimed by another agent' }),
    );

    const client = createClient();
    try {
      await client.post('/api/tasks/TASK-1/claim', { assignee: 'agent-1' });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      expect((err as MtCliError).status).toBe(409);
      expect((err as MtCliError).message).toContain('Task already claimed');
    }
  });

  // ── Timeout Handling ───────────────────────────────────────────────────

  it('throws MtCliError on timeout', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    mockFetch.mockRejectedValue(abortError);

    const client = createClient({ timeoutMs: 100 });
    try {
      await client.get('/api/milestones/MS-1');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      expect((err as MtCliError).status).toBe(0);
      expect((err as MtCliError).message).toContain('请求超时');
    }
  });

  // ── Connection Error ───────────────────────────────────────────────────

  it('throws MtCliError on network failure', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));

    const client = createClient();
    try {
      await client.get('/api/milestones/MS-1');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      expect((err as MtCliError).status).toBe(0);
      expect((err as MtCliError).message).toContain('无法连接到服务器');
    }
  });

  // ── Malformed Response ─────────────────────────────────────────────────

  it('throws error on non-JSON response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<html>Not JSON</html>'),
    } as Response);

    const client = createClient();
    await expect(client.get('/api/milestones/MS-1')).rejects.toThrow('无法解析服务器响应');
  });

  it('throws MtCliError on non-JSON error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    } as Response);

    const client = createClient();
    try {
      await client.get('/api/milestones/MS-1');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MtCliError);
      expect((err as MtCliError).status).toBe(500);
      expect((err as MtCliError).message).toContain('非 JSON 响应');
    }
  });

  // ── Logging ────────────────────────────────────────────────────────────

  it('logs request URL and status on failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockResolvedValue(
      mockResponse(404, { error: 'not_found', message: 'Milestone MS-99 not found' }),
    );

    const client = createClient();
    try {
      await client.get('/api/milestones/MS-99');
    } catch {
      // expected
    }

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('GET http://localhost:5173/api/milestones/MS-99 → 404'),
    );
    consoleSpy.mockRestore();
  });

  // ── Base URL normalization ─────────────────────────────────────────────

  it('strips trailing slashes from base URL', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { ok: true }));

    const client = createClient({ baseUrl: 'http://localhost:5173/' });
    await client.get('/api/tasks');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5173/api/tasks',
      expect.anything(),
    );
  });

  // ── PATCH method ───────────────────────────────────────────────────────

  it('sends PATCH requests with body', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'TASK-1', status: 'in-progress' }));

    const client = createClient();
    await client.patch('/api/tasks/TASK-1/progress', { progressMessage: 'Working on it' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ progressMessage: 'Working on it' }),
      }),
    );
  });
});
