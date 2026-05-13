import { z } from 'zod';
import { milestoneStatusEnum } from '../db/schema.js';
import { sourceMdSchema, milestoneIdSchema } from './common.js';

// ── Create ──────────────────────────────────────────────────────────────────

export const createMilestoneSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200, 'Title must be under 200 characters'),
	sourceMd: sourceMdSchema.optional(),
	gitUrl: z.string().url('Invalid URL').optional().or(z.literal(''))
});
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

// ── Update ──────────────────────────────────────────────────────────────────

export const updateMilestoneSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	sourceMd: sourceMdSchema.optional(),
	gitUrl: z.string().url().optional().or(z.literal('')),
	status: z.enum(milestoneStatusEnum).optional()
});
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

// ── Response ────────────────────────────────────────────────────────────────

export const milestoneResponseSchema = z.object({
	id: milestoneIdSchema,
	title: z.string(),
	sourceMd: z.string().nullable(),
	gitUrl: z.string().nullable(),
	status: z.enum(milestoneStatusEnum),
	createdAt: z.string().datetime() // ISO 8601
});
export type MilestoneResponse = z.infer<typeof milestoneResponseSchema>;
