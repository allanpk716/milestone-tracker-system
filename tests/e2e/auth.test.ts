/**
 * E2E tests — Login and API authentication.
 *
 * Covers:
 * - Login with valid password → 200 + token
 * - Login with invalid password → 401
 * - Login with missing password → 400
 * - API access with Bearer API key → 200
 * - API access without auth → 401
 * - API access with invalid Bearer token → 401
 * - Cookie session auth → login, extract cookie, authenticated request → 200
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
	api,
	rawApi,
	E2E_ADMIN_PASSWORD,
	E2E_API_KEY,
	authenticatedApi,
	loginWithCookie,
	apiWithCookie
} from './helpers.js';

describe('Auth', () => {
	describe('POST /api/auth/login', () => {
		it('returns 200 and token for valid password', async () => {
			const { status, body } = await rawApi('/api/auth/login', {
				method: 'POST',
				body: JSON.stringify({ password: E2E_ADMIN_PASSWORD })
			});

			expect(status).toBe(200);
			expect(body).toHaveProperty('token');
			expect(typeof (body as { token: string }).token).toBe('string');
			expect((body as { token: string }).token.length).toBeGreaterThan(10);
		});

		it('returns 401 for invalid password', async () => {
			const { status, body } = await rawApi('/api/auth/login', {
				method: 'POST',
				body: JSON.stringify({ password: 'wrong-password' })
			});

			expect(status).toBe(401);
			expect(body).toMatchObject({
				error: 'unauthorized'
			});
		});

		it('returns 400 for missing password', async () => {
			const { status, body } = await rawApi('/api/auth/login', {
				method: 'POST',
				body: JSON.stringify({})
			});

			expect(status).toBe(400);
			expect(body).toMatchObject({
				error: 'validation_error'
			});
		});
	});

	describe('API auth (Bearer API key)', () => {
		it('grants access to GET /api/milestones with valid API key', async () => {
			const { status, body } = await authenticatedApi('/api/milestones');

			expect(status).toBe(200);
			expect(Array.isArray(body)).toBe(true);
		});

		it('grants access using api() with E2E_API_KEY token', async () => {
			const { status, body } = await api('/api/milestones', { token: E2E_API_KEY });

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

	describe('API auth (Cookie session)', () => {
		let cookie: string;

		beforeAll(async () => {
			const result = await loginWithCookie();
			cookie = result.cookie;
		});

		it('grants access to GET /api/milestones with session cookie', async () => {
			const { status, body } = await apiWithCookie('/api/milestones', cookie);

			expect(status).toBe(200);
			expect(Array.isArray(body)).toBe(true);
		});

		it('returns 401 for GET /api/milestones with garbage cookie', async () => {
			const { status, body } = await apiWithCookie(
				'/api/milestones',
				'mt_session=garbage-value'
			);

			expect(status).toBe(401);
			expect(body).toMatchObject({
				error: 'unauthorized'
			});
		});
	});
});
