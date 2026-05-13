import { json } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/db/index.js';
import { listMilestones } from '$lib/server/milestone-service.js';

export const load: PageServerLoad = async () => {
	const milestones = await listMilestones(db);
	return { milestones };
};
