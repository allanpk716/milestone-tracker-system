/**
 * E2E tests — Core business flow.
 *
 * Full lifecycle: Create milestone → GET by ID → PATCH status → verify updated status.
 * Uses Bearer API key auth (E2E_API_KEY) for all requests.
 */
import { describe, it, expect } from 'vitest';
import { authenticatedApi, type MilestoneResponse } from './helpers.js';

describe('Core business flow', () => {
	let createdId: string;

	it('creates a milestone (POST /api/milestones)', async () => {
		const { status, body } = await authenticatedApi('/api/milestones', {
			method: 'POST',
			body: JSON.stringify({
				title: `E2E Test Milestone ${Date.now()}`
			})
		});

		expect(status).toBe(201);
		const milestone = body as MilestoneResponse;
		expect(milestone).toHaveProperty('id');
		expect(milestone.title).toContain('E2E Test Milestone');
		expect(milestone.status).toBe('draft');

		createdId = milestone.id;
	});

	it('gets the milestone by ID (GET /api/milestones/:id)', async () => {
		expect(createdId).toBeDefined();

		const { status, body } = await authenticatedApi(`/api/milestones/${createdId}`);

		expect(status).toBe(200);
		const milestone = body as MilestoneResponse;
		expect(milestone.id).toBe(createdId);
		expect(milestone.status).toBe('draft');
	});

	it('updates milestone status to in-progress (PATCH /api/milestones/:id)', async () => {
		const { status, body } = await authenticatedApi(`/api/milestones/${createdId}`, {
			method: 'PATCH',
			body: JSON.stringify({ status: 'in-progress' })
		});

		expect(status).toBe(200);
		const milestone = body as MilestoneResponse;
		expect(milestone.id).toBe(createdId);
		expect(milestone.status).toBe('in-progress');
	});

	it('reflects the updated status on re-fetch', async () => {
		const { status, body } = await authenticatedApi(`/api/milestones/${createdId}`);

		expect(status).toBe(200);
		const milestone = body as MilestoneResponse;
		expect(milestone.status).toBe('in-progress');
	});

	it('returns 404 for non-existent milestone', async () => {
		const { status, body } = await authenticatedApi('/api/milestones/NON-EXISTENT-999');

		expect(status).toBe(404);
		expect(body).toMatchObject({
			error: 'not_found'
		});
	});

	it('returns 400 for invalid status in PATCH', async () => {
		const { status, body } = await authenticatedApi(`/api/milestones/${createdId}`, {
			method: 'PATCH',
			body: JSON.stringify({ status: 'invalid-status' })
		});

		expect(status).toBe(400);
		expect(body).toMatchObject({
			error: 'validation_error'
		});
	});
});
