/**
 * Prompt API — manage custom system prompt for a conversation.
 *
 * GET    /api/milestones/:id/conversation/prompt  — Get current prompt (custom or default)
 * PUT    /api/milestones/:id/conversation/prompt  — Update custom prompt
 * DELETE /api/milestones/:id/conversation/prompt  — Reset to default prompt
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { getByMilestoneId, updateSystemPrompt } from '$lib/server/conversation-service.js';
import { DEFAULT_SYSTEM_PROMPT } from '$lib/server/decompose-service.js';
import { updateSystemPromptSchema } from '$lib/schemas/conversation.js';

// ── GET: Current prompt ─────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ params }) => {
	const conversation = await getByMilestoneId(db, params.id);

	return json({
		defaultPrompt: DEFAULT_SYSTEM_PROMPT,
		customPrompt: conversation?.systemPrompt ?? null,
		activePrompt: conversation?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT
	});
};

// ── PUT: Update prompt ──────────────────────────────────────────────────────

export const PUT: RequestHandler = async ({ params, request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'bad_request', message: 'Invalid JSON body' }, { status: 400 });
	}

	const parsed = updateSystemPromptSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: 'validation_error', details: parsed.error.issues }, { status: 400 });
	}

	await updateSystemPrompt(db, params.id, parsed.data.systemPrompt);

	return json({ ok: true, systemPrompt: parsed.data.systemPrompt });
};

// ── DELETE: Reset to default ────────────────────────────────────────────────

export const DELETE: RequestHandler = async ({ params }) => {
	await updateSystemPrompt(db, params.id, null);

	return json({ ok: true, systemPrompt: DEFAULT_SYSTEM_PROMPT });
};
