import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { createSession, validatePassword, buildSessionCookie, AUTH_COOKIE_NAME } from '$lib/server/auth.js';
import { loginRequestSchema } from '$lib/schemas/auth.js';

export const POST: RequestHandler = async ({ request, cookies }) => {
	// 1. Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_json', message: 'Request body must be valid JSON' }, { status: 400 });
	}

	const parsed = loginRequestSchema.safeParse(body);
	if (!parsed.success) {
		return json(
			{
				error: 'validation_error',
				message: 'Validation failed',
				details: parsed.error.issues.map((i) => ({
					field: i.path.join('.'),
					message: i.message
				}))
			},
			{ status: 400 }
		);
	}

	// 2. Validate password
	if (!validatePassword(parsed.data.password)) {
		return json({ error: 'unauthorized', message: '密码错误' }, { status: 401 });
	}

	// 3. Create session
	const session = createSession();

	// 4. Set HttpOnly session cookie
	cookies.set(AUTH_COOKIE_NAME, session.signedToken, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: Math.floor(session.maxAge / 1000)
	});

	// 5. Return success with token
	return json({ token: session.signedToken });
};
