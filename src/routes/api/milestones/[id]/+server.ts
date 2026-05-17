import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { getMilestone, updateMilestone, deleteMilestone } from '$lib/server/milestone-service.js';
import { updateMilestoneSchema } from '$lib/schemas/index.js';
import { countModulesByMilestone } from '$lib/server/module-service.js';

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

	// Draft status guard: cannot change away from draft without modules
	if (parsed.data.status && parsed.data.status !== 'draft') {
		const existing = await getMilestone(db, params.id);
		if (existing && existing.status === 'draft') {
			const moduleCount = await countModulesByMilestone(db, params.id);
			if (moduleCount === 0) {
				return json(
					{ error: 'bad_request', message: '草稿里程碑无模块时无法变更为其他状态' },
					{ status: 400 }
				);
			}
		}
	}

	const milestone = await updateMilestone(db, params.id, parsed.data);
	if (!milestone) {
		return json({ error: 'not_found', message: `Milestone ${params.id} not found` }, { status: 404 });
	}
	return json(milestone);
};

export const DELETE: RequestHandler = async ({ params }) => {
	const result = await deleteMilestone(db, params.id);
	if (result.status === 'not_found') {
		return json({ error: 'not_found', message: 'Milestone not found' }, { status: 404 });
	}
	if (result.status === 'forbidden') {
		return json({ error: 'forbidden', message: result.message }, { status: 403 });
	}
	return json({ success: true, data: result.data });
};
