import { defineConfig } from 'vitest/config';

/**
 * Agent E2E test configuration.
 *
 * Spawns mt-cli against a local SvelteKit server with a temp database.
 * Run: npx vitest run tests/agent-e2e/ --config tests/agent-e2e/agent-e2e.config.ts
 */
export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests/agent-e2e/**/*.test.ts'],
		testTimeout: 30_000,
		hookTimeout: 15_000,
		globalSetup: ['./tests/agent-e2e/global-setup.ts'],
		globalTeardown: ['./tests/agent-e2e/global-teardown.ts'],
		reporters: ['default', 'verbose'],
		outputFile: {
			json: 'tests/agent-e2e/results.json'
		},
		forceExit: true,
		pool: 'forks'
	}
});
