/**
 * POST /api/milestones/:id/confirm
 *
 * Confirms a milestone's decomposed modules and tasks.
 * Validates body with confirmRequestSchema, calls confirmService,
 * returns JSON with created module/task IDs.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { getMilestone } from '$lib/server/milestone-service.js';
import { confirmMilestone } from '$lib/server/confirm-service.js';
import { confirmRequestSchema } from '$lib/schemas/confirm.js';

// ── Handler ──────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ params, request }) => {
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

	const parsed = confirmRequestSchema.safeParse(body);
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

	// Check milestone exists
	const milestone = await getMilestone(db, params.id);
	if (!milestone) {
		return json(
			{ error: { code: 'not_found', message: `Milestone ${params.id} not found` } },
			{ status: 404 }
		);
	}

	// Check status is draft
	if (milestone.status !== 'draft') {
		return json(
			{ error: { code: 'bad_request', message: `Milestone status is '${milestone.status}', expected 'draft'` } },
			{ status: 400 }
		);
	}

	// Execute confirm
	const result = await confirmMilestone(db, params.id, parsed.data.modules);

	if ('error' in result) {
		const status = result.error.code === 'not_found' ? 404 : 400;
		return json({ error: result.error }, { status });
	}

	return json({
		milestoneId: params.id,
		modules: result.data
	});
};
