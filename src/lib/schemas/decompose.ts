import { z } from 'zod';

// ── LLM output schemas ──────────────────────────────────────────────────────

/** A single task inside a decomposed module. */
export const decomposeTaskSchema = z.object({
	title: z.string().min(1, 'Task title is required').max(500, 'Task title too long'),
	description: z.string().max(5000).optional()
});
export type DecomposeTask = z.infer<typeof decomposeTaskSchema>;

/** A single decomposed module produced by the LLM. */
export const decomposeModuleSchema = z.object({
	name: z.string().min(1, 'Module name is required').max(200, 'Module name too long'),
	description: z.string().max(5000).optional(),
	tasks: z.array(decomposeTaskSchema).min(0)
});
export type DecomposeModule = z.infer<typeof decomposeModuleSchema>;

// ── SSE event types ─────────────────────────────────────────────────────────

/** Union discriminator for SSE events sent to the frontend. */
export type DecomposeEvent = DecomposeModuleEvent | DecomposeErrorEvent | DecomposeDoneEvent;

/** A successfully parsed and validated module chunk. */
export interface DecomposeModuleEvent {
	type: 'module';
	index: number;
	module: DecomposeModule;
}

/** An error occurred during the decompose stream. */
export interface DecomposeErrorEvent {
	type: 'error';
	stage: 'connecting' | 'streaming' | 'parsing';
	message: string;
}

/** Signal that the stream is complete. */
export interface DecomposeDoneEvent {
	type: 'done';
	total: number;
	errors: number;
}
