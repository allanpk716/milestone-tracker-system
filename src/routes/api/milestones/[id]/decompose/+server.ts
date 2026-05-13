/**
 * POST /api/milestones/:id/decompose
 *
 * Thin SSE wrapper around streamDecompose().
 * Validates preconditions (exists, has sourceMd, status=draft),
 * then streams DecomposeEvents as standard SSE.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { getMilestone } from '$lib/server/milestone-service.js';
import { streamDecompose } from '$lib/server/decompose-service.js';
import type { DecomposeEvent } from '$lib/schemas/decompose.js';

// ── SSE formatting helpers ──────────────────────────────────────────────────

function formatSSE(event: DecomposeEvent): string {
	return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

// ── Handler ──────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ params }) => {
	const milestone = await getMilestone(db, params.id);

	// 404 — milestone not found
	if (!milestone) {
		return json(
			{ error: 'not_found', message: `Milestone ${params.id} not found` },
			{ status: 404 }
		);
	}

	// 400 — no source markdown to decompose
	if (!milestone.sourceMd) {
		return json(
			{ error: 'bad_request', message: 'Milestone has no source markdown to decompose' },
			{ status: 400 }
		);
	}

	// 400 — only draft milestones can be decomposed
	if (milestone.status !== 'draft') {
		return json(
			{ error: 'bad_request', message: `Milestone status is '${milestone.status}', expected 'draft'` },
			{ status: 400 }
		);
	}

	// Stream SSE events from the decompose service
	const generator = streamDecompose(milestone.sourceMd);

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			try {
				for await (const event of generator) {
					controller.enqueue(encoder.encode(formatSSE(event)));
				}
				controller.close();
			} catch (err: any) {
				// If the controller is still open, send an error event and close
				try {
					const errorEvent: DecomposeEvent = {
						type: 'error',
						stage: 'streaming',
						message: err.message
					};
					controller.enqueue(encoder.encode(formatSSE(errorEvent)));
					controller.close();
				} catch {
					// Controller already closed — nothing to do
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
