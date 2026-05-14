/**
 * Smoke test — verifies the agent-e2e test infrastructure works.
 *
 * Tests that:
 * 1. Server started (by globalSetup)
 * 2. runCli() can spawn mt-cli
 * 3. runCliJson() parses JSON output
 * 4. CLI can connect to the server
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { runCli, runCliJson } from './helpers.js';

describe('Agent E2E Infrastructure', () => {
	const serverUrl = process.env.__AGENT_E2E_SERVER_URL || '';

	beforeAll(() => {
		expect(serverUrl, 'Server URL should be set by globalSetup').toBeTruthy();
	});

	it('runCli() spawns mt-cli and returns structured result', async () => {
		const result = await runCli(['--version']);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
		expect(result.stderr).toBe('');
	});

	it('runCli() captures stderr on error', async () => {
		const result = await runCli(['tasks', 'list'], {
			env: { MT_API_KEY: 'invalid-key' },
			cwd: process.cwd() // Avoid picking up .mt-cli.json
		});
		// Should fail because no config file in cwd
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr.length).toBeGreaterThan(0);
	});

	it('runCliJson() parses --json output for status command', async () => {
		const { data, raw } = await runCliJson(['status']);
		expect(raw.exitCode).toBe(0);
		expect(data).toHaveProperty('serverUrl');
		expect(data).toHaveProperty('milestoneId');
		expect(data).toHaveProperty('connected');
		expect(data.connected).toBe(true);
		expect(data).toHaveProperty('milestone');
		expect(data.milestone).toHaveProperty('id');
		expect(data.milestone).toHaveProperty('title');
	});

	it('CLI can list tasks via --json', async () => {
		const { data, raw } = await runCliJson(['tasks', 'list']);
		expect(raw.exitCode).toBe(0);
		expect(Array.isArray(data)).toBe(true);
		expect(data.length).toBeGreaterThan(0);
	});

	it('CLI status reports server reachable', async () => {
		const { data, raw } = await runCliJson(['status']);
		expect(raw.exitCode).toBe(0);
		expect(data.connected).toBe(true);
	});
});
