import { z } from 'zod';

// ── Pagination ──────────────────────────────────────────────────────────────

export const paginationQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	perPage: z.coerce.number().int().positive().max(100).default(20)
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
	z.object({
		data: z.array(itemSchema),
		pagination: z.object({
			page: z.number().int().positive(),
			perPage: z.number().int().positive(),
			total: z.number().int().nonnegative(),
			totalPages: z.number().int().nonnegative()
		})
	});

// ── Error response ──────────────────────────────────────────────────────────

export const fieldErrorSchema = z.object({
	field: z.string(),
	message: z.string()
});
export type FieldError = z.infer<typeof fieldErrorSchema>;

export const errorResponseSchema = z.object({
	error: z.object({
		code: z.string(),
		message: z.string(),
		details: z.array(fieldErrorSchema).optional()
	})
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// ── ID formats ──────────────────────────────────────────────────────────────

export const milestoneIdSchema = z.string().regex(/^MS-\d+$/, 'Must match MS-{seq}');
export const moduleIdSchema = z.string().regex(/^MOD-\d+-\d+$/, 'Must match MOD-{ms_seq}-{seq}');
export const taskIdSchema = z.string().regex(/^TASK-\d+$/, 'Must match TASK-{seq}');

// ── Source markdown size limit (1 MB) ───────────────────────────────────────

export const SOURCE_MD_MAX_BYTES = 1_048_576;
export const sourceMdSchema = z
	.string()
	.max(SOURCE_MD_MAX_BYTES, `source_md must be under ${SOURCE_MD_MAX_BYTES} bytes`);
