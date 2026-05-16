import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── We test the pure auth functions directly (they're stateless, no DB needed) ──

// Must set env vars before importing the module (it reads at import time)
beforeEach(() => {
	process.env.ADMIN_PASSWORD = 'test_admin_password';
	process.env.API_KEYS = 'key_abc123,key_xyz789';
});

afterEach(() => {
	delete process.env.ADMIN_PASSWORD;
	delete process.env.API_KEYS;
});

const {
	createSession,
	verifySession,
	validateBearerToken,
	validatePassword,
	checkAuth,
	extractSessionCookie,
	extractBearerToken,
	destroySessionCookie,
	buildSessionCookie,
	AUTH_COOKIE_NAME
} = await import('./auth.js');

// ── Session Management ──────────────────────────────────────────────────────

describe('auth — session management', () => {
	it('creates a signed session with token and signature', () => {
		const session = createSession();
		expect(session.token).toBeDefined();
		expect(session.signedToken).toContain('.');
		expect(session.signedToken).toMatch(/^[a-f0-9]+\.[a-f0-9]+$/);
		expect(session.maxAge).toBe(24 * 60 * 60 * 1000);
	});

	it('verifies a valid signed token', () => {
		const session = createSession();
		expect(verifySession(session.signedToken)).toBe(true);
	});

	it('rejects tampered token', () => {
		const session = createSession();
		// Change a character in the token portion (before the dot)
		const dotIndex = session.signedToken.indexOf('.');
		const tampered =
			session.signedToken.substring(0, dotIndex) + '0' + session.signedToken.substring(dotIndex + 1);
		expect(verifySession(tampered)).toBe(false);
	});

	it('rejects token without dot separator', () => {
		expect(verifySession('nodothere')).toBe(false);
		expect(verifySession('')).toBe(false);
	});

	it('rejects empty string', () => {
		expect(verifySession('')).toBe(false);
	});

	it('rejects token with different secret (env changed)', () => {
		const session = createSession();
		process.env.ADMIN_PASSWORD = 'different_password';
		// Re-import to pick up new env — but since module caches, we test with original
		// The verifySession uses the same getSigningSecret() which reads env at call time
		expect(verifySession(session.signedToken)).toBe(false);
	});

	it('generates unique tokens on each call', () => {
		const s1 = createSession();
		const s2 = createSession();
		expect(s1.token).not.toBe(s2.token);
		expect(s1.signedToken).not.toBe(s2.signedToken);
	});

	it('buildSessionCookie returns a valid Set-Cookie string', () => {
		const session = createSession();
		const cookie = buildSessionCookie(session);
		expect(cookie).toContain('mt_session=');
		expect(cookie).toContain('Path=/');
		expect(cookie).toContain('HttpOnly');
		expect(cookie).toContain('SameSite=lax');
		expect(cookie).toContain('Max-Age=');
	});
});

// ── Session Destruction ─────────────────────────────────────────────────────

describe('auth — session destruction', () => {
	it('destroySessionCookie returns cookie with maxAge 0', () => {
		const cookie = destroySessionCookie();
		expect(cookie.name).toBe(AUTH_COOKIE_NAME);
		expect(cookie.value).toBe('');
		expect(cookie.options.maxAge).toBe(0);
		expect(cookie.options.httpOnly).toBe(true);
		expect(cookie.options.path).toBe('/');
	});
});

// ── Bearer Token ────────────────────────────────────────────────────────────

describe('auth — bearer token', () => {
	it('accepts a valid API key', () => {
		expect(validateBearerToken('key_abc123')).toBe(true);
		expect(validateBearerToken('key_xyz789')).toBe(true);
	});

	it('rejects an invalid API key', () => {
		expect(validateBearerToken('wrong_key')).toBe(false);
		expect(validateBearerToken('')).toBe(false);
	});

	it('handles empty API_KEYS env var', () => {
		process.env.API_KEYS = '';
		expect(validateBearerToken('key_abc123')).toBe(false);
	});

	it('handles missing API_KEYS env var', () => {
		delete process.env.API_KEYS;
		expect(validateBearerToken('key_abc123')).toBe(false);
	});
});

// ── Password Validation ─────────────────────────────────────────────────────

describe('auth — password validation', () => {
	it('accepts correct password', () => {
		expect(validatePassword('test_admin_password')).toBe(true);
	});

	it('rejects wrong password', () => {
		expect(validatePassword('wrong')).toBe(false);
	});

	it('rejects empty password', () => {
		expect(validatePassword('')).toBe(false);
	});

	it('returns true when ADMIN_PASSWORD is not set (auth disabled)', () => {
		delete process.env.ADMIN_PASSWORD;
		expect(validatePassword('anything')).toBe(true);
	});
});

// ── Extract Helpers ─────────────────────────────────────────────────────────

describe('auth — extract helpers', () => {
	it('extracts session cookie from cookie header', () => {
		const cookie = 'mt_session=abc123.sig; other=val';
		expect(extractSessionCookie(cookie)).toBe('abc123.sig');
	});

	it('returns null when no mt_session cookie', () => {
		expect(extractSessionCookie('other=val')).toBeNull();
		expect(extractSessionCookie('')).toBeNull();
		expect(extractSessionCookie(null)).toBeNull();
	});

	it('extracts bearer token from Authorization header', () => {
		expect(extractBearerToken('Bearer key_abc123')).toBe('key_abc123');
	});

	it('returns null for malformed Authorization header', () => {
		expect(extractBearerToken('Basic abc')).toBeNull();
		expect(extractBearerToken('Bearer')).toBeNull();
		expect(extractBearerToken('Bearer ')).toBeNull();
		expect(extractBearerToken('')).toBeNull();
		expect(extractBearerToken(null)).toBeNull();
	});
});

// ── Check Auth (full middleware logic) ──────────────────────────────────────

describe('auth — checkAuth', () => {
	it('authenticates via valid bearer token', () => {
		const result = checkAuth(null, 'Bearer key_abc123');
		expect(result.authenticated).toBe(true);
		if (result.authenticated) {
			expect(result.method).toBe('bearer');
		}
	});

	it('rejects invalid bearer token', () => {
		const result = checkAuth(null, 'Bearer wrong_key');
		expect(result.authenticated).toBe(false);
		if (!result.authenticated) {
			expect(result.reason).toBe('invalid_bearer_token');
		}
	});

	it('authenticates via valid session cookie', () => {
		const session = createSession();
		const result = checkAuth(`mt_session=${session.signedToken}`, null);
		expect(result.authenticated).toBe(true);
		if (result.authenticated) {
			expect(result.method).toBe('cookie');
		}
	});

	it('rejects invalid session cookie', () => {
		const result = checkAuth('mt_session=invalid.token', null);
		expect(result.authenticated).toBe(false);
		if (!result.authenticated) {
			expect(result.reason).toBe('invalid_session');
		}
	});

	it('returns no_credentials when no auth provided', () => {
		const result = checkAuth(null, null);
		expect(result.authenticated).toBe(false);
		if (!result.authenticated) {
			expect(result.reason).toBe('no_credentials');
		}
	});

	it('prefers bearer token over cookie when both present', () => {
		const session = createSession();
		// Bearer is valid, so it should use bearer method
		const result = checkAuth(`mt_session=${session.signedToken}`, 'Bearer key_abc123');
		expect(result.authenticated).toBe(true);
		if (result.authenticated) {
			expect(result.method).toBe('bearer');
		}
	});

	it('rejects bearer token and falls through (does not try cookie)', () => {
		const session = createSession();
		// Invalid bearer — should NOT fall through to cookie
		const result = checkAuth(`mt_session=${session.signedToken}`, 'Bearer wrong_key');
		expect(result.authenticated).toBe(false);
		if (!result.authenticated) {
			expect(result.reason).toBe('invalid_bearer_token');
		}
	});
});

// ── Integration: Login Flow ─────────────────────────────────────────────────

describe('auth — login flow integration', () => {
	it('correct password creates valid session', () => {
		expect(validatePassword('test_admin_password')).toBe(true);
		const session = createSession();
		expect(verifySession(session.signedToken)).toBe(true);
	});

	it('wrong password does not grant access', () => {
		expect(validatePassword('wrong')).toBe(false);
	});
});
