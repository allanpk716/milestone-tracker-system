import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { updateModule } from '$lib/server/module-service.js';
import { updateModuleSchema } from '$lib/schemas/index.js';

export const PATCH: RequestHandler = async ({ params, request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_json', message: 'Request body must be valid JSON' }, { status: 400 });
	}

	const parsed = updateModuleSchema.safeParse(body);
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

	const mod = await updateModule(db, params.id, parsed.data);
	if (!mod) {
		return json({ error: 'not_found', message: `Module ${params.id} not found` }, { status: 404 });
	}
	return json(mod);
};
