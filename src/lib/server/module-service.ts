import { eq, asc } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { modules, milestones } from '$lib/db/schema.js';
import type { CreateModuleInput, UpdateModuleInput } from '$lib/schemas/index.js';

/** Body data for createModule (milestoneId comes from URL param). */
type CreateModuleBody = Omit<CreateModuleInput, 'milestoneId'>;

// ── ID Generation ────────────────────────────────────────────────────────────

/** Generate MOD-{milestone_seq}-{next_seq} ID. */
export async function nextModuleId(
	db: BetterSQLite3Database<any>,
	milestoneId: string
): Promise<string> {
	const msSeq = milestoneId.replace('MS-', '');
	const rows = await db
		.select({ id: modules.id })
		.from(modules)
		.where(eq(modules.milestoneId, milestoneId))
		.all();
	let maxSeq = 0;
	for (const row of rows) {
		// Format: MOD-{msSeq}-{seq}
		const parts = row.id.split('-');
		const seq = parseInt(parts[parts.length - 1], 10);
		if (seq > maxSeq) maxSeq = seq;
	}
	return `MOD-${msSeq}-${maxSeq + 1}`;
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createModule(
	db: BetterSQLite3Database<any>,
	milestoneId: string,
	data: CreateModuleBody
) {
	// Verify milestone exists
	const ms = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).get();
	if (!ms) return null;

	const id = await nextModuleId(db, milestoneId);
	const result = await db
		.insert(modules)
		.values({
			id,
			milestoneId,
			name: data.name,
			description: data.description ?? null,
			sortOrder: data.sortOrder ?? 0
		})
		.returning()
		.get();
	return formatModuleResponse(result);
}

// ── Get by ID ─────────────────────────────────────────────────────────────────

export async function getModule(
	db: BetterSQLite3Database<any>,
	id: string
) {
	const row = await db.select().from(modules).where(eq(modules.id, id)).get();
	if (!row) return null;
	return formatModuleResponse(row);
}

// ── List by Milestone ────────────────────────────────────────────────────────

export async function listModulesByMilestone(
	db: BetterSQLite3Database<any>,
	milestoneId: string
) {
	const rows = await db
		.select()
		.from(modules)
		.where(eq(modules.milestoneId, milestoneId))
		.orderBy(asc(modules.sortOrder))
		.all();
	return rows.map(formatModuleResponse);
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updateModule(
	db: BetterSQLite3Database<any>,
	id: string,
	data: UpdateModuleInput
) {
	const existing = await db.select().from(modules).where(eq(modules.id, id)).get();
	if (!existing) return null;

	const updates: Record<string, any> = {};
	if (data.name !== undefined) updates.name = data.name;
	if (data.description !== undefined) updates.description = data.description ?? null;
	if (data.status !== undefined) updates.status = data.status;
	if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;

	if (Object.keys(updates).length === 0) {
		return formatModuleResponse(existing);
	}

	const result = await db
		.update(modules)
		.set(updates)
		.where(eq(modules.id, id))
		.returning()
		.get();
	return formatModuleResponse(result);
}

// ── Formatter ────────────────────────────────────────────────────────────────

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
