/**
 * Agent E2E test helpers.
 *
 * Provides utilities to spawn mt-cli, start/stop the local SvelteKit server,
 * seed a temp database, and parse CLI JSON output.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';

// ── Paths ───────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');
const CLI_ENTRY = join(ROOT, 'packages', 'cli', 'dist', 'index.js');
const SERVER_ENTRY = join(ROOT, 'build', 'index.js');
const AGENT_E2E_DIR = join(ROOT, 'tests', 'agent-e2e');

// ── Types ───────────────────────────────────────────────────────────────────

export interface CliResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

export interface ServerProcess {
	proc: ChildProcess;
	port: number;
	url: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

export const TEST_API_KEY = 'test-agent-key-e2e';
export const TEST_PORT = 5199;
export const TEST_MILESTONE_ID = 'MS-AGENT-TEST';

// ── CLI Spawn ───────────────────────────────────────────────────────────────

/**
 * Spawn `node packages/cli/dist/index.js` with the given args.
 *
 * Returns structured result with stdout, stderr, and exit code.
 * Runs with cwd set to the agent-e2e directory so .mt-cli.json is picked up.
 */
export function runCli(
	args: string[],
	opts?: {
		env?: Record<string, string>;
		cwd?: string;
		timeout?: number;
	}
): Promise<CliResult> {
	const cwd = opts?.cwd || AGENT_E2E_DIR;
	const timeout = opts?.timeout || 15_000;

	return new Promise((resolve, reject) => {
		const proc = spawn('node', [CLI_ENTRY, ...args], {
			cwd,
			env: {
				...process.env,
				MT_API_KEY: TEST_API_KEY,
				...(opts?.env || {})
			},
			stdio: ['ignore', 'pipe', 'pipe']
		});

		const stdoutChunks: Buffer[] = [];
		const stderrChunks: Buffer[] = [];

		proc.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
		proc.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

		const timer = setTimeout(() => {
			proc.kill('SIGKILL');
			reject(new Error(`CLI timed out after ${timeout}ms: ${args.join(' ')}`));
		}, timeout);

		proc.on('close', (code) => {
			clearTimeout(timer);
			resolve({
				stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
				stderr: Buffer.concat(stderrChunks).toString('utf-8'),
				exitCode: code
			});
		});

		proc.on('error', (err) => {
			clearTimeout(timer);
			reject(err);
		});
	});
}

/**
 * Run CLI with --json flag and parse stdout as JSON.
 * Returns parsed object on success, or the raw CliResult on failure.
 */
export async function runCliJson<T = Record<string, unknown>>(
	args: string[],
	opts?: Parameters<typeof runCli>[1]
): Promise<{ data: T; raw: CliResult }> {
	const result = await runCli([...args, '--json'], opts);
	const data = JSON.parse(result.stdout) as T;
	return { data, raw: result };
}

// ── Server Management ───────────────────────────────────────────────────────

let serverInstance: ServerProcess | null = null;

/**
 * Start the SvelteKit server with a temp database.
 *
 * Sets DATABASE_PATH, PORT, API_KEYS, ADMIN_PASSWORD, and LOG_LEVEL env vars.
 * Waits for /api/health to return OK before resolving.
 */
export async function startServer(dbPath: string): Promise<ServerProcess> {
	if (serverInstance) {
		console.warn('[agent-e2e] Server already running, reusing');
		return serverInstance;
	}

	return new Promise((resolve, reject) => {
		const proc = spawn('node', [SERVER_ENTRY], {
			cwd: ROOT,
			env: {
				...process.env,
				DATABASE_PATH: dbPath,
				PORT: String(TEST_PORT),
				HOST: '127.0.0.1',
				API_KEYS: TEST_API_KEY,
				ADMIN_PASSWORD: 'test-admin-password',
				LOG_LEVEL: 'error',
				NODE_ENV: 'test'
			},
			stdio: ['ignore', 'pipe', 'pipe']
		});

		const url = `http://127.0.0.1:${TEST_PORT}`;
		let resolved = false;

		proc.stdout.on('data', (chunk: Buffer) => {
			const msg = chunk.toString();
			process.stdout.write(`[server:stdout] ${msg}`);
			if (!resolved && msg.includes('Listening')) {
				resolved = true;
				serverInstance = { proc, port: TEST_PORT, url };
				// Close stdio pipes so they don't keep the event loop alive
				proc.stdout.destroy();
				proc.stderr.destroy();
				// Small delay for the server to be fully ready
				setTimeout(() => {
					waitForServer(url)
						.then(() => resolve(serverInstance!))
						.catch(reject);
				}, 500);
			}
		});

		proc.stderr.on('data', (chunk: Buffer) => {
			process.stderr.write(`[server:stderr] ${chunk.toString()}`);
		});

		const timer = setTimeout(() => {
			if (!resolved) {
				proc.kill('SIGKILL');
				reject(new Error(`Server failed to start within 15s. PORT=${TEST_PORT}`));
			}
		}, 15_000);

		proc.on('close', (code) => {
			clearTimeout(timer);
			if (!resolved) {
				reject(new Error(`Server exited prematurely with code ${code}`));
			}
			serverInstance = null;
		});

		proc.on('error', (err) => {
			clearTimeout(timer);
			reject(err);
		});
	});
}

/**
 * Stop the running server process.
 */
export async function stopServer(): Promise<void> {
	if (!serverInstance) return;

	const { proc } = serverInstance;
	proc.kill('SIGTERM');

	await new Promise<void>((resolve) => {
		const timer = setTimeout(() => {
			proc.kill('SIGKILL');
			resolve();
		}, 5000);
		proc.on('close', () => {
			clearTimeout(timer);
			resolve();
		});
		// Already closed
		if (proc.exitCode !== null) {
			clearTimeout(timer);
			resolve();
		}
	});

	serverInstance = null;
}

/**
 * Get the URL of the currently running server (or throw if not started).
 */
export function getServerUrl(): string {
	if (!serverInstance) {
		throw new Error('[agent-e2e] Server not started. Call startServer() first.');
	}
	return serverInstance.url;
}

// ── Health Check ────────────────────────────────────────────────────────────

/**
 * Poll /api/health until it returns { status: 'ok' } or maxRetries is exceeded.
 */
export async function waitForServer(
	url: string,
	maxRetries: number = 30,
	intervalMs: number = 500
): Promise<void> {
	const healthUrl = `${url}/api/health`;

	for (let i = 0; i < maxRetries; i++) {
		try {
			const res = await fetch(healthUrl);
			if (res.ok) {
				const body = await res.json();
				if (body.status === 'ok') return;
			}
		} catch {
			// Server not ready yet
		}
		await new Promise((r) => setTimeout(r, intervalMs));
	}

	throw new Error(`Server at ${url} not healthy after ${maxRetries} retries`);
}

// ── Database Seeding ────────────────────────────────────────────────────────

/**
 * Create a temp database file, push the schema, and seed test data.
 *
 * Returns the path to the temp database file.
 * The caller is responsible for cleanup.
 */
export function seedDatabase(dbPath?: string): string {
	const finalPath = dbPath || join(tmpdir(), `mt-agent-e2e-${Date.now()}.db`);

	// Ensure parent directory exists
	mkdirSync(dirname(finalPath), { recursive: true });

	const sqlite = new Database(finalPath);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');

	// Create schema (matching src/lib/db/schema.ts)
	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS milestones (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			source_md TEXT,
			git_url TEXT,
			status TEXT NOT NULL DEFAULT 'draft',
			created_at INTEGER NOT NULL DEFAULT (unixepoch())
		);
		CREATE INDEX IF NOT EXISTS milestone_status_idx ON milestones(status);

		CREATE TABLE IF NOT EXISTS modules (
			id TEXT PRIMARY KEY,
			milestone_id TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			description TEXT,
			status TEXT NOT NULL DEFAULT 'draft',
			sort_order INTEGER NOT NULL DEFAULT 0
		);
		CREATE INDEX IF NOT EXISTS module_milestone_id_idx ON modules(milestone_id);
		CREATE INDEX IF NOT EXISTS module_status_idx ON modules(status);

		CREATE TABLE IF NOT EXISTS tasks (
			id TEXT PRIMARY KEY,
			short_id INTEGER NOT NULL UNIQUE,
			module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
			title TEXT NOT NULL,
			description TEXT,
			"references" TEXT,
			status TEXT NOT NULL DEFAULT 'todo',
			assignee TEXT,
			sub_total INTEGER NOT NULL DEFAULT 0,
			sub_done INTEGER NOT NULL DEFAULT 0,
			progress_message TEXT,
			blocked_reason TEXT,
			commit_hash TEXT,
			evidence_json TEXT,
			files_touched TEXT,
			created_at INTEGER NOT NULL DEFAULT (unixepoch()),
			updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
			reported_at INTEGER
		);
		CREATE INDEX IF NOT EXISTS task_status_module_idx ON tasks(status, module_id);
		CREATE INDEX IF NOT EXISTS task_status_reported_idx ON tasks(status, reported_at);
		CREATE INDEX IF NOT EXISTS task_module_id_idx ON tasks(module_id);
		CREATE INDEX IF NOT EXISTS task_short_id_idx ON tasks(short_id);
	`);

	// Seed data
	const now = Math.floor(Date.now() / 1000);

	// Milestone
	sqlite.prepare(
		`INSERT INTO milestones (id, title, status, created_at)
		 VALUES (?, ?, ?, ?)`
	).run(TEST_MILESTONE_ID, 'Agent E2E 测试里程碑', 'in-progress', now);

	// Modules
	sqlite.prepare(
		`INSERT INTO modules (id, milestone_id, name, status, sort_order)
		 VALUES (?, ?, ?, ?, ?)`
	).run('MOD-1-1', TEST_MILESTONE_ID, '核心模块', 'in-progress', 0);

	sqlite.prepare(
		`INSERT INTO modules (id, milestone_id, name, status, sort_order)
		 VALUES (?, ?, ?, ?, ?)`
	).run('MOD-1-2', TEST_MILESTONE_ID, '扩展模块', 'draft', 1);

	// Tasks
	const insertTask = sqlite.prepare(
		`INSERT INTO tasks (id, short_id, module_id, title, description, status, assignee, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	);

	const tasks = [
		{ id: 'TASK-1', shortId: 1, moduleId: 'MOD-1-1', title: '测试任务一', status: 'todo', assignee: null },
		{ id: 'TASK-2', shortId: 2, moduleId: 'MOD-1-1', title: '测试任务二', status: 'todo', assignee: null },
		{ id: 'TASK-3', shortId: 3, moduleId: 'MOD-1-1', title: '测试任务三（并发claim测试）', status: 'todo', assignee: null },
		{ id: 'TASK-4', shortId: 4, moduleId: 'MOD-1-1', title: '测试任务四', status: 'in-progress', assignee: 'agent-alpha' },
		{ id: 'TASK-5', shortId: 5, moduleId: 'MOD-1-2', title: '测试任务五', status: 'done', assignee: 'agent-alpha' },
		{ id: 'TASK-6', shortId: 6, moduleId: 'MOD-1-2', title: '测试任务六', status: 'blocked', assignee: null }
	];

	for (const t of tasks) {
		insertTask.run(t.id, t.shortId, t.moduleId, t.title, null, t.status, t.assignee, now, now);
	}

	sqlite.close();

	// Log seed counts
	console.log(
		`[agent-e2e] Seeded database: ${finalPath} (1 milestone, 2 modules, ${tasks.length} tasks)`
	);

	return finalPath;
}

// ── Config File ─────────────────────────────────────────────────────────────

/**
 * Write .mt-cli.json to the agent-e2e directory.
 */
export function writeCliConfig(serverUrl: string, milestoneId: string = TEST_MILESTONE_ID): void {
	const configPath = join(AGENT_E2E_DIR, '.mt-cli.json');
	const config = {
		serverUrl,
		milestoneId,
		key: TEST_API_KEY,
		agentName: 'test-agent'
	};
	writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
	console.log(`[agent-e2e] Wrote config: ${configPath}`);
}

// ── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Remove the temp database file and CLI config.
 */
export function cleanup(dbPath: string): void {
	try {
		if (existsSync(dbPath)) {
			rmSync(dbPath, { force: true });
			// Also remove WAL/SHM files
			rmSync(`${dbPath}-wal`, { force: true });
			rmSync(`${dbPath}-shm`, { force: true });
		}
	} catch {
		// Ignore cleanup errors
	}

	const configPath = join(AGENT_E2E_DIR, '.mt-cli.json');
	try {
		if (existsSync(configPath)) {
			rmSync(configPath);
		}
	} catch {
		// Ignore cleanup errors
	}
}
