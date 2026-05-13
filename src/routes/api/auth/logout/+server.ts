import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { AUTH_COOKIE_NAME } from '$lib/server/auth.js';

export const POST: RequestHandler = async ({ cookies }) => {
	// Clear the session cookie
	cookies.delete(AUTH_COOKIE_NAME, { path: '/' });

	return json({ message: '已退出登录' });
};
