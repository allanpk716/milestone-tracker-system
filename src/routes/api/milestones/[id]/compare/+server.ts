/**
 * POST /api/milestones/:id/compare
 *
 * Streams LLM comparison of source markdown vs confirmed modules as SSE.
 * Validates milestone exists, then streams CompareEvents.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { getMilestone } from '$lib/server/milestone-service.js';
import { streamCompare } from '$lib/server/compare-service.js';
import { compareRequestSchema } from '$lib/schemas/confirm.js';
import type { CompareEvent } from '$lib/schemas/confirm.js';

// ── SSE formatting helpers ──────────────────────────────────────────────────

function formatSSE(event: CompareEvent): string {
	return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

// ── Handler ──────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ params, request }) => {
	// Check milestone exists
	const milestone = await getMilestone(db, params.id);
	if (!milestone) {
		return json(
			{ error: { code: 'not_found', message: `Milestone ${params.id} not found` } },
			{ status: 404 }
		);
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json(
			{ error: { code: 'bad_request', message: 'Invalid JSON body' } },
			{ status: 400 }
		);
	}

	const parsed = compareRequestSchema.safeParse(body);
	if (!parsed.success) {
		const details = parsed.error.issues.map((i) => ({
			field: i.path.join('.'),
			message: i.message
		}));
		return json(
			{ error: { code: 'validation_error', message: 'Request validation failed', details } },
			{ status: 400 }
		);
	}

	const sourceMd = milestone.sourceMd ?? '';

	// Stream SSE events from the compare service
	const generator = streamCompare(sourceMd, parsed.data.modules);

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			try {
				for await (const event of generator) {
					controller.enqueue(encoder.encode(formatSSE(event)));
				}
				controller.close();
			} catch (err: any) {
				try {
					const errorEvent: CompareEvent = {
						type: 'error',
						stage: 'streaming',
						message: err.message
					};
					controller.enqueue(encoder.encode(formatSSE(errorEvent)));
					controller.close();
				} catch {
					// Controller already closed
				}
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
