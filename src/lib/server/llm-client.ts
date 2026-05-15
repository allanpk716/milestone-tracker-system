/**
 * Minimal OpenAI-compatible streaming LLM client.
 * Uses raw `fetch` + `ReadableStream` — no external dependencies.
 *
 * Reads LLM_API_KEY, LLM_MODEL, LLM_BASE_URL from environment.
 * LLM_API_KEY is never logged or included in SSE responses.
 */

import { createLogger } from './logger.js';

const logger = createLogger('llm-client');

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TIMEOUT_MS = 180_000;

export class LlmClient {
	private readonly apiKey: string;
	private readonly model: string;
	private readonly baseUrl: string;
	private readonly timeoutMs: number;

	constructor(opts?: { baseUrl?: string; model?: string; apiKey?: string; timeoutMs?: number }) {
		this.apiKey = opts?.apiKey ?? process.env.LLM_API_KEY ?? '';
		this.model = opts?.model ?? process.env.LLM_MODEL ?? DEFAULT_MODEL;
		this.baseUrl = (opts?.baseUrl ?? process.env.LLM_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
		this.timeoutMs = opts?.timeoutMs ?? (parseInt(process.env.LLM_TIMEOUT_MS ?? '', 10) || DEFAULT_TIMEOUT_MS);
	}

	/**
	 * Stream a chat-completion and yield content deltas as strings.
	 * Parses SSE `data:` lines from the OpenAI-compatible response.
	 *
	 * Throws on non-OK HTTP status, timeout, or stream errors.
	 */
	async *chatCompletionStream(systemPrompt: string, userMessage: string): AsyncGenerator<string> {
		const url = `${this.baseUrl}/chat/completions`;

		logger.info('Request', {
			url,
			model: this.model,
			systemPromptLength: systemPrompt.length,
			userMessageLength: userMessage.length
			// apiKey intentionally omitted
		});

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.timeoutMs);

		let response: Response;
		try {
			response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.apiKey}`
				},
				body: JSON.stringify({
					model: this.model,
					stream: true,
					messages: [
						{ role: 'system', content: systemPrompt },
						{ role: 'user', content: userMessage }
					]
				}),
				signal: controller.signal
			});
		} catch (err: any) {
			clearTimeout(timer);
			if (err.name === 'AbortError') {
				throw new Error(`LLM request timed out after ${this.timeoutMs}ms`);
			}
			throw new Error(`LLM connection failed: ${err.message}`);
		}

		clearTimeout(timer);

		if (!response.ok) {
			const body = await response.text().catch(() => '<unreadable>');
			throw new Error(`LLM API returned ${response.status}: ${body.slice(0, 500)}`);
		}

		// ── Parse SSE stream ────────────────────────────────────────────
		const reader = response.body!.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });

				// Split on newlines, process complete SSE lines
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? ''; // keep incomplete line in buffer

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed || trimmed.startsWith(':')) continue; // skip empty / comments

					if (trimmed === 'data: [DONE]') return;

					if (trimmed.startsWith('data: ')) {
						const jsonStr = trimmed.slice(6);
						try {
							const parsed = JSON.parse(jsonStr);
							const delta = parsed.choices?.[0]?.delta?.content;
							if (delta) yield delta;
						} catch {
							// Malformed JSON chunk — skip silently (stream continues)
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}
}
