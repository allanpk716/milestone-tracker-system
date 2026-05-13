import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/db/index.js';
import { getMilestone } from '$lib/server/milestone-service.js';

export const load: PageServerLoad = async ({ params }) => {
	const milestone = await getMilestone(db, params.id);

	if (!milestone) {
		throw error(404, `里程碑 ${params.id} 不存在`);
	}

	// Only allow preview for draft milestones
	if (milestone.status !== 'draft') {
		throw redirect(302, `/milestones/${params.id}`);
	}

	return {
		milestone: {
			id: milestone.id,
			title: milestone.title,
			sourceMd: milestone.sourceMd ?? null,
			status: milestone.status,
			createdAt: milestone.createdAt
		}
	};
};
