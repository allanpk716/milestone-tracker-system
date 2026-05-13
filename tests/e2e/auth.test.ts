/**
 * E2E tests — Login and API authentication.
 *
 * Covers:
 * - Login with valid password → 200 + token
 * - Login with invalid password → 401
 * - API access with Bearer token → 200
 * - API access without token → 401
 * - API access with invalid token → 401
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { api, login, E2E_ADMIN_PASSWORD, type MilestoneResponse } from './helpers.js';

describe('Auth', () => {
	describe('POST /api/auth/login', () => {
		it('returns 200 and token for valid password', async () => {
			const { status, body } = await api('/api/auth/login', {
				method: 'POST',
				body: JSON.stringify({ password: E2E_ADMIN_PASSWORD })
			});

			expect(status).toBe(200);
			expect(body).toHaveProperty('token');
			expect(typeof (body as { token: string }).token).toBe('string');
			expect((body as { token: string }).token.length).toBeGreaterThan(10);
		});

		it('returns 401 for invalid password', async () => {
			const { status, body } = await api('/api/auth/login', {
				method: 'POST',
				body: JSON.stringify({ password: 'wrong-password' })
			});

			expect(status).toBe(401);
			expect(body).toMatchObject({
				error: 'unauthorized'
			});
		});

		it('returns 400 for missing password', async () => {
			const { status, body } = await api('/api/auth/login', {
				method: 'POST',
				body: JSON.stringify({})
			});

			expect(status).toBe(400);
			expect(body).toMatchObject({
				error: 'validation_error'
			});
		});
	});

	describe('API auth (Bearer token)', () => {
		let token: string;

		beforeAll(async () => {
			token = await login();
		});

		it('grants access to GET /api/milestones with valid token', async () => {
			const { status, body } = await api('/api/milestones', { token });

			expect(status).toBe(200);
			expect(Array.isArray(body)).toBe(true);
		});

		it('returns 401 for GET /api/milestones without token', async () => {
			const { status, body } = await api('/api/milestones');

			expect(status).toBe(401);
			expect(body).toMatchObject({
				error: 'unauthorized'
			});
		});

		it('returns 401 for GET /api/milestones with invalid token', async () => {
			const { status, body } = await api('/api/milestones', {
				token: 'invalid-token-12345'
			});

			expect(status).toBe(401);
			expect(body).toMatchObject({
				error: 'unauthorized'
			});
		});
	});
});
