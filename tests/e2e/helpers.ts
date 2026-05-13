/**
 * E2E test helpers — shared configuration and API client utilities.
 *
 * Uses native Node.js fetch (Node 22+). No external HTTP libraries needed.
 */

// ── Configuration ────────────────────────────────────────────────────────────

export const E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://172.18.200.47:30002';
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'admin123';
export const E2E_API_KEY = process.env.E2E_API_KEY || 'dev-api-key-2025';

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

// ── API Client ───────────────────────────────────────────────────────────────

/** Perform an authenticated request using the session token from login. */
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

	const url = `${E2E_BASE_URL}${path}`;
	const res = await fetch(url, { ...fetchOptions, headers });

	let body: unknown;
	const contentType = res.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		body = await res.json();
	} else {
		body = await res.text();
	}

	return { status: res.status, body, headers: res.headers };
}

/** Login and return the session token. Throws on non-200. */
export async function login(password: string = E2E_ADMIN_PASSWORD): Promise<string> {
	const { status, body } = await api('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify({ password })
	});

	if (status !== 200 || typeof body !== 'object' || body === null || !('token' in body)) {
		throw new Error(`Login failed: status=${status}, body=${JSON.stringify(body)}`);
	}

	return (body as LoginResponse).token;
}
