/**
 * Conversation API — CRUD + streaming for milestone AI conversations.
 *
 * GET    /api/milestones/:id/conversation        — Load conversation with messages
 * POST   /api/milestones/:id/conversation        — Create conversation + stream first response
 * DELETE /api/milestones/:id/conversation        — Delete conversation + messages
 *
 * POST   /api/milestones/:id/conversation/messages — Send follow-up message + stream response
 * PUT    /api/milestones/:id/conversation/prompt   — Update system prompt
 * DELETE /api/milestones/:id/conversation/prompt   — Reset to default prompt
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { getMilestone } from '$lib/server/milestone-service.js';
import {
	createConversation,
	getByMilestoneId,
	deleteConversation,
	addMessage,
	getMessages,
	updateSystemPrompt
} from '$lib/server/conversation-service.js';
import { streamDecomposeMulti } from '$lib/server/decompose-service.js';
import { LlmClient } from '$lib/server/llm-client.js';
import {
	createConversationSchema,
	updateSystemPromptSchema
} from '$lib/schemas/conversation.js';
import type { HistoryMessage } from '$lib/server/decompose-service.js';

// ── SSE helper ──────────────────────────────────────────────────────────────

function formatSSE(event: Record<string, unknown>): string {
	return `event: ${(event as any).type}\ndata: ${JSON.stringify(event)}\n\n`;
}

// ── GET: Load conversation ──────────────────────────────────────────────────

export const GET: RequestHandler = async ({ params }) => {
	const conversation = await getByMilestoneId(db, params.id);

	if (!conversation) {
		return json(null, { status: 200 });
	}

	return json(conversation);
};

// ── POST: Create conversation + stream ──────────────────────────────────────

export const POST: RequestHandler = async ({ params, request }) => {
	// Validate milestone
	const milestone = await getMilestone(db, params.id);
	if (!milestone) {
		return json({ error: 'not_found', message: `Milestone ${params.id} not found` }, { status: 404 });
	}
	if (!milestone.sourceMd) {
		return json({ error: 'bad_request', message: 'No source markdown' }, { status: 400 });
	}

	// Parse optional body
	let customPrompt: string | undefined;
	try {
		const body = await request.json();
		const parsed = createConversationSchema.safeParse(body);
		if (parsed.success) {
			customPrompt = parsed.data.customSystemPrompt;
		}
	} catch {
		// Empty body is fine
	}

	// Create conversation (fails with CONFLICT if exists)
	let conversation;
	try {
		conversation = await createConversation(db, params.id, { customSystemPrompt: customPrompt });
	} catch (err: any) {
		if (err.message === 'CONFLICT') {
			return json(
				{ error: 'conflict', message: 'Conversation already exists. Delete it first.' },
				{ status: 409 }
			);
		}
		throw err;
	}

	// Stream first AI response
	const generator = streamDecomposeMulti(
		[],
		milestone.sourceMd,
		new LlmClient(),
		{ customSystemPrompt: customPrompt }
	);

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			let fullText = '';
			let modulesJson: string | null = null;

			try {
				for await (const event of generator) {
					controller.enqueue(encoder.encode(formatSSE(event as any)));

					if ((event as any).type === 'chunk' && (event as any).stage === 'text') {
						fullText += (event as any).content;
					}
					if ((event as any).type === 'chunk' && (event as any).stage === 'modules') {
						modulesJson = JSON.stringify((event as any).modules);
					}
				}

				// Save the assistant message to DB
				if (fullText) {
					await addMessage(db, conversation.id, 'assistant', fullText, { modulesJson });
				}
			} catch (err: any) {
				try {
					controller.enqueue(encoder.encode(formatSSE({
						type: 'error',
						stage: 'streaming',
						message: err.message
					})));
				} catch {
					// controller closed
				}
			} finally {
				try { controller.close(); } catch { /* already closed */ }
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
};

// ── DELETE: Delete conversation ──────────────────────────────────────────────

export const DELETE: RequestHandler = async ({ params }) => {
	const deleted = await deleteConversation(db, params.id);
	if (!deleted) {
		return json({ error: 'not_found', message: 'No conversation found' }, { status: 404 });
	}
	return json({ ok: true });
};
