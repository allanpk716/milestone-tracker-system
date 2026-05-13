import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { getTask, adminTaskAction, updateTask } from '$lib/server/task-service.js';
import { adminTaskActionSchema, updateTaskSchema } from '$lib/schemas/index.js';

export const GET: RequestHandler = async ({ params }) => {
	const task = await getTask(db, params.id);
	if (!task) {
		return json({ error: 'not_found', message: `Task ${params.id} not found` }, { status: 404 });
	}
	return json(task);
};

export const PUT: RequestHandler = async ({ params, request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_json', message: 'Request body must be valid JSON' }, { status: 400 });
	}

	const parsed = updateTaskSchema.safeParse(body);
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

	const result = await updateTask(db, params.id, parsed.data);
	if (result.error === 'not_found') {
		return json({ error: 'not_found', message: `Task ${params.id} not found` }, { status: 404 });
	}
	return json(result.task);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_json', message: 'Request body must be valid JSON' }, { status: 400 });
	}

	const parsed = adminTaskActionSchema.safeParse(body);
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

	const result = await adminTaskAction(db, params.id, parsed.data);
	if (result.error === 'not_found') {
		return json({ error: 'not_found', message: `Task ${params.id} not found` }, { status: 404 });
	}
	return json(result.task);
};
