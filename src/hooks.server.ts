import { redirect, json } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { checkAuth } from '$lib/server/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
	const { url, request, cookies } = event;
	const path = url.pathname;

	// Skip auth for static assets and prerendered pages
	if (path.startsWith('/_app/') || path.startsWith('/favicon')) {
		return resolve(event);
	}

	// Public routes — no auth required
	const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout'];
	if (publicRoutes.some((r) => path === r || path.startsWith(r + '/'))) {
		// If already authenticated and visiting /login, redirect to home
		if (path === '/login') {
			const cookieHeader = request.headers.get('cookie');
			const authHeader = request.headers.get('authorization');
			const result = checkAuth(cookieHeader, authHeader);
			if (result.authenticated) {
				throw redirect(302, '/');
			}
		}
		return resolve(event);
	}

	// ── API routes: require auth (cookie or bearer) ──
	if (path.startsWith('/api/')) {
		const cookieHeader = request.headers.get('cookie');
		const authHeader = request.headers.get('authorization');
		const result = checkAuth(cookieHeader, authHeader);

		if (!result.authenticated) {
			// Return 401 JSON for API routes
			return json(
				{
					error: 'unauthorized',
					message: result.reason === 'invalid_bearer_token' ? '无效的 API Key' : '请先登录'
				},
				{ status: 401 }
			);
		}

		// Attach auth method to locals for downstream use
		event.locals.authMethod = result.method;
		return resolve(event);
	}

	// ── Page routes: require cookie auth, redirect to /login ──
	const cookieHeader = request.headers.get('cookie');
	const authHeader = request.headers.get('authorization');
	const result = checkAuth(cookieHeader, authHeader);

	if (!result.authenticated) {
		throw redirect(302, '/login');
	}

	event.locals.authMethod = result.method;
	return resolve(event);
};
