import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmClient } from './llm-client.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Build a fake Response whose body mimics an SSE stream. */
function sseResponse(lines: string[]): Response {
	const body = lines.join('\n') + '\n';
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(body));
			controller.close();
		}
	});
	return new Response(stream, {
		status: 200,
		headers: { 'Content-Type': 'text/event-stream' }
	});
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('LlmClient', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.restoreAllMocks();
		fetchSpy = vi.spyOn(globalThis, 'fetch');
	});

	describe('constructor', () => {
		it('reads config from environment variables', () => {
			process.env.LLM_API_KEY = 'test-key';
			process.env.LLM_MODEL = 'test-model';
			process.env.LLM_BASE_URL = 'https://custom.api.com/v1';

			const client = new LlmClient();
			expect((client as any).apiKey).toBe('test-key');
			expect((client as any).model).toBe('test-model');
			expect((client as any).baseUrl).toBe('https://custom.api.com/v1');

			delete process.env.LLM_API_KEY;
			delete process.env.LLM_MODEL;
			delete process.env.LLM_BASE_URL;
		});

		it('accepts explicit options over environment', () => {
			const client = new LlmClient({
				apiKey: 'explicit-key',
				model: 'explicit-model',
				baseUrl: 'https://explicit.com/v2/'
			});
			expect((client as any).apiKey).toBe('explicit-key');
			expect((client as any).model).toBe('explicit-model');
			expect((client as any).baseUrl).toBe('https://explicit.com/v2'); // trailing slash stripped
		});

		it('uses defaults when no env or options', () => {
			const client = new LlmClient();
			expect((client as any).model).toBe('gpt-4o-mini');
			expect((client as any).baseUrl).toBe('https://api.openai.com/v1');
			expect((client as any).timeoutMs).toBe(30_000);
		});
	});

	describe('chatCompletionStream', () => {
		it('yields content deltas from SSE data lines', async () => {
			const sseLines = [
				'data: {"choices":[{"delta":{"content":"Hello"}}]}',
				'data: {"choices":[{"delta":{"content":" world"}}]}',
				'data: [DONE]'
			];
			fetchSpy.mockResolvedValueOnce(sseResponse(sseLines));

			const client = new LlmClient({ apiKey: 'test' });
			const chunks: string[] = [];
			for await (const chunk of client.chatCompletionStream('sys', 'user')) {
				chunks.push(chunk);
			}
			expect(chunks).toEqual(['Hello', ' world']);
		});

		it('handles multi-line SSE with empty lines and comments', async () => {
			const sseLines = [
				': this is a comment',
				'',
				'data: {"choices":[{"delta":{"content":"A"}}]}',
				'',
				'data: {"choices":[{"delta":{"content":"B"}}]}',
				'',
				'data: [DONE]'
			];
			fetchSpy.mockResolvedValueOnce(sseResponse(sseLines));

			const client = new LlmClient({ apiKey: 'test' });
			const chunks: string[] = [];
			for await (const chunk of client.chatCompletionStream('sys', 'user')) {
				chunks.push(chunk);
			}
			expect(chunks).toEqual(['A', 'B']);
		});

		it('skips SSE lines with no content delta', async () => {
			const sseLines = [
				'data: {"choices":[{"delta":{}}]}',
				'data: {"choices":[{"delta":{"content":"yes"}}]}',
				'data: {"choices":[]}',
				'data: [DONE]'
			];
			fetchSpy.mockResolvedValueOnce(sseResponse(sseLines));

			const client = new LlmClient({ apiKey: 'test' });
			const chunks: string[] = [];
			for await (const chunk of client.chatCompletionStream('sys', 'user')) {
				chunks.push(chunk);
			}
			expect(chunks).toEqual(['yes']);
		});

		it('skips malformed JSON lines silently', async () => {
			const sseLines = [
				'data: {invalid json',
				'data: {"choices":[{"delta":{"content":"ok"}}]}',
				'data: [DONE]'
			];
			fetchSpy.mockResolvedValueOnce(sseResponse(sseLines));

			const client = new LlmClient({ apiKey: 'test' });
			const chunks: string[] = [];
			for await (const chunk of client.chatCompletionStream('sys', 'user')) {
				chunks.push(chunk);
			}
			expect(chunks).toEqual(['ok']);
		});

		it('returns empty stream for empty SSE', async () => {
			const sseLines = ['data: [DONE]'];
			fetchSpy.mockResolvedValueOnce(sseResponse(sseLines));

			const client = new LlmClient({ apiKey: 'test' });
			const chunks: string[] = [];
			for await (const chunk of client.chatCompletionStream('sys', 'user')) {
				chunks.push(chunk);
			}
			expect(chunks).toEqual([]);
		});

		it('throws on non-200 HTTP response', async () => {
			fetchSpy.mockResolvedValueOnce(
				new Response('Unauthorized', { status: 401 })
			);

			const client = new LlmClient({ apiKey: 'bad' });
			await expect(
				(async () => {
					for await (const _ of client.chatCompletionStream('sys', 'user')) {
						// should not reach here
					}
				})()
			).rejects.toThrow('LLM API returned 401');
		});

		it('throws on network failure', async () => {
			fetchSpy.mockRejectedValueOnce(new Error('DNS lookup failed'));

			const client = new LlmClient({ apiKey: 'test' });
			await expect(
				(async () => {
					for await (const _ of client.chatCompletionStream('sys', 'user')) {
						// should not reach here
					}
				})()
			).rejects.toThrow('LLM connection failed: DNS lookup failed');
		});

		it('throws on timeout', async () => {
			fetchSpy.mockImplementationOnce(
				() =>
					new Promise((_, reject) => {
						const err = new Error('The operation was aborted');
						(err as any).name = 'AbortError';
						setTimeout(() => reject(err), 10);
					})
			);

			const client = new LlmClient({ apiKey: 'test', timeoutMs: 50 });
			await expect(
				(async () => {
					for await (const _ of client.chatCompletionStream('sys', 'user')) {
						// should not reach here
					}
				})()
			).rejects.toThrow('timed out');
		});

		it('sends correct request body', async () => {
			fetchSpy.mockResolvedValueOnce(sseResponse(['data: [DONE]']));
			const client = new LlmClient({ apiKey: 'key-123', model: 'my-model', baseUrl: 'https://api.test.com' });

			for await (const _ of client.chatCompletionStream('system prompt', 'user msg')) {
				// consume stream
			}

			expect(fetchSpy).toHaveBeenCalledOnce();
			const [url, init] = fetchSpy.mock.calls[0];
			expect(url).toBe('https://api.test.com/chat/completions');

			const body = JSON.parse((init as any).body);
			expect(body.model).toBe('my-model');
			expect(body.stream).toBe(true);
			expect(body.messages).toEqual([
				{ role: 'system', content: 'system prompt' },
				{ role: 'user', content: 'user msg' }
			]);
			expect((init as any).headers.Authorization).toBe('Bearer key-123');
		});
	});
});
