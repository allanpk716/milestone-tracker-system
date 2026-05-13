import { describe, it, expect } from 'vitest';
import { streamCompare } from './compare-service.js';
import { LlmClient } from './llm-client.js';
import { compareRequestSchema } from '$lib/schemas/confirm.js';

/**
 * Tests for the compare endpoint contract.
 *
 * Tests SSE formatting, error handling, and validation logic.
 * Uses a mock LlmClient to avoid real API calls.
 */

// ── Mock LlmClient ───────────────────────────────────────────────────────────

class MockLlmClient extends LlmClient {
	private chunks: string[];
	private shouldError: boolean;
	private errorMessage: string;
	private errorStage: 'connecting' | 'streaming';

	constructor(opts: {
		chunks?: string[];
		shouldError?: boolean;
		errorMessage?: string;
		errorStage?: 'connecting' | 'streaming';
	} = {}) {
		super({ apiKey: 'test-key' });
		this.chunks = opts.chunks ?? ['Suggestion chunk'];
		this.shouldError = opts.shouldError ?? false;
		this.errorMessage = opts.errorMessage ?? 'LLM error';
		this.errorStage = opts.errorStage ?? 'connecting';
	}

	async *chatCompletionStream(_systemPrompt: string, _userMessage: string): AsyncGenerator<string> {
		if (this.shouldError) {
			throw new Error(this.errorMessage);
		}
		yield* this.chunks;
	}
}

// ── SSE formatting ───────────────────────────────────────────────────────────

function formatSSE(event: any): string {
	return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

function parseSSE(raw: string): any[] {
	const events: any[] = [];
	const lines = raw.split('\n');
	let currentEvent = '';
	let currentData = '';

	for (const line of lines) {
		if (line.startsWith('event: ')) {
			currentEvent = line.slice(7).trim();
		} else if (line.startsWith('data: ')) {
			currentData = line.slice(6);
		} else if (line === '' && currentEvent && currentData) {
			events.push({ type: currentEvent, ...JSON.parse(currentData) });
			currentEvent = '';
			currentData = '';
		}
	}

	return events;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SOURCE_MD = '# Project Requirements\n\nBuild an API with auth.';
const VALID_MODULES = [
	{ name: 'Auth', tasks: [{ title: 'Setup JWT' }] }
];

// ── Compare endpoint tests ───────────────────────────────────────────────────

describe('compare endpoint', () => {
	it('returns SSE stream with suggestion events', async () => {
		const mockClient = new MockLlmClient({ chunks: ['Part1', 'Part2'] });
		const generator = streamCompare(SOURCE_MD, VALID_MODULES, mockClient);

		const events: any[] = [];
		for await (const event of generator) {
			events.push(event);
		}

		const suggestions = events.filter((e) => e.type === 'suggestion');
		expect(suggestions).toHaveLength(2);
		expect(suggestions[0].content).toBe('Part1');
		expect(suggestions[1].content).toBe('Part2');
	});

	it('SSE formatted output is valid SSE', async () => {
		const mockClient = new MockLlmClient({ chunks: ['Hello'] });
		const generator = streamCompare(SOURCE_MD, VALID_MODULES, mockClient);

		const sseParts: string[] = [];
		for await (const event of generator) {
			sseParts.push(formatSSE(event));
		}
		const sseOutput = sseParts.join('');

		// Should parse back cleanly
		const parsed = parseSSE(sseOutput);
		expect(parsed.length).toBeGreaterThanOrEqual(1);

		const suggestion = parsed.find((e) => e.type === 'suggestion');
		expect(suggestion).toBeDefined();
		expect(suggestion.content).toBe('Hello');

		const done = parsed.find((e) => e.type === 'done');
		expect(done).toBeDefined();
	});

	it('includes done event at end of stream', async () => {
		const mockClient = new MockLlmClient({ chunks: ['Text'] });
		const generator = streamCompare(SOURCE_MD, VALID_MODULES, mockClient);

		const events: any[] = [];
		for await (const event of generator) {
			events.push(event);
		}

		expect(events[events.length - 1].type).toBe('done');
	});

	it('yields error event with connecting stage on LLM failure', async () => {
		const mockClient = new MockLlmClient({
			shouldError: true,
			errorMessage: 'API key invalid',
			errorStage: 'connecting'
		});
		const generator = streamCompare(SOURCE_MD, VALID_MODULES, mockClient);

		const events: any[] = [];
		for await (const event of generator) {
			events.push(event);
		}

		const errorEvent = events.find((e) => e.type === 'error');
		expect(errorEvent).toBeDefined();
		expect(errorEvent.stage).toBe('connecting');
		expect(errorEvent.message).toBe('API key invalid');
	});

	it('error SSE events include stage and original message', async () => {
		const mockClient = new MockLlmClient({
			shouldError: true,
			errorMessage: 'Rate limit exceeded'
		});
		const generator = streamCompare(SOURCE_MD, VALID_MODULES, mockClient);

		const sseParts: string[] = [];
		for await (const event of generator) {
			sseParts.push(formatSSE(event));
		}

		const parsed = parseSSE(sseParts.join(''));
		const errorEvent = parsed.find((e) => e.type === 'error');
		expect(errorEvent).toBeDefined();
		expect(errorEvent.stage).toBeTruthy();
		expect(errorEvent.message).toBe('Rate limit exceeded');
	});

	it('rejects empty modules in validation', () => {
		const result = compareRequestSchema.safeParse({ modules: [] });
		expect(result.success).toBe(false);
	});

	it('rejects module without tasks', () => {
		const result = compareRequestSchema.safeParse({
			modules: [{ name: 'Empty', tasks: [] }]
		});
		expect(result.success).toBe(false);
	});

	it('rejects module without name', () => {
		const result = compareRequestSchema.safeParse({
			modules: [{ tasks: [{ title: 'T' }] }]
		});
		expect(result.success).toBe(false);
	});

	it('accepts valid compare request', () => {
		const result = compareRequestSchema.safeParse({
			modules: [{ name: 'Mod', tasks: [{ title: 'Task', description: 'Desc' }] }]
		});
		expect(result.success).toBe(true);
	});

	it('handles empty source markdown gracefully', async () => {
		const mockClient = new MockLlmClient({ chunks: ['Analysis'] });
		const generator = streamCompare('', VALID_MODULES, mockClient);

		const events: any[] = [];
		for await (const event of generator) {
			events.push(event);
		}

		expect(events.some((e) => e.type === 'suggestion')).toBe(true);
		expect(events.some((e) => e.type === 'done')).toBe(true);
	});
});
