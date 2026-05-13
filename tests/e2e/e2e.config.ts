import { defineConfig } from 'vitest/config';

/**
 * E2E test configuration.
 *
 * Uses node environment (native fetch in Node 22) and targets tests under tests/e2e/.
 * Run explicitly: npx vitest run tests/e2e/ --config tests/e2e/e2e.config.ts
 */
export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests/e2e/**/*.test.ts'],
		testTimeout: 15_000,
		hookTimeout: 10_000,
		reporters: ['default', 'verbose'],
		outputFile: {
			json: 'tests/e2e/results.json'
		}
	}
});
