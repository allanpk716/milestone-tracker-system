import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ── Status enums (stored as text in SQLite, validated by Zod at app layer) ──

export const milestoneStatusEnum = ['draft', 'in-progress', 'completed', 'archived'] as const;
export type MilestoneStatus = (typeof milestoneStatusEnum)[number];

export const moduleStatusEnum = ['draft', 'in-progress', 'completed'] as const;
export type ModuleStatus = (typeof moduleStatusEnum)[number];

export const taskStatusEnum = [
	'todo',
	'in-progress',
	'blocked',
	'review',
	'done',
	'skipped'
] as const;
export type TaskStatus = (typeof taskStatusEnum)[number];

// ── Milestone ────────────────────────────────────────────────────────────────
// Primary entity. ID format: MS-{seq} (e.g. MS-1, MS-2).

export const milestones = sqliteTable(
	'milestones',
	{
		id: text('id').primaryKey(), // MS-{seq}
		title: text('title').notNull(),
		sourceMd: text('source_md'),
		gitUrl: text('git_url'),
		status: text('status', { enum: milestoneStatusEnum }).notNull().default('draft'),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`)
	},
	(table) => [index('milestone_status_idx').on(table.status)]
);

// ── Module ───────────────────────────────────────────────────────────────────
// Groups tasks within a milestone. ID format: MOD-{milestone_seq}-{seq}.

export const modules = sqliteTable(
	'modules',
	{
		id: text('id').primaryKey(), // MOD-{ms_seq}-{seq}
		milestoneId: text('milestone_id')
			.notNull()
			.references(() => milestones.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		status: text('status', { enum: moduleStatusEnum }).notNull().default('draft'),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(table) => [
		index('module_milestone_id_idx').on(table.milestoneId),
		index('module_status_idx').on(table.status)
	]
);

// ── Task ─────────────────────────────────────────────────────────────────────
// Atomic unit of work. ID format: TASK-{global_seq}.
// short_id is a global auto-increment for human-friendly references.

export const tasks = sqliteTable(
	'tasks',
	{
		id: text('id').primaryKey(), // TASK-{global_seq}
		shortId: integer('short_id').notNull().unique(), // global auto-increment
		moduleId: text('module_id')
			.notNull()
			.references(() => modules.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description'),
		references: text('references'), // JSON or text blob
		status: text('status', { enum: taskStatusEnum }).notNull().default('todo'),
		assignee: text('assignee'),
		subTotal: integer('sub_total').notNull().default(0),
		subDone: integer('sub_done').notNull().default(0),
		progressMessage: text('progress_message'),
		blockedReason: text('blocked_reason'),
		commitHash: text('commit_hash'),
		evidenceJson: text('evidence_json'),
		filesTouched: text('files_touched'),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		reportedAt: integer('reported_at', { mode: 'timestamp' })
	},
	(table) => [
		index('task_status_module_idx').on(table.status, table.moduleId),
		index('task_status_reported_idx').on(table.status, table.reportedAt),
		index('task_module_id_idx').on(table.moduleId),
		index('task_short_id_idx').on(table.shortId)
	]
);

// ── Type exports for use in application code ──

export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
