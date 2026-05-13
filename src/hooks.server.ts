import { redirect, json } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { checkAuth } from '$lib/server/auth.js';
import { createLogger } from '$lib/server/logger.js';

const logger = createLogger('request');

/** Paths to skip from request logging (static assets, health checks). */
const SKIP_LOG_PATHS = ['/_app/', '/favicon', '/api/health'];

export const handle: Handle = async ({ event, resolve }) => {
	const { url, request, cookies } = event;
	const path = url.pathname;

	// Skip auth for static assets and prerendered pages
	if (path.startsWith('/_app/') || path.startsWith('/favicon')) {
		return resolve(event);
	}

	// Skip request logging for health checks and static assets
	const shouldLog = !SKIP_LOG_PATHS.some((p) => path === p || path.startsWith(p));

	// Measure request duration
	const start = performance.now();

	// Log incoming request
	if (shouldLog) {
		const userAgent = request.headers.get('user-agent') ?? 'unknown';
		logger.info('Incoming request', { method: request.method, path, userAgent });
	}

	// Public routes — no auth required
	const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout', '/api/health'];
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
		return logResponse(resolve(event), start, request.method, path, shouldLog);
	}

	// ── API routes: require auth (cookie or bearer) ──
	if (path.startsWith('/api/')) {
		const cookieHeader = request.headers.get('cookie');
		const authHeader = request.headers.get('authorization');
		const result = checkAuth(cookieHeader, authHeader);

		if (!result.authenticated) {
			// Return 401 JSON for API routes
			const response = json(
				{
					error: 'unauthorized',
					message: result.reason === 'invalid_bearer_token' ? '无效的 API Key' : '请先登录'
				},
				{ status: 401 }
			);
			return logResponse(Promise.resolve(response), start, request.method, path, shouldLog);
		}

		// Attach auth method to locals for downstream use
		event.locals.authMethod = result.method;
		return logResponse(resolve(event), start, request.method, path, shouldLog);
	}

	// ── Page routes: require cookie auth, redirect to /login ──
	const cookieHeader = request.headers.get('cookie');
	const authHeader = request.headers.get('authorization');
	const result = checkAuth(cookieHeader, authHeader);

	if (!result.authenticated) {
		throw redirect(302, '/login');
	}

	event.locals.authMethod = result.method;
	return logResponse(resolve(event), start, request.method, path, shouldLog);
};

/** Wrap response promise with duration logging. */
function logResponse(
	responsePromise: Response | Promise<Response>,
	start: number,
	method: string,
	path: string,
	shouldLog: boolean
): Response | Promise<Response> {
	if (!shouldLog) return responsePromise;

	return Promise.resolve(responsePromise).then((response) => {
		const durationMs = Math.round(performance.now() - start);
		logger.info('Request completed', { method, path, status: response.status, durationMs });
		return response;
	});
}
