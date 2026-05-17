import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/db/schema.js';
import {
	createConversation,
	getOrCreateConversation,
	getByMilestoneId,
	addMessage,
	getMessages,
	deleteConversation,
	updateSystemPrompt
} from './conversation-service.js';
import { createMilestone } from './milestone-service.js';

// ── Test database setup ──────────────────────────────────────────────────────

let db: ReturnType<typeof drizzle>;
let sqliteDb: Database.Database;

const CREATE_TABLES_SQL = `
CREATE TABLE milestones (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_md TEXT,
  git_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX milestone_status_idx ON milestones (status);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  milestone_id TEXT NOT NULL UNIQUE REFERENCES milestones(id) ON DELETE CASCADE,
  system_prompt TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  modules_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
`;

beforeAll(() => {
	sqliteDb = new Database(':memory:');
	sqliteDb.pragma('journal_mode = WAL');
	sqliteDb.pragma('foreign_keys = ON');
	sqliteDb.exec(CREATE_TABLES_SQL);
	db = drizzle(sqliteDb, { schema });
});

afterAll(() => {
	sqliteDb.close();
});

beforeEach(() => {
	sqliteDb.exec('DELETE FROM messages');
	sqliteDb.exec('DELETE FROM conversations');
	sqliteDb.exec('DELETE FROM milestones');
});

// ── Helper ───────────────────────────────────────────────────────────────────

async function seedMilestone(title: string) {
	return createMilestone(db, { title });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('conversation-service', () => {
	describe('createConversation', () => {
		it('creates a conversation for a milestone', async () => {
			const ms = await seedMilestone('Test');
			const conv = await createConversation(db, ms.id);

			expect(conv.id).toBeTruthy();
			expect(conv.milestoneId).toBe(ms.id);
			expect(conv.systemPrompt).toBeNull();
			expect(conv.messages).toEqual([]);
		});

		it('creates with custom system prompt', async () => {
			const ms = await seedMilestone('Test');
			const conv = await createConversation(db, ms.id, {
				customSystemPrompt: 'You are a project planner.'
			});

			expect(conv.systemPrompt).toBe('You are a project planner.');
		});

		it('throws CONFLICT if conversation already exists', async () => {
			const ms = await seedMilestone('Test');
			await createConversation(db, ms.id);

			await expect(createConversation(db, ms.id)).rejects.toThrow('CONFLICT');
		});
	});

	describe('getOrCreateConversation', () => {
		it('creates if none exists', async () => {
			const ms = await seedMilestone('Test');
			const conv = await getOrCreateConversation(db, ms.id);

			expect(conv).toBeTruthy();
			expect(conv.milestoneId).toBe(ms.id);
		});

		it('returns existing conversation without creating duplicate', async () => {
			const ms = await seedMilestone('Test');
			const first = await createConversation(db, ms.id);
			const second = await getOrCreateConversation(db, ms.id);

			expect(second.id).toBe(first.id);
		});
	});

	describe('getByMilestoneId', () => {
		it('returns null if no conversation exists', async () => {
			const ms = await seedMilestone('Test');
			const result = await getByMilestoneId(db, ms.id);
			expect(result).toBeNull();
		});

		it('returns conversation with messages', async () => {
			const ms = await seedMilestone('Test');
			const conv = await createConversation(db, ms.id);
			await addMessage(db, conv.id, 'user', 'Hello');
			await addMessage(db, conv.id, 'assistant', 'Hi there', { modulesJson: '[{"name":"Mod1"}]' });

			const result = await getByMilestoneId(db, ms.id);

			expect(result).toBeTruthy();
			expect(result!.messages).toHaveLength(2);
			expect(result!.messages[0].role).toBe('user');
			expect(result!.messages[1].role).toBe('assistant');
			expect(result!.messages[1].modulesJson).toBe('[{"name":"Mod1"}]');
		});
	});

	describe('addMessage', () => {
		it('adds a user message', async () => {
			const ms = await seedMilestone('Test');
			const conv = await createConversation(db, ms.id);
			const msg = await addMessage(db, conv.id, 'user', 'Break down my project');

			expect(msg.id).toBeTruthy();
			expect(msg.conversationId).toBe(conv.id);
			expect(msg.role).toBe('user');
			expect(msg.content).toBe('Break down my project');
			expect(msg.modulesJson).toBeNull();
		});

		it('adds an assistant message with modules', async () => {
			const ms = await seedMilestone('Test');
			const conv = await createConversation(db, ms.id);
			const modules = JSON.stringify([{ name: 'Auth' }, { name: 'API' }]);
			const msg = await addMessage(db, conv.id, 'assistant', 'Here are modules', { modulesJson: modules });

			expect(msg.role).toBe('assistant');
			expect(msg.modulesJson).toBe(modules);
		});
	});

	describe('getMessages', () => {
		it('returns empty array for new conversation', async () => {
			const ms = await seedMilestone('Test');
			const conv = await createConversation(db, ms.id);
			const msgs = await getMessages(db, conv.id);

			expect(msgs).toEqual([]);
		});

		it('returns all messages in order', async () => {
			const ms = await seedMilestone('Test');
			const conv = await createConversation(db, ms.id);
			await addMessage(db, conv.id, 'user', 'First');
			await addMessage(db, conv.id, 'assistant', 'Second');
			await addMessage(db, conv.id, 'user', 'Third');

			const msgs = await getMessages(db, conv.id);
			expect(msgs).toHaveLength(3);
			expect(msgs[0].content).toBe('First');
			expect(msgs[1].content).toBe('Second');
			expect(msgs[2].content).toBe('Third');
		});
	});

	describe('deleteConversation', () => {
		it('deletes conversation and its messages', async () => {
			const ms = await seedMilestone('Test');
			const conv = await createConversation(db, ms.id);
			await addMessage(db, conv.id, 'user', 'Hello');

			const deleted = await deleteConversation(db, ms.id);
			expect(deleted).toBe(true);

			const result = await getByMilestoneId(db, ms.id);
			expect(result).toBeNull();
		});

		it('returns false if no conversation exists', async () => {
			const ms = await seedMilestone('Test');
			const deleted = await deleteConversation(db, ms.id);
			expect(deleted).toBe(false);
		});
	});

	describe('updateSystemPrompt', () => {
		it('updates the system prompt', async () => {
			const ms = await seedMilestone('Test');
			await createConversation(db, ms.id);

			await updateSystemPrompt(db, ms.id, 'New custom prompt');

			const conv = await getByMilestoneId(db, ms.id);
			expect(conv!.systemPrompt).toBe('New custom prompt');
		});

		it('clears the system prompt when set to null', async () => {
			const ms = await seedMilestone('Test');
			await createConversation(db, ms.id, { customSystemPrompt: 'Old prompt' });

			await updateSystemPrompt(db, ms.id, null);

			const conv = await getByMilestoneId(db, ms.id);
			expect(conv!.systemPrompt).toBeNull();
		});
	});
});
