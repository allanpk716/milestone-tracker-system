/**
 * E2E test helpers — shared configuration and API client utilities.
 *
 * Uses native Node.js fetch (Node 22+). No external HTTP libraries needed.
 *
 * Two auth mechanisms are supported:
 *   1. Bearer API key — for CLI/API usage, validated against API_KEYS env var.
 *   2. Cookie session — for web usage, signed mt_session cookie from login.
 */

// ── Configuration ────────────────────────────────────────────────────────────

export const E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://172.18.200.47:30002';
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'changeme';
export const E2E_API_KEY = process.env.E2E_API_KEY || 'mt_key_for_agent_1';

/** Session cookie name — must match AUTH_COOKIE_NAME on the server. */
const SESSION_COOKIE_NAME = 'mt_session';

// ── Types ────────────────────────────────────────────────────────────────────

export interface HealthResponse {
	status: 'ok';
	version: string;
	uptime: number;
	db: 'connected' | 'error';
}

export interface LoginResponse {
	token: string;
}

export interface LoginWithCookieResult {
	/** Signed session token (returned in JSON body). */
	token: string;
	/** Raw Set-Cookie header value (e.g. "mt_session=...; Path=/; HttpOnly; ..."). */
	cookie: string;
}

export interface MilestoneResponse {
	id: string;
	title: string;
	sourceMd: string | null;
	gitUrl: string | null;
	status: 'draft' | 'in-progress' | 'completed' | 'archived';
	createdAt: string;
}

export interface ApiError {
	error: string;
	message: string;
	details?: Array<{ field: string; message: string }>;
}

// ── Low-level helpers ────────────────────────────────────────────────────────

/**
 * Perform an HTTP request and return status, parsed body, and raw headers.
 * No auth headers are injected — callers must supply their own.
 */
export async function rawApi(
	path: string,
	options: RequestInit = {}
): Promise<{ status: number; body: unknown; headers: Headers }> {
	const headers = new Headers(options.headers);
	if (!headers.has('Content-Type') && options.body) {
		headers.set('Content-Type', 'application/json');
	}

	const url = `${E2E_BASE_URL}${path}`;
	const res = await fetch(url, { ...options, headers });

	let body: unknown;
	const contentType = res.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		body = await res.json();
	} else {
		body = await res.text();
	}

	return { status: res.status, body, headers: res.headers };
}

// ── Bearer API key auth ─────────────────────────────────────────────────────

/**
 * Perform an authenticated request using a Bearer token (API key).
 * When `token` is omitted, sends an unauthenticated request.
 */
export async function api(
	path: string,
	options: RequestInit & { token?: string } = {}
): Promise<{ status: number; body: unknown; headers: Headers }> {
	const { token, ...fetchOptions } = options;
	const headers = new Headers(fetchOptions.headers);

	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}
	if (!headers.has('Content-Type') && fetchOptions.body) {
		headers.set('Content-Type', 'application/json');
	}

	return rawApi(path, { ...fetchOptions, headers });
}

/** Convenience: authenticated request pre-wired with the E2E_API_KEY. */
export async function authenticatedApi(
	path: string,
	options: Omit<RequestInit, 'headers'> = {}
): Promise<{ status: number; body: unknown; headers: Headers }> {
	return api(path, { ...options, token: E2E_API_KEY });
}

// ── Cookie session auth ─────────────────────────────────────────────────────

/**
 * Perform an authenticated request using a cookie-based session.
 * Pass the full `cookie` string from `loginWithCookie()`.
 */
export async function apiWithCookie(
	path: string,
	cookie: string,
	options: RequestInit = {}
): Promise<{ status: number; body: unknown; headers: Headers }> {
	const headers = new Headers(options.headers);
	headers.set('Cookie', cookie);
	if (!headers.has('Content-Type') && options.body) {
		headers.set('Content-Type', 'application/json');
	}

	return rawApi(path, { ...options, headers });
}

// ── Login helpers ────────────────────────────────────────────────────────────

/**
 * Login and return the session token only.
 * Use for testing the login endpoint itself.
 * The returned token is a signed session token — NOT a valid Bearer token.
 */
export async function login(password: string = E2E_ADMIN_PASSWORD): Promise<string> {
	const { status, body } = await rawApi('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify({ password })
	});

	if (status !== 200 || typeof body !== 'object' || body === null || !('token' in body)) {
		throw new Error(`Login failed: status=${status}, body=${JSON.stringify(body)}`);
	}

	return (body as LoginResponse).token;
}

/**
 * Login and return both the session token and the Set-Cookie header value.
 * Use for cookie-based auth testing — pass the returned `cookie` to `apiWithCookie()`.
 */
export async function loginWithCookie(
	password: string = E2E_ADMIN_PASSWORD
): Promise<LoginWithCookieResult> {
	const { status, body, headers } = await rawApi('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify({ password })
	});

	if (status !== 200 || typeof body !== 'object' || body === null || !('token' in body)) {
		throw new Error(`Login failed: status=${status}, body=${JSON.stringify(body)}`);
	}

	const setCookie = headers.get('set-cookie');
	if (!setCookie) {
		throw new Error(
			'Login succeeded but no Set-Cookie header was returned. ' +
				'The server should set a mt_session cookie on login.'
		);
	}

	// Extract just the cookie name=value portion for the Cookie header.
	// set-cookie may contain multiple cookies separated by commas within
	// attribute sections; grab up to the first semicolon.
	const cookieValue = setCookie.split(';')[0].trim();

	return {
		token: (body as LoginResponse).token,
		cookie: cookieValue
	};
}
