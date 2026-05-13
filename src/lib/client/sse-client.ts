/**
 * Lightweight POST-based SSE client.
 *
 * Standard EventSource only supports GET, so this uses fetch + ReadableStream
 * to consume SSE events from a POST endpoint. Parses the `event:` / `data:`
 * fields and dispatches typed callbacks.
 */

import type { DecomposeModule, DecomposeEvent } from '$lib/schemas/decompose.js';

// ── Types ───────────────────────────────────────────────────────────────────

export interface PostSseCallbacks {
	onModule?: (index: number, module: DecomposeModule) => void;
	onError?: (stage: string, message: string) => void;
	onDone?: (total: number, errors: number) => void;
}

export interface PostSseResult {
	abort: () => void;
}

// ── Generic SSE callbacks (for compare and other non-decompose streams) ──────

export interface GenericSseCallbacks {
	/** Called for every SSE event with the raw parsed JSON object. */
	onEvent?: (eventType: string, data: Record<string, unknown>) => void;
	/** Convenience: called for 'suggestion' events. */
	onSuggestion?: (content: string) => void;
	/** Called for 'error' events with stage + message. */
	onError?: (stage: string, message: string) => void;
	/** Called when the 'done' event is received or stream ends. */
	onDone?: () => void;
}

// ── SSE parser ──────────────────────────────────────────────────────────────

/**
 * Parse a raw SSE text buffer into individual events.
 * Handles the standard SSE format: `event: <name>\ndata: <json>\n\n`.
 *
 * Returns parsed events and any leftover text that may be an incomplete event.
 */
function parseSseBuffer(buffer: string): { events: DecomposeEvent[]; remaining: string } {
	const events: DecomposeEvent[] = [];
	const parts = buffer.split('\n\n');
	// The last part may be incomplete (no trailing \n\n yet)
	const remaining = parts.pop() ?? '';

	for (const part of parts) {
		const event = parseSingleSseEvent(part.trim());
		if (event) events.push(event);
	}

	return { events, remaining };
}

function parseSingleSseEvent(block: string): DecomposeEvent | null {
	let eventType = '';
	let dataStr = '';

	for (const line of block.split('\n')) {
		if (line.startsWith('event:')) {
			eventType = line.slice(6).trim();
		} else if (line.startsWith('data:')) {
			dataStr = line.slice(5).trimStart();
		}
	}

	if (!dataStr) return null;

	try {
		const parsed = JSON.parse(dataStr) as DecomposeEvent;
		// Prefer the SSE event field; fallback to the parsed type field
		if (eventType && !parsed.type) {
			(parsed as any).type = eventType;
		}
		return parsed;
	} catch {
		console.warn('[sse-client] Failed to parse SSE data:', dataStr.slice(0, 200));
		return null;
	}
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a POST request and consume the response as an SSE stream.
 *
 * @param url      - The endpoint URL
 * @param body     - The JSON body to POST
 * @param callbacks - Event callbacks (onModule, onError, onDone)
 * @returns An object with an `abort()` method to cancel the stream
 */
export function postSse(url: string, body: Record<string, unknown>, callbacks: PostSseCallbacks): PostSseResult {
	const controller = new AbortController();
	let buffer = '';

	fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
		signal: controller.signal
	})
		.then(async (response) => {
			if (!response.ok) {
				// Server returned a non-200 before streaming started
				const errorBody = await response.text().catch(() => 'Unknown error');
				callbacks.onError?.('connecting', `HTTP ${response.status}: ${errorBody.slice(0, 500)}`);
				callbacks.onDone?.(0, 1);
				return;
			}

			const reader = response.body?.getReader();
			if (!reader) {
				callbacks.onError?.('connecting', 'Response body is not readable');
				callbacks.onDone?.(0, 1);
				return;
			}

			const decoder = new TextDecoder();

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const { events, remaining } = parseSseBuffer(buffer);
					buffer = remaining;

					for (const event of events) {
						switch (event.type) {
							case 'module':
								callbacks.onModule?.(event.index, event.module);
								break;
							case 'error':
								callbacks.onError?.(event.stage, event.message);
								break;
							case 'done':
								callbacks.onDone?.(event.total, event.errors);
								break;
						}
					}
				}

				// Process any remaining buffer (final chunk)
				if (buffer.trim()) {
					const { events } = parseSseBuffer(buffer + '\n\n');
					for (const event of events) {
						switch (event.type) {
							case 'module':
								callbacks.onModule?.(event.index, event.module);
								break;
							case 'error':
								callbacks.onError?.(event.stage, event.message);
								break;
							case 'done':
								callbacks.onDone?.(event.total, event.errors);
								break;
						}
					}
				}
			} catch (err: any) {
				if (err.name !== 'AbortError') {
					callbacks.onError?.('streaming', err.message ?? 'Stream read error');
					callbacks.onDone?.(0, 1);
				}
			}
		})
		.catch((err: any) => {
			if (err.name !== 'AbortError') {
				callbacks.onError?.('connecting', err.message ?? 'Network error');
				callbacks.onDone?.(0, 1);
			}
		});

	return { abort: () => controller.abort() };
}

/**
 * Generic POST-based SSE consumer.
 *
 * Unlike `postSse()` which is typed to decompose events, this dispatches
 * any SSE event type via the generic callbacks. Used by compare suggestions
 * and other streaming endpoints.
 *
 * @param url       - The endpoint URL
 * @param body      - The JSON body to POST
 * @param callbacks - Generic event callbacks
 * @returns An object with an `abort()` method to cancel the stream
 */
export function postSseGeneric(
	url: string,
	body: Record<string, unknown>,
	callbacks: GenericSseCallbacks
): PostSseResult {
	const controller = new AbortController();
	let buffer = '';

	fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
		signal: controller.signal
	})
		.then(async (response) => {
			if (!response.ok) {
				const errorBody = await response.text().catch(() => 'Unknown error');
				callbacks.onError?.('connecting', `HTTP ${response.status}: ${errorBody.slice(0, 500)}`);
				callbacks.onDone?.();
				return;
			}

			const reader = response.body?.getReader();
			if (!reader) {
				callbacks.onError?.('connecting', 'Response body is not readable');
				callbacks.onDone?.();
				return;
			}

			const decoder = new TextDecoder();

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const { events, remaining } = parseSseBuffer(buffer);
					buffer = remaining;

					for (const event of events) {
						const eventType = (event as any).type ?? 'unknown';
						const eventData = event as Record<string, unknown>;
						callbacks.onEvent?.(eventType, eventData);

						switch (eventType) {
							case 'suggestion':
								callbacks.onSuggestion?.((eventData as any).content ?? '');
								break;
							case 'error':
								callbacks.onError?.(
									(eventData as any).stage ?? 'unknown',
									(eventData as any).message ?? 'Unknown error'
								);
								break;
							case 'done':
								callbacks.onDone?.();
								break;
						}
					}
				}

				// Process remaining buffer
				if (buffer.trim()) {
					const { events } = parseSseBuffer(buffer + '\n\n');
					for (const event of events) {
						const eventType = (event as any).type ?? 'unknown';
						const eventData = event as Record<string, unknown>;
						callbacks.onEvent?.(eventType, eventData);

						switch (eventType) {
							case 'suggestion':
								callbacks.onSuggestion?.((eventData as any).content ?? '');
								break;
							case 'error':
								callbacks.onError?.(
									(eventData as any).stage ?? 'unknown',
									(eventData as any).message ?? 'Unknown error'
								);
								break;
							case 'done':
								callbacks.onDone?.();
								break;
						}
					}
				}

				// Stream ended without explicit done event
				callbacks.onDone?.();
			} catch (err: any) {
				if (err.name !== 'AbortError') {
					callbacks.onError?.('streaming', err.message ?? 'Stream read error');
					callbacks.onDone?.();
				}
			}
		})
		.catch((err: any) => {
			if (err.name !== 'AbortError') {
				callbacks.onError?.('connecting', err.message ?? 'Network error');
				callbacks.onDone?.();
			}
		});

	return { abort: () => controller.abort() };
}
