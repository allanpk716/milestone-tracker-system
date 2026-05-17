/**
 * Conversation service — CRUD operations for milestone-scoped AI conversations.
 *
 * Conversations are 1:1 with milestones (enforced by UNIQUE on milestoneId).
 * Messages belong to conversations and cascade-delete with them.
 */

import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { conversations, messages } from '$lib/db/schema.js';
import { createLogger } from './logger.js';

const logger = createLogger('conversation-service');

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConversationWithMessages {
	id: string;
	milestoneId: string;
	systemPrompt: string | null;
	createdAt: string;
	messages: MessageRow[];
}

export interface MessageRow {
	id: string;
	conversationId: string;
	role: 'user' | 'assistant';
	content: string;
	modulesJson: string | null;
	createdAt: string;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new conversation for a milestone.
 * Returns 409-like error if one already exists.
 */
export async function createConversation(
	db: BetterSQLite3Database<any>,
	milestoneId: string,
	opts?: { customSystemPrompt?: string }
): Promise<ConversationWithMessages> {
	const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	// Check for existing conversation
	const existing = await db
		.select()
		.from(conversations)
		.where(eq(conversations.milestoneId, milestoneId))
		.get();

	if (existing) {
		throw new Error('CONFLICT');
	}

	await db.insert(conversations).values({
		id,
		milestoneId,
		systemPrompt: opts?.customSystemPrompt ?? null
	}).run();

	logger.info('Created conversation', { id, milestoneId });

	return {
		id,
		milestoneId,
		systemPrompt: opts?.customSystemPrompt ?? null,
		createdAt: new Date().toISOString(),
		messages: []
	};
}

/**
 * Get or create a conversation for a milestone.
 */
export async function getOrCreateConversation(
	db: BetterSQLite3Database<any>,
	milestoneId: string,
	opts?: { customSystemPrompt?: string }
): Promise<ConversationWithMessages> {
	const existing = await getByMilestoneId(db, milestoneId);
	if (existing) return existing;
	return createConversation(db, milestoneId, opts);
}

/**
 * Get a conversation with all its messages by milestone ID.
 */
export async function getByMilestoneId(
	db: BetterSQLite3Database<any>,
	milestoneId: string
): Promise<ConversationWithMessages | null> {
	const conv = await db
		.select()
		.from(conversations)
		.where(eq(conversations.milestoneId, milestoneId))
		.get();

	if (!conv) return null;

	const msgs = await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, conv.id))
		.all();

	return {
		id: conv.id,
		milestoneId: conv.milestoneId,
		systemPrompt: conv.systemPrompt,
		createdAt: new Date(Number(conv.createdAt)).toISOString(),
		messages: msgs.map(formatMessage)
	};
}

/**
 * Add a message to a conversation.
 */
export async function addMessage(
	db: BetterSQLite3Database<any>,
	conversationId: string,
	role: 'user' | 'assistant',
	content: string,
	opts?: { modulesJson?: string }
): Promise<MessageRow> {
	const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	await db.insert(messages).values({
		id,
		conversationId,
		role,
		content,
		modulesJson: opts?.modulesJson ?? null
	}).run();

	logger.info('Added message', { conversationId, role, contentLength: content.length });

	return {
		id,
		conversationId,
		role,
		content,
		modulesJson: opts?.modulesJson ?? null,
		createdAt: new Date().toISOString()
	};
}

/**
 * Get messages for a conversation.
 */
export async function getMessages(
	db: BetterSQLite3Database<any>,
	conversationId: string
): Promise<MessageRow[]> {
	const msgs = await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, conversationId))
		.all();

	return msgs.map(formatMessage);
}

/**
 * Delete a conversation and all its messages (cascade).
 */
export async function deleteConversation(
	db: BetterSQLite3Database<any>,
	milestoneId: string
): Promise<boolean> {
	const conv = await db
		.select()
		.from(conversations)
		.where(eq(conversations.milestoneId, milestoneId))
		.get();

	if (!conv) return false;

	// Delete messages first (cascade may not work with drizzle)
	await db.delete(messages)
		.where(eq(messages.conversationId, conv.id))
		.run();

	await db.delete(conversations)
		.where(eq(conversations.id, conv.id))
		.run();

	logger.info('Deleted conversation', { id: conv.id, milestoneId });
	return true;
}

/**
 * Update the system prompt for a conversation.
 */
export async function updateSystemPrompt(
	db: BetterSQLite3Database<any>,
	milestoneId: string,
	systemPrompt: string | null
): Promise<void> {
	await db.update(conversations)
		.set({ systemPrompt })
		.where(eq(conversations.milestoneId, milestoneId))
		.run();

	logger.info('Updated system prompt', { milestoneId, hasPrompt: !!systemPrompt });
}



// ── Helpers ──────────────────────────────────────────────────────────────────

function formatMessage(row: any): MessageRow {
	return {
		id: row.id,
		conversationId: row.conversationId,
		role: row.role,
		content: row.content,
		modulesJson: row.modulesJson,
		createdAt: new Date(Number(row.createdAt)).toISOString()
	};
}
