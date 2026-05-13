/**
 * E2E tests — Health check endpoint.
 *
 * GET /api/health should return 200 with { status, version, uptime, db }.
 */
import { describe, it, expect } from 'vitest';
import { api, type HealthResponse } from './helpers.js';

describe('GET /api/health', () => {
	it('returns 200 with ok status', async () => {
		const { status, body } = await api('/api/health');

		expect(status).toBe(200);
		expect(body).toMatchObject({
			status: 'ok',
			db: 'connected'
		});

		const health = body as HealthResponse;
		expect(typeof health.version).toBe('string');
		expect(typeof health.uptime).toBe('number');
		expect(health.uptime).toBeGreaterThan(0);
	});

	it('responds quickly (under 5s)', async () => {
		const start = performance.now();
		const { status } = await api('/api/health');
		const elapsed = performance.now() - start;

		expect(status).toBe(200);
		expect(elapsed).toBeLessThan(5_000);
	});
});
