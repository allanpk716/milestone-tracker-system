/**
 * Confirm service — atomically writes confirmed modules/tasks to DB
 * and activates the milestone (draft → in-progress).
 *
 * Pre-generates all IDs, then uses a synchronous drizzle transaction
 * (required by better-sqlite3) for atomic writes.
 */

import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { modules, tasks, milestones } from '$lib/db/schema.js';
import type { ConfirmModule } from '$lib/schemas/confirm.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConfirmResultModule {
	id: string;
	milestoneId: string;
	name: string;
	description: string | null;
	status: string;
	sortOrder: number;
	tasks: ConfirmResultTask[];
}

export interface ConfirmResultTask {
	id: string;
	shortId: number;
	moduleId: string;
	title: string;
	description: string | null;
	status: string;
}

export interface ConfirmError {
	code: 'not_found' | 'bad_request';
	message: string;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Confirm a milestone's decomposed modules and tasks.
 *
 * - Validates milestone exists, is 'draft', and has sourceMd
 * - Pre-generates all IDs (async phase)
 * - Inserts all modules and tasks in a synchronous transaction
 * - Updates milestone status to 'in-progress'
 * - Returns the created structure with all generated IDs
 */
export async function confirmMilestone(
	db: BetterSQLite3Database<any>,
	milestoneId: string,
	confirmedModules: ConfirmModule[]
): Promise<{ data: ConfirmResultModule[] } | { error: ConfirmError }> {
	// 1. Validate milestone preconditions (outside transaction — read-only)
	const milestone = await db
		.select()
		.from(milestones)
		.where(eq(milestones.id, milestoneId))
		.get();

	if (!milestone) {
		return { error: { code: 'not_found', message: `Milestone ${milestoneId} not found` } };
	}

	if (milestone.status !== 'draft') {
		return {
			error: {
				code: 'bad_request',
				message: `Milestone status is '${milestone.status}', expected 'draft'`
			}
		};
	}

	if (!milestone.sourceMd) {
		return {
			error: {
				code: 'bad_request',
				message: 'Milestone has no source markdown'
			}
		};
	}

	// 2. Pre-generate all IDs (async — must happen before sync transaction)
	// We scan once for the current max, then increment in memory.
	const existingModules = await db
		.select({ id: modules.id })
		.from(modules)
		.where(eq(modules.milestoneId, milestoneId))
		.all();

	let maxModuleSeq = 0;
	for (const row of existingModules) {
		const parts = row.id.split('-');
		const seq = parseInt(parts[parts.length - 1], 10);
		if (seq > maxModuleSeq) maxModuleSeq = seq;
	}

	const existingTasks = await db.select({ id: tasks.id, shortId: tasks.shortId }).from(tasks).all();
	let maxTaskSeq = 0;
	let maxShortId = 0;
	for (const row of existingTasks) {
		const seq = parseInt(row.id.replace('TASK-', ''), 10);
		if (seq > maxTaskSeq) maxTaskSeq = seq;
		if (row.shortId > maxShortId) maxShortId = row.shortId;
	}

	// Build module entries with pre-computed IDs
	const moduleEntries: Array<{
		id: string;
		mod: ConfirmModule;
		index: number;
	}> = [];

	for (let i = 0; i < confirmedModules.length; i++) {
		maxModuleSeq++;
		moduleEntries.push({
			id: `MOD-${milestoneId.replace('MS-', '')}-${maxModuleSeq}`,
			mod: confirmedModules[i],
			index: i
		});
	}

	// Build task entries with pre-computed IDs
	const taskEntries: Array<{
		id: string;
		shortId: number;
		moduleIndex: number;
		taskIndex: number;
		title: string;
		description: string | null;
	}> = [];

	for (const entry of moduleEntries) {
		for (let t = 0; t < entry.mod.tasks.length; t++) {
			maxTaskSeq++;
			maxShortId++;
			taskEntries.push({
				id: `TASK-${maxTaskSeq}`,
				shortId: maxShortId,
				moduleIndex: entry.index,
				taskIndex: t,
				title: entry.mod.tasks[t].title,
				description: entry.mod.tasks[t].description ?? null
			});
		}
	}

	// 3. Atomic write in a synchronous transaction
	const createdModules = db.transaction((tx) => {
		const result: ConfirmResultModule[] = [];

		for (const entry of moduleEntries) {
			tx.insert(modules).values({
				id: entry.id,
				milestoneId,
				name: entry.mod.name,
				description: entry.mod.description ?? null,
				sortOrder: entry.index
			}).run();

			const modTasks = taskEntries
				.filter((te) => te.moduleIndex === entry.index)
				.map((te) => {
					tx.insert(tasks).values({
						id: te.id,
						shortId: te.shortId,
						moduleId: entry.id,
						title: te.title,
						description: te.description
					}).run();

					return {
						id: te.id,
						shortId: te.shortId,
						moduleId: entry.id,
						title: te.title,
						description: te.description,
						status: 'todo'
					};
				});

			result.push({
				id: entry.id,
				milestoneId,
				name: entry.mod.name,
				description: entry.mod.description ?? null,
				status: 'draft',
				sortOrder: entry.index,
				tasks: modTasks
			});
		}

		// Activate milestone
		tx.update(milestones)
			.set({ status: 'in-progress' })
			.where(eq(milestones.id, milestoneId))
			.run();

		return result;
	});

	const totalTasks = createdModules.reduce((sum, m) => sum + m.tasks.length, 0);
	console.info('[confirm-service] Milestone confirmed:', {
		milestoneId,
		moduleCount: createdModules.length,
		taskCount: totalTasks
	});

	return { data: createdModules };
}
