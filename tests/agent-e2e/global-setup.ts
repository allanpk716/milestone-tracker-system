/**
 * Vitest globalSetup — creates temp DB, seeds data, starts server, writes CLI config.
 *
 * Communicates the db path to globalTeardown via a temp file.
 */
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { seedDatabase, startServer, writeCliConfig, TEST_PORT, cleanup } from './helpers.js';

const DB_PATH = join(tmpdir(), `mt-agent-e2e-setup-${Date.now()}.db`);
const STATE_FILE = join(tmpdir(), `mt-agent-e2e-state-${process.pid}.json`);

export default async function globalSetup() {
	console.log('\n[agent-e2e] Global setup starting...');

	// 1. Create and seed temp database
	const dbPath = seedDatabase(DB_PATH);
	console.log(`[agent-e2e] Database seeded: ${dbPath}`);

	// 2. Start SvelteKit server
	const server = await startServer(dbPath);
	console.log(`[agent-e2e] Server started: ${server.url}`);

	// 3. Write CLI config
	writeCliConfig(server.url);

	// 4. Write state file for teardown
	writeFileSync(
		STATE_FILE,
		JSON.stringify({ dbPath, pid: process.pid })
	);
	console.log(`[agent-e2e] State file written: ${STATE_FILE}`);

	// 5. Store for global access via process.env
	process.env.__AGENT_E2E_DB_PATH = dbPath;
	process.env.__AGENT_E2E_STATE_FILE = STATE_FILE;
	process.env.__AGENT_E2E_SERVER_URL = server.url;
}
