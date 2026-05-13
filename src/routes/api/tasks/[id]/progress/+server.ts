import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { progressTask } from '$lib/server/task-service.js';
import { progressTaskSchema } from '$lib/schemas/index.js';

export const POST: RequestHandler = async ({ params, request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_json', message: 'Request body must be valid JSON' }, { status: 400 });
	}

	const parsed = progressTaskSchema.safeParse(body);
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

	const result = await progressTask(db, params.id, parsed.data);

	if (result.error === 'not_found') {
		return json({ error: 'not_found', message: `Task ${params.id} not found` }, { status: 404 });
	}
	if (result.error === 'invalid_status') {
		return json(
			{
				error: 'invalid_status',
				message: `Cannot update progress on task in status: ${result.currentStatus}`,
				currentStatus: result.currentStatus
			},
			{ status: 400 }
		);
	}

	return json(result.task);
};
