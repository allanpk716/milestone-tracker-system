/**
 * Vitest globalTeardown — stops server and cleans up temp files.
 */
import { readFileSync, rmSync, existsSync } from 'node:fs';
import { stopServer, cleanup } from './helpers.js';

export default async function globalTeardown() {
	console.log('\n[agent-e2e] Global teardown starting...');

	// Read state file to get db path
	const stateFile = process.env.__AGENT_E2E_STATE_FILE;
	if (stateFile && existsSync(stateFile)) {
		try {
			const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
			const dbPath = state.dbPath;

			// Stop server
			await stopServer();
			console.log('[agent-e2e] Server stopped');

			// Cleanup temp files
			cleanup(dbPath);
			console.log(`[agent-e2e] Cleaned up: ${dbPath}`);
		} finally {
			// Remove state file
			rmSync(stateFile, { force: true });
		}
	} else {
		// Fallback: just try to stop server
		await stopServer();
		console.log('[agent-e2e] Server stopped (no state file)');
	}

	console.log('[agent-e2e] Teardown complete');
}
