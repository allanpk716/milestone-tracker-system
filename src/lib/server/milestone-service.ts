import { eq, desc } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { milestones, modules, tasks } from '$lib/db/schema.js';
import type { CreateMilestoneInput, UpdateMilestoneInput } from '$lib/schemas/index.js';

// ── ID Generation ────────────────────────────────────────────────────────────

/** Get next MS-{seq} ID by querying max existing seq. */
export async function nextMilestoneId(db: BetterSQLite3Database<any>): Promise<string> {
	const rows = await db.select({ id: milestones.id }).from(milestones).all();
	let maxSeq = 0;
	for (const row of rows) {
		const seq = parseInt(row.id.replace('MS-', ''), 10);
		if (seq > maxSeq) maxSeq = seq;
	}
	return `MS-${maxSeq + 1}`;
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createMilestone(
	db: BetterSQLite3Database<any>,
	data: CreateMilestoneInput
) {
	const id = await nextMilestoneId(db);
	const result = await db
		.insert(milestones)
		.values({
			id,
			title: data.title,
			sourceMd: data.sourceMd ?? null,
			gitUrl: data.gitUrl && data.gitUrl !== '' ? data.gitUrl : null
		})
		.returning()
		.get();
	return formatMilestoneResponse(result);
}

// ── List ─────────────────────────────────────────────────────────────────────

export async function listMilestones(db: BetterSQLite3Database<any>) {
	const rows = await db.select().from(milestones).orderBy(desc(milestones.createdAt), desc(milestones.id)).all();
	return rows.map(formatMilestoneResponse);
}

// ── Get Detail ───────────────────────────────────────────────────────────────

export async function getMilestone(
	db: BetterSQLite3Database<any>,
	id: string
) {
	const milestone = await db
		.select()
		.from(milestones)
		.where(eq(milestones.id, id))
		.get();

	if (!milestone) return null;

	// Fetch modules for this milestone
	const modRows = await db
		.select()
		.from(modules)
		.where(eq(modules.milestoneId, id))
		.all();

	// Fetch tasks for each module
	const modulesWithTasks = await Promise.all(
		modRows.map(async (mod) => {
			const taskRows = await db
				.select()
				.from(tasks)
				.where(eq(tasks.moduleId, mod.id))
				.all();
			return {
				...formatModuleResponse(mod),
				tasks: taskRows.map(formatTaskResponse)
			};
		})
	);

	return {
		...formatMilestoneResponse(milestone),
		modules: modulesWithTasks
	};
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updateMilestone(
	db: BetterSQLite3Database<any>,
	id: string,
	data: UpdateMilestoneInput
) {
	const existing = await db
		.select()
		.from(milestones)
		.where(eq(milestones.id, id))
		.get();

	if (!existing) return null;

	const updates: Record<string, any> = {};
	if (data.title !== undefined) updates.title = data.title;
	if (data.sourceMd !== undefined) updates.sourceMd = data.sourceMd ?? null;
	if (data.gitUrl !== undefined) updates.gitUrl = data.gitUrl === '' ? null : data.gitUrl;
	if (data.status !== undefined) updates.status = data.status;

	if (Object.keys(updates).length === 0) {
		return formatMilestoneResponse(existing);
	}

	const result = await db
		.update(milestones)
		.set(updates)
		.where(eq(milestones.id, id))
		.returning()
		.get();

	return formatMilestoneResponse(result);
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

function formatTaskResponse(row: any) {
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
		commitHash: row.commitHash,
		createdAt: new Date(row.createdAt).toISOString(),
		updatedAt: new Date(row.updatedAt).toISOString(),
		reportedAt: row.reportedAt ? new Date(row.reportedAt).toISOString() : null
	};
}

export { formatModuleResponse, formatTaskResponse };
