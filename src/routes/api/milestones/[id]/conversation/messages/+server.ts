/**
 * POST /api/milestones/:id/conversation/messages
 *
 * Send a follow-up message to an existing conversation and stream the AI response.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { getByMilestoneId, addMessage, getMessages } from '$lib/server/conversation-service.js';
import { getMilestone } from '$lib/server/milestone-service.js';
import { streamDecomposeMulti } from '$lib/server/decompose-service.js';
import { LlmClient } from '$lib/server/llm-client.js';
import { sendMessageSchema } from '$lib/schemas/conversation.js';
import type { HistoryMessage } from '$lib/server/decompose-service.js';

function formatSSE(event: Record<string, unknown>): string {
	return `event: ${(event as any).type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export const POST: RequestHandler = async ({ params, request }) => {
	// Validate body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'bad_request', message: 'Invalid JSON body' }, { status: 400 });
	}

	const parsed = sendMessageSchema.safeParse(body);
	if (!parsed.success) {
		return json(
			{ error: 'validation_error', details: parsed.error.issues },
			{ status: 400 }
		);
	}

	// Check conversation exists
	const conversation = await getByMilestoneId(db, params.id);
	if (!conversation) {
		return json({ error: 'not_found', message: 'No conversation found' }, { status: 404 });
	}

	// Get milestone for sourceMd
	const milestone = await getMilestone(db, params.id);
	if (!milestone?.sourceMd) {
		return json({ error: 'bad_request', message: 'No source markdown' }, { status: 400 });
	}

	// Build user message content (with optional module references)
	let userContent = parsed.data.content;
	if (parsed.data.referenceModules && parsed.data.referenceModules.length > 0) {
		userContent += `\n\n[引用的模块:\n${parsed.data.referenceModules.map((m, i) => `${i + 1}. ${m.name}: ${m.description || '无描述'}`).join('\n')}]`;
	}

	// Save user message
	await addMessage(db, conversation.id, 'user', userContent);

	// Build history from all messages (including the new one)
	const allMessages = await getMessages(db, conversation.id);
	const history: HistoryMessage[] = allMessages.map(m => ({
		role: m.role,
		content: m.content,
		modulesJson: m.modulesJson
	}));

	// Stream AI response
	const generator = streamDecomposeMulti(
		history,
		milestone.sourceMd,
		new LlmClient(),
		{ customSystemPrompt: conversation.systemPrompt }
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

				// Save assistant message
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
