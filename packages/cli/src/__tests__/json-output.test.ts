import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  outputJson,
  outputJsonError,
  formatErrorCode,
  formatErrorDetails,
} from '../utils/json-output.js';
import { MtCliError } from '../client.js';

// ── outputJson ──────────────────────────────────────────────────────────────

describe('outputJson', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('writes valid JSON to stdout', () => {
    const data = { id: 'TASK-1', status: 'todo' };
    outputJson(data);

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const output = (writeSpy.mock.calls[0][0] as string).trim();
    const parsed = JSON.parse(output);
    expect(parsed).toEqual(data);
  });

  it('writes pretty-printed JSON with trailing newline', () => {
    outputJson({ a: 1 });
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output.endsWith('\n')).toBe(true);
    expect(output).toContain('  '); // indentation
  });

  it('handles arrays', () => {
    outputJson([{ id: 1 }, { id: 2 }]);
    const output = (writeSpy.mock.calls[0][0] as string).trim();
    expect(JSON.parse(output)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('handles primitive values', () => {
    outputJson('simple string');
    const output = (writeSpy.mock.calls[0][0] as string).trim();
    expect(JSON.parse(output)).toBe('simple string');
  });

  it('handles null', () => {
    outputJson(null);
    const output = (writeSpy.mock.calls[0][0] as string).trim();
    expect(JSON.parse(output)).toBeNull();
  });
});

// ── outputJsonError ─────────────────────────────────────────────────────────

describe('outputJsonError', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    writeSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('writes error JSON to stdout and exits with code 1', () => {
    const err = new MtCliError(404, 'Task not found', 'Check URL', '/api/tasks/1');

    expect(() => outputJsonError(err)).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(writeSpy).toHaveBeenCalledTimes(1);

    const output = (writeSpy.mock.calls[0][0] as string).trim();
    const parsed = JSON.parse(output);
    expect(parsed.error).toBe('Task not found');
    expect(parsed.code).toBe('HTTP_404');
  });

  it('includes details for MtCliError with url and suggestion', () => {
    const err = new MtCliError(409, 'Conflict', 'Retry later', '/api/tasks/1/claim');

    expect(() => outputJsonError(err)).toThrow();
    const output = (writeSpy.mock.calls[0][0] as string).trim();
    const parsed = JSON.parse(output);

    expect(parsed.details).toBeDefined();
    expect(parsed.details.url).toBe('/api/tasks/1/claim');
    expect(parsed.details.suggestion).toBe('Retry later');
  });

  it('omits details for generic errors', () => {
    const err = new Error('something went wrong');

    expect(() => outputJsonError(err)).toThrow();
    const output = (writeSpy.mock.calls[0][0] as string).trim();
    const parsed = JSON.parse(output);

    expect(parsed.error).toBe('something went wrong');
    expect(parsed.code).toBe('UNKNOWN_ERROR');
    expect(parsed.details).toBeUndefined();
  });

  it('handles non-Error values', () => {
    expect(() => outputJsonError('raw string error')).toThrow();
    const output = (writeSpy.mock.calls[0][0] as string).trim();
    const parsed = JSON.parse(output);

    expect(parsed.error).toBe('raw string error');
    expect(parsed.code).toBe('UNKNOWN_ERROR');
  });

  it('outputs valid JSON conforming to JsonErrorShape', () => {
    const err = new MtCliError(500, 'Server error', 'Try later', '/api/tasks');

    expect(() => outputJsonError(err)).toThrow();
    const output = (writeSpy.mock.calls[0][0] as string).trim();
    const parsed = JSON.parse(output);

    // Verify structure: { error: string, code: string, details?: unknown }
    expect(typeof parsed.error).toBe('string');
    expect(typeof parsed.code).toBe('string');
    expect(parsed.error.length).toBeGreaterThan(0);
    expect(parsed.code.length).toBeGreaterThan(0);
  });
});

// ── formatErrorCode ─────────────────────────────────────────────────────────

describe('formatErrorCode', () => {
  it('maps HTTP 400 to HTTP_400', () => {
    const err = new MtCliError(400, 'Bad Request', 'sug', '/url');
    expect(formatErrorCode(err)).toBe('HTTP_400');
  });

  it('maps HTTP 401 to HTTP_401', () => {
    const err = new MtCliError(401, 'Unauthorized', 'sug', '/url');
    expect(formatErrorCode(err)).toBe('HTTP_401');
  });

  it('maps HTTP 404 to HTTP_404', () => {
    const err = new MtCliError(404, 'Not Found', 'sug', '/url');
    expect(formatErrorCode(err)).toBe('HTTP_404');
  });

  it('maps HTTP 409 to HTTP_409', () => {
    const err = new MtCliError(409, 'Conflict', 'sug', '/url');
    expect(formatErrorCode(err)).toBe('HTTP_409');
  });

  it('maps HTTP 500 to HTTP_500', () => {
    const err = new MtCliError(500, 'Server Error', 'sug', '/url');
    expect(formatErrorCode(err)).toBe('HTTP_500');
  });

  it('maps timeout (status 0, abort message) to TIMEOUT', () => {
    const err = new MtCliError(0, '请求超时 (3000ms)，服务器未响应', 'sug', '/url');
    expect(formatErrorCode(err)).toBe('TIMEOUT');
  });

  it('maps timeout with English message to TIMEOUT', () => {
    const err = new MtCliError(0, 'Request timeout after 5000ms', 'sug', '/url');
    expect(formatErrorCode(err)).toBe('TIMEOUT');
  });

  it('maps network error (status 0, fetch message) to NETWORK_ERROR', () => {
    const err = new MtCliError(0, '无法连接到服务器: fetch failed', 'sug', '/url');
    expect(formatErrorCode(err)).toBe('NETWORK_ERROR');
  });

  it('maps network error with English message to NETWORK_ERROR', () => {
    const err = new MtCliError(0, 'fetch failed', 'sug', '/url');
    expect(formatErrorCode(err)).toBe('NETWORK_ERROR');
  });

  it('maps generic Error to UNKNOWN_ERROR', () => {
    const err = new Error('random error');
    expect(formatErrorCode(err)).toBe('UNKNOWN_ERROR');
  });

  it('maps non-Error values to UNKNOWN_ERROR', () => {
    expect(formatErrorCode('string')).toBe('UNKNOWN_ERROR');
    expect(formatErrorCode(42)).toBe('UNKNOWN_ERROR');
    expect(formatErrorCode(null)).toBe('UNKNOWN_ERROR');
    expect(formatErrorCode(undefined)).toBe('UNKNOWN_ERROR');
  });

  it('maps status 0 with unrecognised message to UNKNOWN_ERROR', () => {
    const err = new MtCliError(0, 'some unknown error', 'sug', '/url');
    expect(formatErrorCode(err)).toBe('UNKNOWN_ERROR');
  });
});

// ── formatErrorDetails ──────────────────────────────────────────────────────

describe('formatErrorDetails', () => {
  it('returns url and suggestion for MtCliError', () => {
    const err = new MtCliError(404, 'Not found', 'Check URL', '/api/tasks/1');
    const details = formatErrorDetails(err) as Record<string, string>;

    expect(details).toBeDefined();
    expect(details.url).toBe('/api/tasks/1');
    expect(details.suggestion).toBe('Check URL');
  });

  it('returns only url when suggestion is empty', () => {
    const err = new MtCliError(500, 'Error', '', '/api/tasks');
    const details = formatErrorDetails(err) as Record<string, string>;

    expect(details.url).toBe('/api/tasks');
    expect(details.suggestion).toBeUndefined();
  });

  it('returns undefined for generic Error', () => {
    const err = new Error('not a MtCliError');
    expect(formatErrorDetails(err)).toBeUndefined();
  });

  it('returns undefined for non-Error values', () => {
    expect(formatErrorDetails('string')).toBeUndefined();
    expect(formatErrorDetails(null)).toBeUndefined();
  });
});

// ── Error JSON Structure ────────────────────────────────────────────────────

describe('Error JSON structure', () => {
  it('has correct shape for HTTP error', () => {
    const err = new MtCliError(409, 'Conflict', 'Retry', '/api/tasks/1/claim');
    const shape = {
      error: err.message,
      code: formatErrorCode(err),
      ...(formatErrorDetails(err) !== undefined ? { details: formatErrorDetails(err) } : {}),
    };

    expect(shape).toEqual({
      error: 'Conflict',
      code: 'HTTP_409',
      details: { url: '/api/tasks/1/claim', suggestion: 'Retry' },
    });
  });

  it('has correct shape for timeout', () => {
    const err = new MtCliError(0, '请求超时 (3000ms)', 'Check server', '/api/tasks');
    const shape = {
      error: err.message,
      code: formatErrorCode(err),
      ...(formatErrorDetails(err) !== undefined ? { details: formatErrorDetails(err) } : {}),
    };

    expect(shape).toEqual({
      error: '请求超时 (3000ms)',
      code: 'TIMEOUT',
      details: { url: '/api/tasks', suggestion: 'Check server' },
    });
  });

  it('has correct shape for unknown error', () => {
    const err = new Error('something broke');
    const shape = {
      error: err.message,
      code: formatErrorCode(err),
      ...(formatErrorDetails(err) !== undefined ? { details: formatErrorDetails(err) } : {}),
    };

    expect(shape).toEqual({
      error: 'something broke',
      code: 'UNKNOWN_ERROR',
    });
    expect(shape.details).toBeUndefined();
  });
});
