import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { listTasks } from '$lib/server/task-service.js';
import type { TaskStatus } from '$lib/db/schema.js';

export const GET: RequestHandler = async ({ url }) => {
	const filters: { status?: string; milestoneId?: string; moduleId?: string } = {};

	const status = url.searchParams.get('status');
	if (status) filters.status = status;

	const milestoneId = url.searchParams.get('milestoneId');
	if (milestoneId) filters.milestoneId = milestoneId;

	const moduleId = url.searchParams.get('moduleId');
	if (moduleId) filters.moduleId = moduleId;

	const taskList = await listTasks(db, filters);
	return json(taskList);
};
