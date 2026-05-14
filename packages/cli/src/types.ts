// ── Shared Types ────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'review' | 'done' | 'skipped';

export interface TaskResponse {
  id: string;
  shortId: number;
  moduleId: string;
  title: string;
  description: string | null;
  references: string | null;
  status: TaskStatus;
  assignee: string | null;
  subTotal: number;
  subDone: number;
  progressMessage: string | null;
  blockedReason: string | null;
  commitHash: string | null;
  evidenceJson: unknown | null;
  filesTouched: string[] | null;
  createdAt: string;
  updatedAt: string;
  reportedAt: string | null;
}
