import { z } from 'zod';
import { decomposeModuleSchema } from './decompose.js';

// ── Message schemas ─────────────────────────────────────────────────────────

export const messageRoleSchema = z.enum(['user', 'assistant']);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export const messageSchema = z.object({
	id: z.string(),
	conversationId: z.string(),
	role: messageRoleSchema,
	content: z.string(),
	modulesJson: z.string().nullable().optional(),
	createdAt: z.string()
});
export type Message = z.infer<typeof messageSchema>;

// ── Conversation schemas ────────────────────────────────────────────────────

export const conversationSchema = z.object({
	id: z.string(),
	milestoneId: z.string(),
	systemPrompt: z.string().nullable().optional(),
	createdAt: z.string(),
	messages: z.array(messageSchema).optional()
});
export type Conversation = z.infer<typeof conversationSchema>;

// ── Request schemas ─────────────────────────────────────────────────────────

export const createConversationSchema = z.object({
	customSystemPrompt: z.string().max(10000).optional()
});
export type CreateConversationRequest = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = z.object({
	content: z.string().min(1).max(10000),
	referenceModules: z.array(decomposeModuleSchema).optional()
});
export type SendMessageRequest = z.infer<typeof sendMessageSchema>;

export const updateSystemPromptSchema = z.object({
	systemPrompt: z.string().max(10000)
});
export type UpdateSystemPromptRequest = z.infer<typeof updateSystemPromptSchema>;
