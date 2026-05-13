import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, pruneOldLogs, _resetLoggerState } from './logger.js';
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ── Helpers ─────────────────────────────────────────────────────────────────

const TEST_LOG_DIR = join(__dirname, '__test_logs__');

function cleanTestDir(): void {
	if (existsSync(TEST_LOG_DIR)) {
		rmSync(TEST_LOG_DIR, { recursive: true, force: true });
	}
}

function createOldLogFileWithMtime(daysAgo: number): string {
	const date = new Date();
	date.setDate(date.getDate() - daysAgo);
	const dateStr = date.toISOString().slice(0, 10);
	const filePath = join(TEST_LOG_DIR, `app-${dateStr}.log`);
	writeFileSync(filePath, `test log content\n`, 'utf-8');
	// Set mtime to the old date
	const { utimesSync } = require('node:fs') as typeof import('node:fs');
	utimesSync(filePath, date, date);
	return filePath;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('createLogger', () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.restoreAllMocks();
		_resetLoggerState();
		delete process.env.LOG_LEVEL;
		consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
		cleanTestDir();
	});

	afterEach(() => {
		consoleSpy.mockRestore();
		cleanTestDir();
	});

	it('returns an object with debug/info/warn/error methods', () => {
		const log = createLogger('test-module');
		expect(log).toHaveProperty('debug');
		expect(log).toHaveProperty('info');
		expect(log).toHaveProperty('warn');
		expect(log).toHaveProperty('error');
		expect(typeof log.debug).toBe('function');
		expect(typeof log.info).toBe('function');
		expect(typeof log.warn).toBe('function');
		expect(typeof log.error).toBe('function');
	});

	it('logs with correct format: [timestamp] [LEVEL] [module] message', () => {
		const log = createLogger('my-mod');
		log.info('hello world');

		expect(consoleSpy).toHaveBeenCalledOnce();
		const output = consoleSpy.mock.calls[0][0] as string;
		// ISO timestamp pattern: YYYY-MM-DDTHH:mm:ss.sssZ
		expect(output).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
		expect(output).toContain('[INFO]');
		expect(output).toContain('[my-mod]');
		expect(output).toContain('hello world');
	});

	it('includes meta as JSON when provided', () => {
		const log = createLogger('test');
		log.info('event happened', { key: 'value', num: 42 });

		expect(consoleSpy).toHaveBeenCalledOnce();
		const output = consoleSpy.mock.calls[0][0] as string;
		expect(output).toContain('"key":"value"');
		expect(output).toContain('"num":42');
	});

	it('does not include meta JSON when not provided', () => {
		const log = createLogger('test');
		log.info('simple message');

		expect(consoleSpy).toHaveBeenCalledOnce();
		const output = consoleSpy.mock.calls[0][0] as string;
		expect(output).not.toContain('{');
		expect(output.trimEnd()).not.toContain('undefined');
	});

	describe('level filtering', () => {
		it('suppresses debug when LOG_LEVEL=info (default)', () => {
			const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
			const log = createLogger('test');
			log.debug('should be suppressed');

			expect(debugSpy).not.toHaveBeenCalled();
			debugSpy.mockRestore();
		});

		it('suppresses debug and info when LOG_LEVEL=warn', () => {
			process.env.LOG_LEVEL = 'warn';
			const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
			const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
			const log = createLogger('test');

			log.debug('hidden');
			log.info('also hidden');

			expect(debugSpy).not.toHaveBeenCalled();
			expect(infoSpy).not.toHaveBeenCalled();
			debugSpy.mockRestore();
			infoSpy.mockRestore();
		});

		it('allows all levels when LOG_LEVEL=debug', () => {
			process.env.LOG_LEVEL = 'debug';
			const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
			const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
			_resetLoggerState();
			const log = createLogger('test');

			log.debug('visible');
			log.info('also visible');

			expect(debugSpy).toHaveBeenCalled();
			expect(infoSpy).toHaveBeenCalled();
			debugSpy.mockRestore();
			infoSpy.mockRestore();
		});

		it('respects opts.level over env var', () => {
			process.env.LOG_LEVEL = 'error';
			const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
			const log = createLogger('test', { level: 'debug' });

			log.info('should be visible');

			expect(infoSpy).toHaveBeenCalled();
			infoSpy.mockRestore();
		});
	});

	describe('secret redaction', () => {
		it('redacts API keys in meta', () => {
			const log = createLogger('test');
			log.info('request', { api_key: 'sk-12345secret' });

			expect(consoleSpy).toHaveBeenCalledOnce();
			const output = consoleSpy.mock.calls[0][0] as string;
			expect(output).toContain('[REDACTED]');
			expect(output).not.toContain('sk-12345secret');
		});

		it('redacts passwords in meta', () => {
			const log = createLogger('test');
			log.info('auth', { password: 'supersecret' });

			expect(consoleSpy).toHaveBeenCalledOnce();
			const output = consoleSpy.mock.calls[0][0] as string;
			expect(output).toContain('[REDACTED]');
			expect(output).not.toContain('supersecret');
		});

		it('redacts Bearer tokens in string values', () => {
			const log = createLogger('test');
			log.info('request', { authHeader: 'Bearer abc123token' });

			expect(consoleSpy).toHaveBeenCalledOnce();
			const output = consoleSpy.mock.calls[0][0] as string;
			expect(output).toContain('[REDACTED]');
			expect(output).not.toContain('abc123token');
		});

		it('keeps non-sensitive values intact', () => {
			const log = createLogger('test');
			log.info('status', { port: 3000, name: 'my-app' });

			expect(consoleSpy).toHaveBeenCalledOnce();
			const output = consoleSpy.mock.calls[0][0] as string;
			expect(output).toContain('"port":3000');
			expect(output).toContain('"name":"my-app"');
			expect(output).not.toContain('[REDACTED]');
		});
	});

	describe('file writing', () => {
		it('creates log directory and writes to dated file', () => {
			const log = createLogger('test', { logDir: TEST_LOG_DIR });

			expect(existsSync(TEST_LOG_DIR)).toBe(true);

			log.info('file write test');

			const dateStr = new Date().toISOString().slice(0, 10);
			const logFile = join(TEST_LOG_DIR, `app-${dateStr}.log`);
			expect(existsSync(logFile)).toBe(true);

			const content = require('node:fs').readFileSync(logFile, 'utf-8');
			expect(content).toContain('[INFO]');
			expect(content).toContain('[test]');
			expect(content).toContain('file write test');
		});

		it('appends to existing log file', () => {
			const log = createLogger('test', { logDir: TEST_LOG_DIR });
			log.info('first');
			log.info('second');

			const dateStr = new Date().toISOString().slice(0, 10);
			const logFile = join(TEST_LOG_DIR, `app-${dateStr}.log`);
			const content = require('node:fs').readFileSync(logFile, 'utf-8');

			const lines = content.trim().split('\n');
			expect(lines.length).toBe(2);
			expect(lines[0]).toContain('first');
			expect(lines[1]).toContain('second');
		});

		it('does not write to file when debug is below threshold', () => {
			const log = createLogger('test', { logDir: TEST_LOG_DIR });
			log.debug('should not be in file');

			const dateStr = new Date().toISOString().slice(0, 10);
			const logFile = join(TEST_LOG_DIR, `app-${dateStr}.log`);

			// File may not exist at all, or exist only if other calls created it
			if (existsSync(logFile)) {
				const content = require('node:fs').readFileSync(logFile, 'utf-8');
				expect(content).not.toContain('should not be in file');
			}
		});
	});

	describe('graceful degradation', () => {
		it('continues stdout-only when log directory cannot be created', () => {
			// Point to an invalid path that can't be created
			const log = createLogger('test', {
				logDir: '/dev/null/impossible/path/that/cannot/exist'
			});

			// Should not throw
			expect(() => log.info('degraded output')).not.toThrow();
			expect(consoleSpy).toHaveBeenCalled();
			const output = consoleSpy.mock.calls[0][0] as string;
			expect(output).toContain('degraded output');
		});
	});
});

describe('pruneOldLogs', () => {
	beforeEach(() => {
		cleanTestDir();
	});

	afterEach(() => {
		cleanTestDir();
	});

	it('deletes log files older than maxAgeDays', () => {
		mkdirSync(TEST_LOG_DIR, { recursive: true });

		// Create an 8-day-old file
		const oldFile = createOldLogFileWithMtime(8);
		// Create a 1-day-old file
		const newFile = createOldLogFileWithMtime(1);

		expect(existsSync(oldFile)).toBe(true);
		expect(existsSync(newFile)).toBe(true);

		pruneOldLogs(TEST_LOG_DIR, 7);

		expect(existsSync(oldFile)).toBe(false);
		expect(existsSync(newFile)).toBe(true);
	});

	it('does not delete files within maxAgeDays', () => {
		mkdirSync(TEST_LOG_DIR, { recursive: true });

		const file3 = createOldLogFileWithMtime(3);
		const file6 = createOldLogFileWithMtime(6);

		pruneOldLogs(TEST_LOG_DIR, 7);

		expect(existsSync(file3)).toBe(true);
		expect(existsSync(file6)).toBe(true);
	});

	it('ignores non-log files in the directory', () => {
		mkdirSync(TEST_LOG_DIR, { recursive: true });

		const otherFile = join(TEST_LOG_DIR, 'other.txt');
		writeFileSync(otherFile, 'not a log file\n', 'utf-8');

		pruneOldLogs(TEST_LOG_DIR, 0);

		// other.txt should still exist (doesn't match app-*.log pattern)
		expect(existsSync(otherFile)).toBe(true);
	});

	it('handles non-existent directory gracefully', () => {
		expect(() => pruneOldLogs('/nonexistent/path', 7)).not.toThrow();
	});
});
