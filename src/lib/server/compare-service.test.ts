import { describe, it, expect } from 'vitest';
import { streamCompare } from './compare-service.js';
import { LlmClient } from './llm-client.js';

// ── Mock LlmClient ───────────────────────────────────────────────────────────

class MockLlmClient extends LlmClient {
	private chunks: string[];
	private shouldError: boolean;
	private errorMessage: string;

	constructor(opts: { chunks?: string[]; shouldError?: boolean; errorMessage?: string } = {}) {
		super({ apiKey: 'test-key' }); // suppress real API key requirement
		this.chunks = opts.chunks ?? ['Hello', ' world', ' — comparison done.'];
		this.shouldError = opts.shouldError ?? false;
		this.errorMessage = opts.errorMessage ?? 'Connection failed';
	}

	async *chatCompletionStream(_systemPrompt: string, _userMessage: string): AsyncGenerator<string> {
		if (this.shouldError) {
			throw new Error(this.errorMessage);
		}
		for (const chunk of this.chunks) {
			yield chunk;
		}
	}
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SOURCE_MD = '# Requirements\n\nBuild a user authentication system with OAuth2 support.';
const CONFIRMED_MODULES = [
	{
		name: 'Auth Module',
		description: 'OAuth2 login flow',
		tasks: [
			{ title: 'Implement OAuth2 client', description: 'Google and GitHub providers' },
			{ title: 'Build login page', description: 'Login form with social buttons' }
		]
	}
];

// ── Compare service tests ───────────────────────────────────────────────────

describe('compare-service', () => {
	it('yields suggestion events for each text chunk', async () => {
		const mockClient = new MockLlmClient({ chunks: ['Chunk1', 'Chunk2', 'Chunk3'] });
		const events: any[] = [];

		for await (const event of streamCompare(SOURCE_MD, CONFIRMED_MODULES, mockClient)) {
			events.push(event);
		}

		const suggestions = events.filter((e) => e.type === 'suggestion');
		expect(suggestions).toHaveLength(3);
		expect(suggestions[0].content).toBe('Chunk1');
		expect(suggestions[1].content).toBe('Chunk2');
		expect(suggestions[2].content).toBe('Chunk3');
	});

	it('yields a done event after all suggestions', async () => {
		const mockClient = new MockLlmClient({ chunks: ['Result'] });
		const events: any[] = [];

		for await (const event of streamCompare(SOURCE_MD, CONFIRMED_MODULES, mockClient)) {
			events.push(event);
		}

		const doneEvent = events.find((e) => e.type === 'done');
		expect(doneEvent).toBeDefined();
		expect(doneEvent.type).toBe('done');
	});

	it('yields error event when LLM fails', async () => {
		const mockClient = new MockLlmClient({
			shouldError: true,
			errorMessage: 'API rate limit exceeded'
		});
		const events: any[] = [];

		for await (const event of streamCompare(SOURCE_MD, CONFIRMED_MODULES, mockClient)) {
			events.push(event);
		}

		const errorEvent = events.find((e) => e.type === 'error');
		expect(errorEvent).toBeDefined();
		expect(errorEvent.stage).toBe('connecting');
		expect(errorEvent.message).toBe('API rate limit exceeded');
	});

	it('handles empty chunk array', async () => {
		const mockClient = new MockLlmClient({ chunks: [] });
		const events: any[] = [];

		for await (const event of streamCompare(SOURCE_MD, CONFIRMED_MODULES, mockClient)) {
			events.push(event);
		}

		const suggestions = events.filter((e) => e.type === 'suggestion');
		expect(suggestions).toHaveLength(0);
		expect(events.find((e) => e.type === 'done')).toBeDefined();
	});

	it('handles modules with no descriptions', async () => {
		const mockClient = new MockLlmClient({ chunks: ['Comparison'] });
		const modulesNoDesc = [
			{
				name: 'Bare Module',
				tasks: [{ title: 'Do something' }]
			}
		];

		const events: any[] = [];
		for await (const event of streamCompare(SOURCE_MD, modulesNoDesc, mockClient)) {
			events.push(event);
		}

		expect(events.some((e) => e.type === 'suggestion')).toBe(true);
	});

	it('passes correct system prompt and user message to LLM', async () => {
		let capturedSystem = '';
		let capturedUser = '';

		class CapturingClient extends LlmClient {
			constructor() {
				super({ apiKey: 'test' });
			}
			async *chatCompletionStream(systemPrompt: string, userMessage: string): AsyncGenerator<string> {
				capturedSystem = systemPrompt;
				capturedUser = userMessage;
				yield 'ok';
			}
		}

		const client = new CapturingClient();
		await streamCompare(SOURCE_MD, CONFIRMED_MODULES, client).next();

		expect(capturedSystem).toContain('对比');
		expect(capturedUser).toContain(SOURCE_MD);
		expect(capturedUser).toContain('Auth Module');
		expect(capturedUser).toContain('Implement OAuth2 client');
	});

	it('handles multiple modules with multiple tasks', async () => {
		const mockClient = new MockLlmClient({ chunks: ['Multi', ' module', ' comparison'] });
		const multiModules = [
			{ name: 'Frontend', tasks: [{ title: 'T1' }, { title: 'T2' }] },
			{ name: 'Backend', tasks: [{ title: 'T3' }, { title: 'T4' }, { title: 'T5' }] }
		];

		const events: any[] = [];
		for await (const event of streamCompare(SOURCE_MD, multiModules, mockClient)) {
			events.push(event);
		}

		expect(events.filter((e) => e.type === 'suggestion')).toHaveLength(3);
	});
});
