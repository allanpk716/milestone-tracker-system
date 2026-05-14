import { eq, asc, sql, and, inArray } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { tasks, modules, milestones } from '$lib/db/schema.js';
import type { TaskStatus } from '$lib/db/schema.js';
import type {
	ClaimTaskInput,
	ProgressTaskInput,
	CompleteTaskInput,
	AdminTaskActionInput,
	UpdateTaskInput,
	BlockTaskInput,
	UnblockTaskInput
} from '$lib/schemas/index.js';
import { isValidTransition } from '$lib/schemas/index.js';

// ── ID Generation ────────────────────────────────────────────────────────────

/** Get next TASK-{global_seq} ID and short_id. */
export async function nextTaskId(db: BetterSQLite3Database<any>): Promise<{ id: string; shortId: number }> {
	const rows = await db.select({ id: tasks.id, shortId: tasks.shortId }).from(tasks).all();
	let maxSeq = 0;
	let maxShort = 0;
	for (const row of rows) {
		const seq = parseInt(row.id.replace('TASK-', ''), 10);
		if (seq > maxSeq) maxSeq = seq;
		if (row.shortId > maxShort) maxShort = row.shortId;
	}
	return { id: `TASK-${maxSeq + 1}`, shortId: maxShort + 1 };
}

// ── List (with filters) ─────────────────────────────────────────────────────

export interface TaskFilters {
	status?: string;
	milestoneId?: string;
	moduleId?: string;
}

export async function listTasks(
	db: BetterSQLite3Database<any>,
	filters: TaskFilters = {}
) {
	const conditions = [];
	if (filters.status) conditions.push(eq(tasks.status, filters.status as TaskStatus));
	if (filters.moduleId) conditions.push(eq(tasks.moduleId, filters.moduleId));

	// If milestoneId, join through modules
	if (filters.milestoneId) {
		const modRows = await db
			.select({ id: modules.id })
			.from(modules)
			.where(eq(modules.milestoneId, filters.milestoneId))
			.all();
		const modIds = modRows.map((m) => m.id);
		if (modIds.length === 0) return [];
		conditions.push(inArray(tasks.moduleId, modIds));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
	const rows = await db
		.select()
		.from(tasks)
		.where(whereClause)
		.orderBy(asc(tasks.shortId))
		.all();
	return rows.map(formatTaskResponse);
}

// ── Get Detail ───────────────────────────────────────────────────────────────

export async function getTask(
	db: BetterSQLite3Database<any>,
	id: string
) {
	const row = await db.select().from(tasks).where(eq(tasks.id, id)).get();
	if (!row) return null;

	// Resolve module and milestone info
	const mod = await db.select().from(modules).where(eq(modules.id, row.moduleId)).get();
	const milestone = mod
		? await db.select().from(milestones).where(eq(milestones.id, mod.milestoneId)).get()
		: null;

	return {
		...formatTaskResponse(row),
		module: mod
			? {
					id: mod.id,
					milestoneId: mod.milestoneId,
					name: mod.name,
					status: mod.status
				}
			: null,
		milestone: milestone
			? {
					id: milestone.id,
					title: milestone.title,
					status: milestone.status
				}
			: null
	};
}

// ── Claim (optimistic lock) ──────────────────────────────────────────────────

export async function claimTask(
	db: BetterSQLite3Database<any>,
	id: string,
	data: ClaimTaskInput
) {
	const existing = await db.select().from(tasks).where(eq(tasks.id, id)).get();
	if (!existing) return { error: 'not_found' as const };

	// Only allow claiming if task is todo or in-progress
	if (existing.status !== 'todo' && existing.status !== 'in-progress') {
		return { error: 'invalid_status' as const, currentStatus: existing.status };
	}

	// Optimistic lock: if already assigned to someone else, reject
	if (existing.assignee && existing.assignee !== data.assignee) {
		return {
			error: 'conflict' as const,
			currentAssignee: existing.assignee,
			task: formatTaskResponse(existing)
		};
	}

	// Transition status if needed
	const statusUpdate =
		existing.status === 'todo' ? 'in-progress' : undefined;

	const updates: Record<string, any> = { assignee: data.assignee };
	if (statusUpdate) updates.status = statusUpdate;
	updates.updatedAt = sql`(unixepoch())`;

	const result = await db
		.update(tasks)
		.set(updates)
		.where(eq(tasks.id, id))
		.returning()
		.get();

	return { task: formatTaskResponse(result) };
}

// ── Progress ─────────────────────────────────────────────────────────────────

export async function progressTask(
	db: BetterSQLite3Database<any>,
	id: string,
	data: ProgressTaskInput
) {
	const existing = await db.select().from(tasks).where(eq(tasks.id, id)).get();
	if (!existing) return { error: 'not_found' as const };

	if (existing.status !== 'in-progress' && existing.status !== 'todo' && existing.status !== 'blocked') {
		return { error: 'invalid_status' as const, currentStatus: existing.status };
	}

	const updates: Record<string, any> = { updatedAt: sql`(unixepoch())` };
	if (data.progressMessage !== undefined) updates.progressMessage = data.progressMessage ?? null;
	if (data.subTotal !== undefined) updates.subTotal = data.subTotal;
	if (data.subDone !== undefined) updates.subDone = data.subDone;

	const result = await db
		.update(tasks)
		.set(updates)
		.where(eq(tasks.id, id))
		.returning()
		.get();

	return { task: formatTaskResponse(result) };
}

// ── Complete ─────────────────────────────────────────────────────────────────

export async function completeTask(
	db: BetterSQLite3Database<any>,
	id: string,
	data: CompleteTaskInput
) {
	const existing = await db.select().from(tasks).where(eq(tasks.id, id)).get();
	if (!existing) return { error: 'not_found' as const };

	// Must be in review or in-progress to complete
	if (existing.status !== 'review' && existing.status !== 'in-progress') {
		return { error: 'invalid_status' as const, currentStatus: existing.status };
	}

	const updates: Record<string, any> = {
		status: 'done',
		updatedAt: sql`(unixepoch())`,
		reportedAt: sql`(unixepoch())`
	};
	if (data.commitHash !== undefined) updates.commitHash = data.commitHash ?? null;
	if (data.progressMessage !== undefined) updates.progressMessage = data.progressMessage ?? null;
	if (data.evidence !== undefined) updates.evidenceJson = data.evidence.length > 0 ? JSON.stringify(data.evidence) : null;
	if (data.filesTouched !== undefined) updates.filesTouched = data.filesTouched.length > 0 ? JSON.stringify(data.filesTouched) : null;

	const result = await db
		.update(tasks)
		.set(updates)
		.where(eq(tasks.id, id))
		.returning()
		.get();

	return { task: formatTaskResponse(result) };
}

// ── Admin Action ─────────────────────────────────────────────────────────────

export type AdminActionError = {
	error: 'not_found' | 'invalid_transition' | 'invalid_status';
	detail?: string;
};

export async function adminTaskAction(
	db: BetterSQLite3Database<any>,
	id: string,
	data: AdminTaskActionInput
) {
	const existing = await db.select().from(tasks).where(eq(tasks.id, id)).get();
	if (!existing) return { error: 'not_found' as const };

	// Admin can force any status, but validate transition for non-force actions
	// For admin actions, we allow any status change (admin override)
	const updates: Record<string, any> = {
		status: data.status,
		updatedAt: sql`(unixepoch())`
	};

	// If setting to done, also set reportedAt
	if (data.status === 'done' && !existing.reportedAt) {
		updates.reportedAt = sql`(unixepoch())`;
	}
	// If reopening from done, clear reportedAt
	if (data.status !== 'done' && existing.reportedAt) {
		updates.reportedAt = null;
	}

	if (data.progressMessage !== undefined) {
		updates.progressMessage = data.progressMessage ?? null;
	}

	// Handle assignee clearing (force release) or assignment
	if (data.assignee !== undefined) {
		updates.assignee = data.assignee ?? null;
	}

	const result = await db
		.update(tasks)
		.set(updates)
		.where(eq(tasks.id, id))
		.returning()
		.get();

	return { task: formatTaskResponse(result) };
}

// ── Update task (edit properties) ───────────────────────────────────────────

export async function updateTask(
	db: BetterSQLite3Database<any>,
	id: string,
	data: UpdateTaskInput
) {
	const existing = await db.select().from(tasks).where(eq(tasks.id, id)).get();
	if (!existing) return { error: 'not_found' as const };

	const updates: Record<string, any> = { updatedAt: sql`(unixepoch())` };
	if (data.title !== undefined) updates.title = data.title;
	if (data.description !== undefined) updates.description = data.description ?? null;
	if (data.assignee !== undefined) updates.assignee = data.assignee ?? null;

	const result = await db
		.update(tasks)
		.set(updates)
		.where(eq(tasks.id, id))
		.returning()
		.get();

	return { task: formatTaskResponse(result) };
}

// ── Block ────────────────────────────────────────────────────────────────────

export async function blockTask(
	db: BetterSQLite3Database<any>,
	id: string,
	data: BlockTaskInput
) {
	const existing = await db.select().from(tasks).where(eq(tasks.id, id)).get();
	if (!existing) return { error: 'not_found' as const };

	if (existing.status !== 'in-progress') {
		return { error: 'invalid_status' as const, currentStatus: existing.status };
	}

	const updates: Record<string, any> = {
		status: 'blocked',
		blockedReason: data.reason,
		updatedAt: sql`(unixepoch())`
	};

	const result = await db
		.update(tasks)
		.set(updates)
		.where(eq(tasks.id, id))
		.returning()
		.get();

	return { task: formatTaskResponse(result) };
}

// ── Unblock ──────────────────────────────────────────────────────────────────

export async function unblockTask(
	db: BetterSQLite3Database<any>,
	id: string,
	data: UnblockTaskInput
) {
	const existing = await db.select().from(tasks).where(eq(tasks.id, id)).get();
	if (!existing) return { error: 'not_found' as const };

	if (existing.status !== 'blocked') {
		return { error: 'invalid_status' as const, currentStatus: existing.status };
	}

	const updates: Record<string, any> = {
		status: 'in-progress',
		blockedReason: null,
		updatedAt: sql`(unixepoch())`
	};

	if (data.message !== undefined) {
		updates.progressMessage = data.message;
	}

	const result = await db
		.update(tasks)
		.set(updates)
		.where(eq(tasks.id, id))
		.returning()
		.get();

	return { task: formatTaskResponse(result) };
}

// ── Kanban Data (with zombie detection) ─────────────────────────────────────

const ZOMBIE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function listKanbanData(db: BetterSQLite3Database<any>, milestoneId: string) {
	// Fetch milestone
	const milestone = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).get();
	if (!milestone) return null;

	// Fetch modules
	const modRows = await db
		.select()
		.from(modules)
		.where(eq(modules.milestoneId, milestoneId))
		.orderBy(asc(modules.sortOrder))
		.all();

	const now = Date.now();

	// Fetch tasks per module with zombie flag
	const modulesWithTasks = await Promise.all(
		modRows.map(async (mod) => {
			const taskRows = await db
				.select()
				.from(tasks)
				.where(eq(tasks.moduleId, mod.id))
				.all();

			const tasksWithZombie = taskRows.map((row) => {
				const formatted = formatTaskResponse(row);
				const isZombie =
					row.status === 'in-progress' &&
					(now - new Date(row.updatedAt).getTime()) > ZOMBIE_THRESHOLD_MS;
				return { ...formatted, isZombie };
			});

			const totalTasks = tasksWithZombie.length;
			const doneTasks = tasksWithZombie.filter((t) => t.status === 'done').length;
			const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

			// Collect unique assignees
			const assignees = [...new Set(tasksWithZombie.map((t) => t.assignee).filter(Boolean))];

			return {
				...formatModuleResponse(mod),
				tasks: tasksWithZombie,
				totalTasks,
				doneTasks,
				progressPercent,
				assignees
			};
		})
	);

	return {
		...formatMilestoneResponse(milestone),
		modules: modulesWithTasks
	};
}

// ── Formatters ───────────────────────────────────────────────────────────────

function formatMilestoneResponse(row: any) {
	return {
		id: row.id,
		title: row.title,
		sourceMd: row.sourceMd,
		gitUrl: row.gitUrl,
		status: row.status,
		createdAt: new Date(row.createdAt).toISOString()
	};
}

function formatModuleResponse(row: any) {
	return {
		id: row.id,
		milestoneId: row.milestoneId,
		name: row.name,
		description: row.description,
		status: row.status,
		sortOrder: row.sortOrder
	};
}

// ── Formatter ────────────────────────────────────────────────────────────────

function formatTaskResponse(row: any) {
	let evidence: Array<{ command: string; exitCode: number; verdict: string }> | null = null;
	if (row.evidenceJson) {
		try { evidence = JSON.parse(row.evidenceJson); } catch { evidence = null; }
	}
	let filesTouched: string[] | null = null;
	if (row.filesTouched) {
		try { filesTouched = JSON.parse(row.filesTouched); } catch { filesTouched = null; }
	}
	return {
		id: row.id,
		shortId: row.shortId,
		moduleId: row.moduleId,
		title: row.title,
		description: row.description,
		references: row.references,
		status: row.status,
		assignee: row.assignee,
		subTotal: row.subTotal,
		subDone: row.subDone,
		progressMessage: row.progressMessage,
		blockedReason: row.blockedReason ?? null,
		commitHash: row.commitHash,
		evidence,
		filesTouched,
		createdAt: new Date(row.createdAt).toISOString(),
		updatedAt: new Date(row.updatedAt).toISOString(),
		reportedAt: row.reportedAt ? new Date(row.reportedAt).toISOString() : null
	};
}
