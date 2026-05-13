import { z } from 'zod';
import { milestoneIdSchema } from './common.js';

// ── Confirm request schema ───────────────────────────────────────────────────

/** A task within a confirmed module. */
export const confirmTaskSchema = z.object({
	title: z.string().min(1, 'Task title is required').max(500, 'Task title too long'),
	description: z.string().max(5000).optional()
});
export type ConfirmTask = z.infer<typeof confirmTaskSchema>;

/** A confirmed module with its tasks. */
export const confirmModuleSchema = z.object({
	name: z.string().min(1, 'Module name is required').max(200, 'Module name too long'),
	description: z.string().max(5000).optional(),
	tasks: z.array(confirmTaskSchema).min(1, 'Each module must have at least one task')
});
export type ConfirmModule = z.infer<typeof confirmModuleSchema>;

/** The full confirm request body. */
export const confirmRequestSchema = z.object({
	modules: z
		.array(confirmModuleSchema)
		.min(1, 'At least one module is required')
		.max(50, 'Too many modules')
});
export type ConfirmRequest = z.infer<typeof confirmRequestSchema>;

// ── Compare request schema ───────────────────────────────────────────────────

export const compareRequestSchema = z.object({
	modules: z
		.array(confirmModuleSchema)
		.min(1, 'At least one module is required')
});
export type CompareRequest = z.infer<typeof compareRequestSchema>;

// ── Confirm response types ───────────────────────────────────────────────────

export const confirmModuleResponseSchema = z.object({
	id: z.string(),
	milestoneId: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	status: z.string(),
	sortOrder: z.number().int(),
	tasks: z.array(
		z.object({
			id: z.string(),
			shortId: z.number().int().positive(),
			moduleId: z.string(),
			title: z.string(),
			description: z.string().nullable(),
			status: z.string()
		})
	)
});
export type ConfirmModuleResponse = z.infer<typeof confirmModuleResponseSchema>;

// ── SSE event types for compare ──────────────────────────────────────────────

export type CompareEvent = CompareSuggestionEvent | CompareErrorEvent | CompareDoneEvent;

export interface CompareSuggestionEvent {
	type: 'suggestion';
	content: string;
}

export interface CompareErrorEvent {
	type: 'error';
	stage: 'connecting' | 'streaming';
	message: string;
}

export interface CompareDoneEvent {
	type: 'done';
}
