import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { createMilestone, listMilestones } from '$lib/server/milestone-service.js';
import { createMilestoneSchema } from '$lib/schemas/index.js';

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_json', message: 'Request body must be valid JSON' }, { status: 400 });
	}

	const parsed = createMilestoneSchema.safeParse(body);
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

	const milestone = await createMilestone(db, parsed.data);
	return json(milestone, { status: 201 });
};

export const GET: RequestHandler = async () => {
	const milestones = await listMilestones(db);
	return json(milestones);
};
