// ── Task ID Parsing and Resolution ──────────────────────────────────────────

import type { TaskResponse } from '../types.js';

export interface ParsedTaskId {
  type: 'full' | 'short';
  fullId?: string;      // TASK-{seq}
  shortId?: number;     // N (from #N)
}

/**
 * Parse task ID input.
 * - `#N` → short ID reference
 * - `TASK-{seq}` → full ID
 * - Bare number → treated as short ID
 */
export function parseTaskId(input: string): ParsedTaskId {
  const trimmed = input.trim();

  // #N format
  const shortMatch = trimmed.match(/^#(\d+)$/);
  if (shortMatch) {
    return { type: 'short', shortId: parseInt(shortMatch[1], 10) };
  }

  // TASK-{seq} format
  const fullMatch = trimmed.match(/^TASK-(\d+)$/i);
  if (fullMatch) {
    return { type: 'full', fullId: `TASK-${fullMatch[1]}` };
  }

  // Bare number → treat as short ID
  const bareNum = trimmed.match(/^(\d+)$/);
  if (bareNum) {
    return { type: 'short', shortId: parseInt(bareNum[1], 10) };
  }

  // Unknown format — pass through as full ID
  return { type: 'full', fullId: trimmed };
}

/**
 * Resolve a parsed task ID to a full task ID.
 * If it's a short ID, look up the full ID from the task list.
 */
export async function resolveTaskId(
  parsed: ParsedTaskId,
  listTasks: () => Promise<TaskResponse[]>,
): Promise<string> {
  if (parsed.type === 'full' && parsed.fullId) {
    return parsed.fullId;
  }

  if (parsed.type === 'short' && parsed.shortId !== undefined) {
    const tasks = await listTasks();
    const match = tasks.find((t) => t.shortId === parsed.shortId);
    if (!match) {
      throw new Error(
        `[错误] 未找到编号 #${parsed.shortId} 的任务。请使用 'mt-cli tasks list' 查看所有任务。`
      );
    }
    return match.id;
  }

  throw new Error(`[错误] 无法解析任务 ID: ${JSON.stringify(parsed)}`);
}

/**
 * Find a task by short ID from a list.
 */
export function findByShortId(tasks: TaskResponse[], shortId: number): TaskResponse | undefined {
  return tasks.find((t) => t.shortId === shortId);
}
