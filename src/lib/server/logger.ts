/**
 * Structured logger — zero external dependencies.
 *
 * Factory: `createLogger(module)` returns { debug, info, warn, error }.
 *
 * Format: `[ISO_TIMESTAMP] [LEVEL] [module] message {meta JSON}`
 * Output: stdout (level-appropriate stream) + append to logs/app-YYYY-MM-DD.log
 * Control: LOG_LEVEL env var (default 'info'). Values: debug, info, warn, error.
 * Rotation: on each write, check date rollover; on startup, prune files older than 7 days.
 * Graceful degradation: file write failure → warning to stdout, continue stdout-only.
 * Secret redaction: never log values matching common secret patterns.
 */

import { existsSync, mkdirSync, appendFileSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ── Types ────────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
	debug: (message: string, meta?: Record<string, unknown>) => void;
	info: (message: string, meta?: Record<string, unknown>) => void;
	warn: (message: string, meta?: Record<string, unknown>) => void;
	error: (message: string, meta?: Record<string, unknown>) => void;
}

export interface LoggerOptions {
	/** Minimum log level. Overrides LOG_LEVEL env var when provided. */
	level?: LogLevel;
	/** Directory for log files. Default: 'logs' relative to cwd. */
	logDir?: string;
	/** Maximum age of log files in days before auto-deletion. Default: 7. */
	maxAgeDays?: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3
};

const LEVEL_TAG: Record<LogLevel, string> = {
	debug: 'DEBUG',
	info: 'INFO',
	warn: 'WARN',
	error: 'ERROR'
};

const CONSOLE_FN: Record<LogLevel, 'debug' | 'info' | 'warn' | 'error'> = {
	debug: 'debug',
	info: 'info',
	warn: 'warn',
	error: 'error'
};

const DEFAULT_LOG_DIR = 'logs';
const DEFAULT_MAX_AGE_DAYS = 7;

/** Patterns that indicate secret values — matched against stringified meta values. */
const SECRET_PATTERNS = [
	/api[_-]?key/i,
	/password/i,
	/bearer\s+\S+/i,
	/secret/i,
	/authorization/i,
	/token(?!\s*:?\s*null)/i
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveLevel(): LogLevel {
	const env = (process.env.LOG_LEVEL ?? 'info').toLowerCase().trim();
	if (env in LEVEL_PRIORITY) return env as LogLevel;
	return 'info';
}

function todayDateStr(): string {
	return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function isoTimestamp(): string {
	return new Date().toISOString();
}

/**
 * Redact secret values from a meta object.
 * Returns a new object with sensitive values replaced by '[REDACTED]'.
 */
function redactMeta(meta: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(meta)) {
		if (SECRET_PATTERNS.some((pat) => pat.test(key))) {
			result[key] = '[REDACTED]';
		} else if (typeof value === 'string' && SECRET_PATTERNS.some((pat) => pat.test(value))) {
			result[key] = '[REDACTED]';
		} else {
			result[key] = value;
		}
	}
	return result;
}

function formatLine(level: LogLevel, mod: string, message: string, meta?: Record<string, unknown>): string {
	const ts = isoTimestamp();
	const tag = LEVEL_TAG[level];
	const metaStr = meta ? ` ${JSON.stringify(redactMeta(meta))}` : '';
	return `[${ts}] [${tag}] [${mod}] ${message}${metaStr}\n`;
}

// ── File operations ──────────────────────────────────────────────────────────

/** Ensure the log directory exists; return its path. */
function ensureLogDir(logDir: string): string | null {
	try {
		if (!existsSync(logDir)) {
			mkdirSync(logDir, { recursive: true });
		}
		return logDir;
	} catch {
		return null;
	}
}

/** Append a line to the daily log file. Graceful degradation on failure. */
function appendToLogFile(logDir: string, content: string): void {
	try {
		const dateStr = todayDateStr();
		const filePath = join(logDir, `app-${dateStr}.log`);
		appendFileSync(filePath, content, 'utf-8');
	} catch {
		// Intentionally swallowed — stdout-only degradation
	}
}

/**
 * Delete log files older than maxAgeDays.
 * Runs once on startup; errors for individual files are swallowed.
 */
export function pruneOldLogs(logDir: string, maxAgeDays: number): void {
	if (!existsSync(logDir)) return;

	const now = Date.now();
	const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

	try {
		const files = readdirSync(logDir);
		for (const file of files) {
			if (!file.startsWith('app-') || !file.endsWith('.log')) continue;
			const filePath = join(logDir, file);
			try {
				const stat = statSync(filePath);
				if (now - stat.mtimeMs > maxAgeMs) {
					unlinkSync(filePath);
				}
			} catch {
				// Skip files we can't stat/delete
			}
		}
	} catch {
		// Skip if we can't read directory
	}
}

// ── Singleton state ─────────────────────────────────────────────────────────

let initialized = false;
let effectiveLogDir: string | null = null;

function initialize(logDir: string, maxAgeDays: number): void {
	if (initialized) return;
	initialized = true;
	effectiveLogDir = ensureLogDir(logDir);
	if (effectiveLogDir) {
		pruneOldLogs(effectiveLogDir, maxAgeDays);
	}
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a structured logger for the given module name.
 *
 * @example
 * ```ts
 * const log = createLogger('my-module');
 * log.info('Server started', { port: 3000 });
 * ```
 */
export function createLogger(mod: string, opts?: LoggerOptions): Logger {
	const minLevel = opts?.level ?? resolveLevel();
	const minPriority = LEVEL_PRIORITY[minLevel];
	const logDir = opts?.logDir ?? DEFAULT_LOG_DIR;
	const maxAgeDays = opts?.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;

	// Initialize once (prune old logs, ensure directory)
	initialize(logDir, maxAgeDays);

	return {
		debug: (message: string, meta?: Record<string, unknown>) => {
			if (minPriority > LEVEL_PRIORITY.debug) return;
			const line = formatLine('debug', mod, message, meta);
			console.debug(line.trimEnd());
			if (effectiveLogDir) appendToLogFile(effectiveLogDir, line);
		},
		info: (message: string, meta?: Record<string, unknown>) => {
			if (minPriority > LEVEL_PRIORITY.info) return;
			const line = formatLine('info', mod, message, meta);
			console.info(line.trimEnd());
			if (effectiveLogDir) appendToLogFile(effectiveLogDir, line);
		},
		warn: (message: string, meta?: Record<string, unknown>) => {
			if (minPriority > LEVEL_PRIORITY.warn) return;
			const line = formatLine('warn', mod, message, meta);
			console.warn(line.trimEnd());
			if (effectiveLogDir) appendToLogFile(effectiveLogDir, line);
		},
		error: (message: string, meta?: Record<string, unknown>) => {
			if (minPriority > LEVEL_PRIORITY.error) return;
			const line = formatLine('error', mod, message, meta);
			console.error(line.trimEnd());
			if (effectiveLogDir) appendToLogFile(effectiveLogDir, line);
		}
	};
}

// ── Test helpers (exported for testing only) ─────────────────────────────────

/**
 * Reset the singleton initialization state.
 * Only intended for use in tests.
 */
export function _resetLoggerState(): void {
	initialized = false;
	effectiveLogDir = null;
}
