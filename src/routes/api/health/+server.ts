import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/db/index.js';
import { createLogger } from '$lib/server/logger.js';
import { healthCheck } from './health-utils.js';
// @ts-expect-error — Vite handles JSON imports natively
import pkg from '../../../../package.json';

const logger = createLogger('health');

export const GET: RequestHandler = async () => {
	const { db: dbStatus } = await healthCheck(db);

	const response = {
		status: 'ok' as const,
		version: pkg.version,
		uptime: process.uptime(),
		db: dbStatus
	};

	logger.debug('Health check', { db: dbStatus });

	return json(response);
};
