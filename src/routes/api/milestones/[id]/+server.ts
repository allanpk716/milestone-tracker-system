import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { getMilestone, updateMilestone } from '$lib/server/milestone-service.js';
import { updateMilestoneSchema } from '$lib/schemas/index.js';

export const GET: RequestHandler = async ({ params }) => {
	const milestone = await getMilestone(db, params.id);
	if (!milestone) {
		return json({ error: 'not_found', message: `Milestone ${params.id} not found` }, { status: 404 });
	}
	return json(milestone);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_json', message: 'Request body must be valid JSON' }, { status: 400 });
	}

	const parsed = updateMilestoneSchema.safeParse(body);
	if (!parsed.success) {
		return json(
			{
				error: 'validation_error',
				message: 'Validation failed',
				details: parsed.error.issues.map((i) => ({
					field: i.path.join('.'),
					message: i.message
				}))
			},
			{ status: 400 }
		);
	}

	const milestone = await updateMilestone(db, params.id, parsed.data);
	if (!milestone) {
		return json({ error: 'not_found', message: `Milestone ${params.id} not found` }, { status: 404 });
	}
	return json(milestone);
};
