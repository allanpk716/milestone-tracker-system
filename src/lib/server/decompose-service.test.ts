import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractCompleteJsonObjects, streamDecompose } from './decompose-service.js';
import type { DecomposeEvent } from '$lib/schemas/decompose.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Create a mock LlmClient that yields the given string chunks. */
function createMockClient(chunks: string[] | Error): any {
	return {
		async *chatCompletionStream() {
			if (chunks instanceof Error) throw chunks;
			for (const chunk of chunks) yield chunk;
		}
	};
}

/** Collect all events from an async generator. */
async function collectEvents(gen: AsyncGenerator<DecomposeEvent>): Promise<DecomposeEvent[]> {
	const events: DecomposeEvent[] = [];
	for await (const event of gen) events.push(event);
	return events;
}

// ── extractCompleteJsonObjects ───────────────────────────────────────────────

describe('extractCompleteJsonObjects', () => {
	it('extracts a single simple object', () => {
		const { objects, remaining } = extractCompleteJsonObjects('{"name": "test"}');
		expect(objects).toEqual(['{"name": "test"}']);
		expect(remaining).toBe('');
	});

	it('extracts multiple objects from a single string', () => {
		const input = '{"a":1}{"b":2}';
		const { objects, remaining } = extractCompleteJsonObjects(input);
		expect(objects).toEqual(['{"a":1}', '{"b":2}']);
		expect(remaining).toBe('');
	});

	it('handles nested objects', () => {
		const input = '{"outer": {"inner": "value", "arr": [1, 2, 3]}}';
		const { objects, remaining } = extractCompleteJsonObjects(input);
		expect(objects).toHaveLength(1);
		expect(JSON.parse(objects[0])).toEqual({
			outer: { inner: 'value', arr: [1, 2, 3] }
		});
		expect(remaining).toBe('');
	});

	it('handles braces inside strings', () => {
		const input = '{"name": "test {with} braces", "code": "if (x) { return y; }"}';
		const { objects, remaining } = extractCompleteJsonObjects(input);
		expect(objects).toHaveLength(1);
		const parsed = JSON.parse(objects[0]);
		expect(parsed.name).toBe('test {with} braces');
		expect(parsed.code).toBe('if (x) { return y; }');
		expect(remaining).toBe('');
	});

	it('handles escaped quotes in strings', () => {
		const input = '{"msg": "He said \\"hello\\""}';
		const { objects, remaining } = extractCompleteJsonObjects(input);
		expect(objects).toHaveLength(1);
		expect(JSON.parse(objects[0]).msg).toBe('He said "hello"');
		expect(remaining).toBe('');
	});

	it('handles escaped backslash in strings', () => {
		const input = '{"path": "C:\\\\Users\\\\test"}';
		const { objects, remaining } = extractCompleteJsonObjects(input);
		expect(objects).toHaveLength(1);
		expect(JSON.parse(objects[0]).path).toBe('C:\\Users\\test');
		expect(remaining).toBe('');
	});

	it('handles brackets (arrays) as top-level structures', () => {
		const input = '[{"a":1},{"a":2}]';
		const { objects, remaining } = extractCompleteJsonObjects(input);
		expect(objects).toHaveLength(1);
		expect(JSON.parse(objects[0])).toEqual([{ a: 1 }, { a: 2 }]);
		expect(remaining).toBe('');
	});

	it('handles partial input (incomplete object)', () => {
		const input = '{"name": "test';
		const { objects, remaining } = extractCompleteJsonObjects(input);
		expect(objects).toEqual([]);
		expect(remaining).toBe('{"name": "test');
	});

	it('handles empty input', () => {
		const { objects, remaining } = extractCompleteJsonObjects('');
		expect(objects).toEqual([]);
		expect(remaining).toBe('');
	});

	it('handles input with no objects', () => {
		const { objects, remaining } = extractCompleteJsonObjects('just some text');
		expect(objects).toEqual([]);
		expect(remaining).toBe('');
	});

	it('handles complete object followed by partial', () => {
		const input = '{"done": true}{"partial":';
		const { objects, remaining } = extractCompleteJsonObjects(input);
		expect(objects).toEqual(['{"done": true}']);
		expect(remaining).toBe('{"partial":');
	});

	it('handles deeply nested structures', () => {
		const input = '{"a": {"b": {"c": {"d": [1, {"e": 2}, 3]}}}}';
		const { objects, remaining } = extractCompleteJsonObjects(input);
		expect(objects).toHaveLength(1);
		const parsed = JSON.parse(objects[0]);
		expect(parsed.a.b.c.d[1].e).toBe(2);
		expect(remaining).toBe('');
	});

	it('handles newlines inside strings', () => {
		const input = '{"text": "line1\\nline2"}';
		const { objects, remaining } = extractCompleteJsonObjects(input);
		expect(objects).toHaveLength(1);
		expect(JSON.parse(objects[0]).text).toBe('line1\nline2');
		expect(remaining).toBe('');
	});
});

// ── streamDecompose ─────────────────────────────────────────────────────────

describe('streamDecompose', () => {
	it('yields valid modules from mock LLM response', async () => {
		const module1 = JSON.stringify({
			name: '用户认证',
			description: '实现登录注册',
			tasks: [{ title: '实现登录接口', description: 'POST /auth/login' }]
		});
		const module2 = JSON.stringify({
			name: '数据管理',
			description: 'CRUD 操作',
			tasks: [{ title: '创建数据表' }]
		});

		// Simulate LLM streaming the JSON array
		const client = createMockClient([
			'[', module1, ',', module2, ']'
		]);

		const events = await collectEvents(streamDecompose('# Test Milestone\nSome content', client));

		const modules = events.filter((e) => e.type === 'module');
		const errors = events.filter((e) => e.type === 'error');
		const done = events.filter((e) => e.type === 'done');

		expect(modules).toHaveLength(2);
		expect(modules[0].type === 'module' && modules[0].module.name).toBe('用户认证');
		expect(modules[1].type === 'module' && modules[1].module.name).toBe('数据管理');
		expect(errors).toHaveLength(0);
		expect(done).toHaveLength(1);
		expect(done[0].type === 'done' && done[0].total).toBe(2);
		expect(done[0].type === 'done' && done[0].errors).toBe(0);
	});

	it('yields error event for Zod-invalid module but continues', async () => {
		const invalidModule = JSON.stringify({
			name: '', // empty name — invalid
			tasks: []
		});
		const validModule = JSON.stringify({
			name: 'Valid Module',
			tasks: [{ title: 'A task' }]
		});

		const client = createMockClient([
			'[', invalidModule, ',', validModule, ']'
		]);

		const events = await collectEvents(streamDecompose('# Test', client));

		const modules = events.filter((e) => e.type === 'module');
		const errors = events.filter((e) => e.type === 'error');
		const done = events.filter((e) => e.type === 'done');

		expect(modules).toHaveLength(1);
		expect(errors).toHaveLength(1);
		expect(errors[0].type === 'error' && errors[0].stage).toBe('parsing');
		expect(done[0].type === 'done' && done[0].total).toBe(1);
		expect(done[0].type === 'done' && done[0].errors).toBe(1);
	});

	it('yields error event for malformed JSON but continues', async () => {
		const validModule = JSON.stringify({
			name: 'Good Module',
			tasks: [{ title: 'Task 1' }]
		});
		const badJson = '{name: "missing quotes"}'; // invalid JSON

		const client = createMockClient([
			'[', badJson, ',', validModule, ']'
		]);

		const events = await collectEvents(streamDecompose('# Test', client));

		const modules = events.filter((e) => e.type === 'module');
		const errors = events.filter((e) => e.type === 'error');
		const done = events.filter((e) => e.type === 'done');

		expect(modules).toHaveLength(1);
		expect(errors).toHaveLength(1);
		expect(errors[0].type === 'error' && errors[0].stage).toBe('parsing');
		expect(done[0].type === 'done' && done[0].total).toBe(1);
		expect(done[0].type === 'done' && done[0].errors).toBe(1);
	});

	it('handles LLM connection failure with connecting stage', async () => {
		const client = createMockClient(new Error('Network error'));

		const events = await collectEvents(streamDecompose('# Test', client));

		const errors = events.filter((e) => e.type === 'error');
		const done = events.filter((e) => e.type === 'done');

		expect(errors).toHaveLength(1);
		expect(errors[0].type === 'error' && errors[0].stage).toBe('connecting');
		expect(errors[0].type === 'error' && errors[0].message).toContain('Network error');
		expect(done[0].type === 'done' && done[0].errors).toBe(1);
	});

	it('handles LLM failure mid-stream with streaming stage', async () => {
		// Yield one valid module, then throw
		const client: any = {
			async *chatCompletionStream() {
				yield '{"name": "Module 1", "tasks": [{"title": "T1"}]}';
				throw new Error('Connection reset');
			}
		};

		const events = await collectEvents(streamDecompose('# Test', client));

		const modules = events.filter((e) => e.type === 'module');
		const errors = events.filter((e) => e.type === 'error');
		const done = events.filter((e) => e.type === 'done');

		expect(modules).toHaveLength(1);
		expect(errors).toHaveLength(1);
		expect(errors[0].type === 'error' && errors[0].stage).toBe('streaming');
		expect(done[0].type === 'done' && done[0].total).toBe(1);
	});

	it('handles empty LLM response gracefully', async () => {
		const client = createMockClient([]);

		const events = await collectEvents(streamDecompose('# Test', client));

		const modules = events.filter((e) => e.type === 'module');
		const done = events.filter((e) => e.type === 'done');

		expect(modules).toHaveLength(0);
		expect(done[0].type === 'done' && done[0].total).toBe(0);
		expect(done[0].type === 'done' && done[0].errors).toBe(0);
	});

	it('correctly indexes modules sequentially', async () => {
		const modules = [
			{ name: 'First', tasks: [{ title: 'T1' }] },
			{ name: 'Second', tasks: [{ title: 'T2' }] },
			{ name: 'Third', tasks: [{ title: 'T3' }] }
		].map((m) => JSON.stringify(m));

		const client = createMockClient(['[', ...modules.join(',').split(''), ']']);

		const events = await collectEvents(streamDecompose('# Test', client));

		const moduleEvents = events.filter((e) => e.type === 'module') as Array<{
			type: 'module';
			index: number;
			module: any;
		}>;

		expect(moduleEvents).toHaveLength(3);
		expect(moduleEvents[0].index).toBe(0);
		expect(moduleEvents[1].index).toBe(1);
		expect(moduleEvents[2].index).toBe(2);
	});

	it('validates task schema within modules', async () => {
		const moduleWithInvalidTask = JSON.stringify({
			name: 'Module',
			tasks: [{ title: '', description: 'empty title' }] // invalid: empty title
		});
		const validModule = JSON.stringify({
			name: 'Valid',
			tasks: [{ title: 'Good task' }]
		});

		const client = createMockClient([
			'[', moduleWithInvalidTask, ',', validModule, ']'
		]);

		const events = await collectEvents(streamDecompose('# Test', client));

		const modules = events.filter((e) => e.type === 'module');
		const errors = events.filter((e) => e.type === 'error');

		expect(modules).toHaveLength(1);
		expect(errors).toHaveLength(1);
	});

	it('handles modules with empty tasks array', async () => {
		const moduleWithNoTasks = JSON.stringify({
			name: 'Empty Module',
			tasks: []
		});

		const client = createMockClient(['[', moduleWithNoTasks, ']']);

		const events = await collectEvents(streamDecompose('# Test', client));

		const modules = events.filter((e) => e.type === 'module') as Array<{
			type: 'module';
			module: any;
		}>;

		expect(modules).toHaveLength(1);
		expect(modules[0].module.tasks).toEqual([]);
	});

	it('always yields a done event even on errors', async () => {
		const client = createMockClient(new Error('Total failure'));

		const events = await collectEvents(streamDecompose('# Test', client));
		const done = events.filter((e) => e.type === 'done');

		expect(done).toHaveLength(1);
	});
});
