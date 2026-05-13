import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { listModulesByMilestone, createModule } from '$lib/server/module-service.js';
import { createModuleSchema } from '$lib/schemas/index.js';

export const GET: RequestHandler = async ({ params }) => {
	const mods = await listModulesByMilestone(db, params.id);
	return json(mods);
};

export const POST: RequestHandler = async ({ params, request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_json', message: 'Request body must be valid JSON' }, { status: 400 });
	}

	const parsed = createModuleSchema.safeParse(body);
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

	const mod = await createModule(db, params.id, {
		name: parsed.data.name,
		description: parsed.data.description,
		sortOrder: parsed.data.sortOrder ?? 0
	});
	if (!mod) {
		return json({ error: 'not_found', message: `Milestone ${params.id} not found` }, { status: 404 });
	}
	return json(mod, { status: 201 });
};
