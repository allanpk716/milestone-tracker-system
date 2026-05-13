import { z } from 'zod';

// ── Login request ───────────────────────────────────────────────────────────

export const loginRequestSchema = z.object({
	password: z.string().min(1, 'Password is required')
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

// ── Login response ──────────────────────────────────────────────────────────

export const loginResponseSchema = z.object({
	token: z.string().min(1)
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;
