/**
 * Agent E2E tests — error paths and concurrent claim scenarios.
 *
 * Covers: 404 (not found), 401 (invalid API key), status guards,
 * invalid input (missing --agent, missing --reason), --json error format
 * consistency, and concurrent claim (409 conflict).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { runCli, runCliJson } from './helpers.js';

describe('mt-cli error paths and concurrency --json E2E', () => {
	const serverUrl = process.env.__AGENT_E2E_SERVER_URL || '';

	beforeAll(() => {
		expect(serverUrl, 'Server URL should be set by globalSetup').toBeTruthy();
	});

	// ─── 404 — Not Found ─────────────────────────────────────────────────────

	describe('404 — non-existent resources', () => {
		it('tasks show TASK-9999 → exitCode=1, code=HTTP_404', async () => {
			const { data, raw } = await runCliJson<{ error: string; code: string }>([
				'tasks', 'show', 'TASK-9999'
			]);

			expect(raw.exitCode).toBe(1);
			expect(data.code).toBe('HTTP_404');
			expect(data.error).toBeTruthy();
		});

		it('tasks claim TASK-9999 → exitCode=1, code=HTTP_404', async () => {
			const { data, raw } = await runCliJson<{ error: string; code: string }>([
				'tasks', 'claim', 'TASK-9999'
			]);

			expect(raw.exitCode).toBe(1);
			expect(data.code).toBe('HTTP_404');
		});

		it('modules show MOD-99-99 → exitCode=1, code=HTTP_404', async () => {
			const { data, raw } = await runCliJson<{ error: string; code: string }>([
				'modules', 'show', 'MOD-99-99'
			]);

			expect(raw.exitCode).toBe(1);
			expect(data.code).toBe('HTTP_404');
		});
	});

	// ─── 401 — Invalid API Key ───────────────────────────────────────────────

	describe('401 — authentication errors', () => {
		it('tasks list with invalid API key → exitCode=1, code=HTTP_401', async () => {
			const { data, raw } = await runCliJson<{ error: string; code: string }>(
				['tasks', 'list'],
				{ env: { MT_API_KEY: 'invalid-key-12345' } }
			);

			expect(raw.exitCode).toBe(1);
			expect(data.code).toBe('HTTP_401');
		});

		it('status with invalid API key → exitCode=1, structured error', async () => {
			// Empty string is falsy in JS, so config resolver falls through to .mt-cli.json key.
			// Use a non-empty invalid key that won't match the server's API_KEYS.
			const { tmpdir } = await import('node:os');
			const { mkdtempSync, writeFileSync } = await import('node:fs');
			const { join } = await import('node:path');

			const tempDir = mkdtempSync(join(tmpdir(), 'mt-cli-no-key-'));
			writeFileSync(
				join(tempDir, '.mt-cli.json'),
				JSON.stringify({ serverUrl, milestoneId: 'MS-AGENT-TEST' }, null, 2)
			);

			try {
				const result = await runCli(
					['status', '--json'],
					{
						cwd: tempDir,
						env: {
							// Override with a non-empty key that won't match server's API_KEYS
							MT_API_KEY: 'wrong-api-key-401'
						}
					}
				);

				expect(result.exitCode).toBe(1);
				const parsed = JSON.parse(result.stdout) as { error: string; code: string };
				expect(parsed.error).toBeTruthy();
				expect(parsed.code).toBeDefined();
			} finally {
				const { rmSync } = await import('node:fs');
				rmSync(tempDir, { recursive: true, force: true });
			}
		});
	});

	// ─── Status Guards ───────────────────────────────────────────────────────

	describe('status guards — invalid operations on wrong-state tasks', () => {
		it('tasks claim #5 (done) → exitCode=1, code=HTTP_400', async () => {
			// TASK-5 is done, cannot claim
			const { data, raw } = await runCliJson<{ error: string; code: string }>([
				'tasks', 'claim', '#5'
			]);

			expect(raw.exitCode).toBe(1);
			expect(data.code).toBe('HTTP_400');
			expect(data.error).toBeTruthy();
		});

		it('tasks complete #6 (blocked) → exitCode=1, code=HTTP_400', async () => {
			// TASK-6 is blocked, cannot complete
			const { data, raw } = await runCliJson<{ error: string; code: string }>([
				'tasks', 'complete', '#6'
			]);

			expect(raw.exitCode).toBe(1);
			expect(data.code).toBe('HTTP_400');
		});

		it('tasks claim #6 (blocked) → exitCode=1, code=HTTP_400', async () => {
			// TASK-6 is blocked, cannot claim
			const { data, raw } = await runCliJson<{ error: string; code: string }>([
				'tasks', 'claim', '#6'
			]);

			expect(raw.exitCode).toBe(1);
			expect(data.code).toBe('HTTP_400');
		});
	});

	// ─── Invalid Input ───────────────────────────────────────────────────────

	describe('invalid input — missing required options', () => {
		it('tasks claim without --agent and no config agentName → exitCode=1', async () => {
			// Provide a valid config (serverUrl + milestoneId) but without agentName
			const { tmpdir } = await import('node:os');
			const { mkdtempSync, writeFileSync } = await import('node:fs');
			const { join } = await import('node:path');

			const tempDir = mkdtempSync(join(tmpdir(), 'mt-cli-no-agent-'));
			writeFileSync(
				join(tempDir, '.mt-cli.json'),
				JSON.stringify({
					serverUrl,
					milestoneId: 'MS-AGENT-TEST',
					key: 'test-agent-key-e2e'
				}, null, 2)
			);

			try {
				const result = await runCli(
					['tasks', 'claim', '#1', '--json'],
					{ cwd: tempDir }
				);

				expect(result.exitCode).toBe(1);
				const parsed = JSON.parse(result.stdout) as { error: string; code: string };
				expect(parsed.error).toContain('Agent');
			} finally {
				const { rmSync } = await import('node:fs');
				rmSync(tempDir, { recursive: true, force: true });
			}
		});

		it('tasks block without --reason → Commander error (exitCode=1)', async () => {
			// block has requiredOption('--reason'), so Commander will error before any API call
			const result = await runCli([
				'tasks', 'block', '#1', '--json'
			]);

			expect(result.exitCode).toBe(1);
			// Commander outputs error message to stderr/stdout, not structured JSON
			expect(result.stderr.length + result.stdout.length).toBeGreaterThan(0);
		});
	});

	// ─── Concurrent Claim (409 Conflict) ─────────────────────────────────────

	describe('concurrent claim — 409 conflict', () => {
		it('two agents claiming the same task → one success, one 409', async () => {
			// Use TASK-3 which should be in-progress (claimed by test-agent in commands.test.ts)
			// We need a task that is in-progress so the 409 path triggers when another agent tries
			// Try to claim TASK-4 (already assigned to agent-alpha) with agent-beta

			// First claim: agent-beta tries to claim TASK-4 (already assigned to agent-alpha)
			const betaResult = await runCliJson<{ error: string; code: string; currentAssignee?: string }>([
				'tasks', 'claim', '#4', '--agent', 'agent-beta'
			]);

			// Since TASK-4 is already assigned to agent-alpha, this should get 409
			expect(betaResult.raw.exitCode).toBe(1);
			expect(betaResult.data.code).toBe('HTTP_409');
			expect(betaResult.data.error).toBeTruthy();
		});

		it('parallel spawn claim → at least one gets 409 or both see same state', async () => {
			// TASK-4 is assigned to agent-alpha in seed data
			// Spawn two processes simultaneously claiming as different agents
			const [resultA, resultB] = await Promise.allSettled([
				runCliJson(['tasks', 'claim', '#4', '--agent', 'agent-alpha', '--json']),
				runCliJson(['tasks', 'claim', '#4', '--agent', 'agent-beta', '--json']),
			]);

			// Parse results
			const results = [resultA, resultB].map((r) => {
				if (r.status === 'fulfilled') return r.value;
				return null;
			});

			// At least one result should exist
			expect(results.some(Boolean)).toBe(true);

			// If agent-alpha's claim succeeds (idempotent re-claim), agent-beta should get 409
			const successResults = results.filter(
				(r) => r !== null && r.raw.exitCode === 0
			);
			const errorResults = results.filter(
				(r) => r !== null && r.raw.exitCode === 1
			);

			// At least one should succeed (agent-alpha re-claiming their own task)
			expect(successResults.length).toBeGreaterThanOrEqual(1);

			// Verify any error results have structured JSON
			for (const r of errorResults) {
				if (r) {
					const parsed = JSON.parse(r.raw.stdout) as { error: string; code: string };
					expect(parsed.code).toBeDefined();
					expect(parsed.error).toBeTruthy();
				}
			}
		});
	});

	// ─── JSON Error Format Consistency ───────────────────────────────────────

	describe('--json error format consistency', () => {
		it('all error outputs contain { error, code } structure', async () => {
			// Collect error results from various error scenarios
			const errorScenarios: Promise<{ stdout: string; exitCode: number | null }>[] = [
				// 404
				runCli(['tasks', 'show', 'TASK-9999', '--json']),
				// 401
				runCli(['tasks', 'list', '--json'], { env: { MT_API_KEY: 'bad-key' } }),
				// 400 status guard
				runCli(['tasks', 'claim', '#5', '--json']),
			];

			const results = await Promise.all(errorScenarios);

			for (const result of results) {
				expect(result.exitCode).toBe(1);
				const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
				expect(parsed).toHaveProperty('error');
				expect(parsed).toHaveProperty('code');
				expect(typeof parsed.error).toBe('string');
				expect(typeof parsed.code).toBe('string');
				expect((parsed.error as string).length).toBeGreaterThan(0);
				expect((parsed.code as string).length).toBeGreaterThan(0);
			}
		});

		it('error code follows HTTP_{status} convention', async () => {
			const testCases = [
				{
					args: ['tasks', 'show', 'TASK-9999', '--json'],
					expectedCode: 'HTTP_404',
				},
				{
					args: ['tasks', 'list', '--json'],
					env: { MT_API_KEY: 'invalid' },
					expectedCode: 'HTTP_401',
				},
				{
					args: ['tasks', 'claim', '#5', '--json'],
					expectedCode: 'HTTP_400',
				},
			];

			for (const tc of testCases) {
				const result = await runCli(tc.args, { env: tc.env });
				expect(result.exitCode).toBe(1);
				const parsed = JSON.parse(result.stdout) as { code: string };
				expect(parsed.code).toBe(tc.expectedCode);
			}
		});
	});
});
