// ── JSON Output Utilities ───────────────────────────────────────────────────
// Shared formatting for --json flag across all CLI commands.

import { MtCliError } from '../client.js';

// ── Public API ──────────────────────────────────────────────────────────────

export interface JsonErrorShape {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * Write a JSON payload to stdout (pretty-printed, trailing newline).
 */
export function outputJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

/**
 * Format an error as structured JSON, write to stdout, and exit with code 1.
 * Never returns (return type is `never`).
 */
export function outputJsonError(err: unknown): never {
  const payload: JsonErrorShape = {
    error: getErrorMessage(err),
    code: formatErrorCode(err),
  };

  const details = formatErrorDetails(err);
  if (details !== undefined) {
    payload.details = details;
  }

  process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  process.exit(1);
}

// ── Error Code Mapping ──────────────────────────────────────────────────────

/**
 * Map an error to a machine-readable code string.
 *
 * - MtCliError with HTTP status → `HTTP_${status}` (e.g. `HTTP_404`)
 * - MtCliError with status 0 and abort message → `TIMEOUT`
 * - MtCliError with status 0 and fetch message → `NETWORK_ERROR`
 * - Anything else → `UNKNOWN_ERROR`
 */
export function formatErrorCode(err: unknown): string {
  if (err instanceof MtCliError) {
    if (err.status === 0) {
      // Timeout: abort-related message
      if (err.message.includes('请求超时') || err.message.includes('timeout')) {
        return 'TIMEOUT';
      }
      // Network: fetch-related message
      if (err.message.includes('无法连接') || err.message.includes('fetch')) {
        return 'NETWORK_ERROR';
      }
    }
    if (err.status > 0) {
      return `HTTP_${err.status}`;
    }
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Extract structured details from MtCliError (url, suggestion),
 * or return undefined for unknown error types.
 */
export function formatErrorDetails(err: unknown): unknown {
  if (err instanceof MtCliError) {
    const details: Record<string, string> = {};
    if (err.url) details.url = err.url;
    if (err.suggestion) details.suggestion = err.suggestion;
    if (Object.keys(details).length > 0) return details;
  }
  return undefined;
}

// ── Internal Helpers ────────────────────────────────────────────────────────

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return String(err);
}
