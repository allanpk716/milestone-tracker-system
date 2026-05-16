import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// ── Configuration ───────────────────────────────────────────────────────────

/** Whether auth is enabled (ADMIN_PASSWORD is set and non-empty). */
export function isAuthEnabled(): boolean {
	return !!process.env.ADMIN_PASSWORD;
}

function getEnvOrThrow(key: string): string {
	const val = process.env[key];
	if (!val) throw new Error(`Missing required env var: ${key}`);
	return val;
}

/** Derive a signing secret from ADMIN_PASSWORD (always available in production). */
function getSigningSecret(): string {
	const pw = process.env.ADMIN_PASSWORD || 'dev-mode-no-password';
	// Use HMAC of a fixed salt with the password as key to derive a stable secret
	return createHmac('sha256', pw).update('milestone-tracker-session-salt').digest('hex');
}

/** Parse comma-separated API_KEYS from .env */
function getApiKeys(): string[] {
	const raw = process.env.API_KEYS || '';
	return raw
		.split(',')
		.map((k) => k.trim())
		.filter(Boolean);
}

// ── Session Management (stateless signed tokens) ────────────────────────────
// Token format: `{randomHex}.{hmac-sha256-hex}`
// This is stateless — no server-side session store needed.

const SESSION_COOKIE_NAME = 'mt_session';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface Session {
	token: string;
	signedToken: string;
	createdAt: number;
	maxAge: number;
}

/** Create a new signed session token. */
export function createSession(): Session {
	const token = randomBytes(32).toString('hex');
	const signature = createHmac('sha256', getSigningSecret()).update(token).digest('hex');
	const signedToken = `${token}.${signature}`;
	return {
		token,
		signedToken,
		createdAt: Date.now(),
		maxAge: SESSION_MAX_AGE_MS
	};
}

/** Verify a signed session token. Returns true if valid and not expired. */
export function verifySession(signedToken: string, maxAge: number = SESSION_MAX_AGE_MS): boolean {
	const lastDot = signedToken.lastIndexOf('.');
	if (lastDot === -1) return false;

	const token = signedToken.substring(0, lastDot);
	const providedSignature = signedToken.substring(lastDot + 1);

	if (!token || !providedSignature) return false;

	const expectedSignature = createHmac('sha256', getSigningSecret()).update(token).digest('hex');

	try {
		return timingSafeEqual(
			Buffer.from(providedSignature, 'hex'),
			Buffer.from(expectedSignature, 'hex')
		);
	} catch {
		return false;
	}
}

/** Destroy a session by returning a cookie that immediately expires. */
export function destroySessionCookie(): { name: string; value: string; options: SessionCookieOptions } {
	return {
		name: SESSION_COOKIE_NAME,
		value: '',
		options: {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 0
		}
	};
}

/** Build a Set-Cookie header value for a new session. */
export function buildSessionCookie(session: Session): string {
	const opts = sessionCookieOptions(session.maxAge);
	return `${SESSION_COOKIE_NAME}=${session.signedToken}; Path=${opts.path}; HttpOnly${opts.secure ? '; Secure' : ''}; SameSite=${opts.sameSite}; Max-Age=${Math.floor(opts.maxAge / 1000)}`;
}

// ── Bearer Token Validation ─────────────────────────────────────────────────

/** Validate a Bearer token against API_KEYS from .env. */
export function validateBearerToken(token: string): boolean {
	const apiKeys = getApiKeys();
	const tokenBuf = Buffer.from(token);
	return apiKeys.some((key) => {
		const keyBuf = Buffer.from(key);
		if (tokenBuf.length !== keyBuf.length) return false;
		return timingSafeEqual(tokenBuf, keyBuf);
	});
}

// ── Cookie Helpers ──────────────────────────────────────────────────────────

export interface SessionCookieOptions {
	path: string;
	httpOnly: boolean;
	secure: boolean;
	sameSite: 'lax' | 'strict';
	maxAge: number; // seconds
}

function sessionCookieOptions(maxAgeMs: number): SessionCookieOptions {
	return {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: Math.floor(maxAgeMs / 1000)
	};
}

// ── Auth Middleware Logic ────────────────────────────────────────────────────
// Extracted as pure functions for testability. Used by hooks.server.ts.

export type AuthResult =
	| { authenticated: true; method: 'cookie' | 'bearer' }
	| { authenticated: false; reason: string };

/** Extract the signed session token from a Cookie header string. */
export function extractSessionCookie(cookieHeader: string | null): string | null {
	if (!cookieHeader) return null;
	const match = cookieHeader.match(/(?:^|;\s*)mt_session=([^;]+)/);
	return match ? match[1] : null;
}

/** Extract Bearer token from Authorization header. */
export function extractBearerToken(authHeader: string | null): string | null {
	if (!authHeader) return null;
	const parts = authHeader.split(' ');
	if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
	return parts[1] || null;
}

/**
 * Check authentication from cookie and/or authorization headers.
 * Returns the auth result without performing any side effects.
 */
export function checkAuth(
	cookieHeader: string | null,
	authHeader: string | null
): AuthResult {
	// 1. Try Bearer token first (CLI/API usage)
	const bearer = extractBearerToken(authHeader);
	if (bearer) {
		if (validateBearerToken(bearer)) {
			return { authenticated: true, method: 'bearer' };
		}
		return { authenticated: false, reason: 'invalid_bearer_token' };
	}

	// 2. Try session cookie (Web usage)
	const sessionToken = extractSessionCookie(cookieHeader);
	if (sessionToken) {
		if (verifySession(sessionToken)) {
			return { authenticated: true, method: 'cookie' };
		}
		return { authenticated: false, reason: 'invalid_session' };
	}

	return { authenticated: false, reason: 'no_credentials' };
}

/** Validate a login password against ADMIN_PASSWORD env var. */
export function validatePassword(password: string): boolean {
	const adminPassword = process.env.ADMIN_PASSWORD;
	if (!adminPassword) return true; // No password configured = auth disabled
	const pwBuf = Buffer.from(password);
	const adminBuf = Buffer.from(adminPassword);
	if (pwBuf.length !== adminBuf.length) return false;
	return timingSafeEqual(pwBuf, adminBuf);
}

// ── Exports for hooks ───────────────────────────────────────────────────────

export const AUTH_COOKIE_NAME = SESSION_COOKIE_NAME;
