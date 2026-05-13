import { z } from 'zod';
import { moduleStatusEnum } from '../db/schema.js';
import { moduleIdSchema, milestoneIdSchema } from './common.js';

// ── Create ──────────────────────────────────────────────────────────────────

export const createModuleSchema = z.object({
	milestoneId: milestoneIdSchema,
	name: z.string().min(1, 'Name is required').max(200, 'Name must be under 200 characters'),
	description: z.string().max(5000).optional(),
	sortOrder: z.number().int().nonnegative().default(0)
});
export type CreateModuleInput = z.infer<typeof createModuleSchema>;

// ── Update ──────────────────────────────────────────────────────────────────

export const updateModuleSchema = z.object({
	name: z.string().min(1).max(200).optional(),
	description: z.string().max(5000).optional(),
	status: z.enum(moduleStatusEnum).optional(),
	sortOrder: z.number().int().nonnegative().optional()
});
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;

// ── Response ────────────────────────────────────────────────────────────────

export const moduleResponseSchema = z.object({
	id: moduleIdSchema,
	milestoneId: milestoneIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	status: z.enum(moduleStatusEnum),
	sortOrder: z.number().int()
});
export type ModuleResponse = z.infer<typeof moduleResponseSchema>;
