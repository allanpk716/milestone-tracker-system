// ── Chinese Formatting Helpers ──────────────────────────────────────────────

import type { TaskStatus } from '../types.js';

// ── Status Labels ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待领取',
  'in-progress': '进行中',
  blocked: '阻塞',
  review: '审核中',
  done: '已完成',
  skipped: '已跳过',
};

export function statusLabel(status: string): string {
  return (STATUS_LABELS as Record<string, string>)[status] || status;
}

// ── Progress Bar ────────────────────────────────────────────────────────────

export function progressBar(subDone: number, subTotal: number, width = 20): string {
  if (subTotal <= 0) return '—';
  const pct = Math.round((subDone / subTotal) * 100);
  const filled = Math.round((subDone / subTotal) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${pct}%`;
}

// ── Divider ─────────────────────────────────────────────────────────────────

export function divider(char = '─', width = 40): string {
  return char.repeat(width);
}

export function sectionHeader(title: string): string {
  return `\n${divider('═', 40)}\n  ${title}\n${divider('═', 40)}`;
}

// ── Date Formatting ─────────────────────────────────────────────────────────

export function formatDate(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '—';
  }
}

// ── Task Row Formatting ─────────────────────────────────────────────────────

export function taskRow(task: {
  shortId: number;
  title: string;
  moduleId: string;
  status: string;
  assignee: string | null;
  subTotal: number;
  subDone: number;
}): string {
  const id = `#${task.shortId}`.padEnd(6);
  const status = statusLabel(task.status).padEnd(8);
  const module = task.moduleId.padEnd(16);
  const assignee = (task.assignee || '—').padEnd(12);
  const progress = task.subTotal > 0
    ? progressBar(task.subDone, task.subTotal)
    : '';
  return `${id} ${task.title}\n      状态: ${status}  模块: ${module}  负责人: ${assignee}${progress ? '  ' + progress : ''}`;
}
