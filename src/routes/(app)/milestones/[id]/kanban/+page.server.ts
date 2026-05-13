import { json, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/db/index.js';
import { listKanbanData } from '$lib/server/task-service.js';

export const load: PageServerLoad = async ({ params }) => {
	const data = await listKanbanData(db, params.id);
	if (!data) {
		throw error(404, `里程碑 ${params.id} 不存在`);
	}
	return { kanban: data };
};
