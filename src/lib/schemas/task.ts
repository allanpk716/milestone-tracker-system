import { z } from 'zod';
import { taskStatusEnum } from '../db/schema.js';
import { taskIdSchema, moduleIdSchema } from './common.js';

// ── Status transition map ───────────────────────────────────────────────────

const validTransitions: Record<string, string[]> = {
	todo: ['in-progress', 'skipped'],
	'in-progress': ['blocked', 'review', 'todo'],
	blocked: ['in-progress', 'todo'],
	review: ['done', 'in-progress'],
	done: [],
	skipped: []
};

export function isValidTransition(from: string, to: string): boolean {
	return validTransitions[from]?.includes(to) ?? false;
}

// ── Claim ───────────────────────────────────────────────────────────────────

export const claimTaskSchema = z.object({
	assignee: z.string().min(1, 'Assignee is required').max(100)
});
export type ClaimTaskInput = z.infer<typeof claimTaskSchema>;

// ── Progress update ─────────────────────────────────────────────────────────

export const progressTaskSchema = z.object({
	progressMessage: z.string().max(5000).optional(),
	subTotal: z.number().int().nonnegative().optional(),
	subDone: z.number().int().nonnegative().optional()
}).refine(
	(data) => {
		if (data.subTotal !== undefined && data.subDone !== undefined) {
			return data.subDone <= data.subTotal;
		}
		return true;
	},
	{ message: 'sub_done cannot exceed sub_total', path: ['subDone'] }
);
export type ProgressTaskInput = z.infer<typeof progressTaskSchema>;

// ── Complete ────────────────────────────────────────────────────────────────

const evidenceItemSchema = z.object({
	command: z.string().max(500),
	exitCode: z.number().int(),
	verdict: z.enum(['pass', 'fail', 'skip', 'error'])
});

export const completeTaskSchema = z.object({
	commitHash: z.string().max(40).optional(),
	progressMessage: z.string().max(5000).optional(),
	evidence: z.array(evidenceItemSchema).max(50).optional(),
	filesTouched: z.array(z.string().max(500)).max(200).optional()
});
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;

// ── Admin action ────────────────────────────────────────────────────────────

export const adminTaskActionSchema = z.object({
	status: z.enum(taskStatusEnum),
	progressMessage: z.string().max(5000).optional(),
	assignee: z.string().max(100).nullable().optional()
});
export type AdminTaskActionInput = z.infer<typeof adminTaskActionSchema>;

// ── Update task (edit properties) ───────────────────────────────────────────

export const updateTaskSchema = z.object({
	title: z.string().min(1).max(300).optional(),
	description: z.string().max(10000).nullable().optional(),
	assignee: z.string().max(100).nullable().optional()
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// ── Block ────────────────────────────────────────────────────────────────────

export const blockTaskSchema = z.object({
	reason: z.string().min(1, 'Block reason is required').max(2000)
});
export type BlockTaskInput = z.infer<typeof blockTaskSchema>;

// ── Unblock ──────────────────────────────────────────────────────────────────

export const unblockTaskSchema = z.object({
	message: z.string().max(5000).optional()
});
export type UnblockTaskInput = z.infer<typeof unblockTaskSchema>;

// ── Response (with resolved references) ─────────────────────────────────────

export const taskResponseSchema = z.object({
	id: taskIdSchema,
	shortId: z.number().int().positive(),
	moduleId: moduleIdSchema,
	title: z.string(),
	description: z.string().nullable(),
	references: z.string().nullable(),
	status: z.enum(taskStatusEnum),
	assignee: z.string().nullable(),
	subTotal: z.number().int().nonnegative(),
	subDone: z.number().int().nonnegative(),
	progressMessage: z.string().nullable(),
	blockedReason: z.string().nullable(),
	commitHash: z.string().nullable(),
	evidence: z.array(z.object({
		command: z.string(),
		exitCode: z.number().int(),
		verdict: z.string()
	})).nullable(),
	filesTouched: z.array(z.string()).nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	reportedAt: z.string().datetime().nullable()
});
export type TaskResponse = z.infer<typeof taskResponseSchema>;
