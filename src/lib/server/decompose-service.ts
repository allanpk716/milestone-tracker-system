/**
 * Decompose service — orchestrates LLM-based milestone decomposition.
 *
 * 1. Reads the milestone's source markdown
 * 2. Sends it to the LLM with a structured system prompt
 * 3. Incrementally parses the streaming JSON array response
 * 4. Validates each module with Zod as it becomes available
 * 5. Yields SSE events (module / error / done)
 *
 * No data is written to the database — that's S03's responsibility.
 */

import { LlmClient } from './llm-client.js';
import { createLogger } from './logger.js';
import {
	decomposeModuleSchema,
	type DecomposeModule,
	type DecomposeEvent,
	type DecomposeModuleEvent,
	type DecomposeErrorEvent,
	type DecomposeDoneEvent
} from '$lib/schemas/decompose.js';

// ── System prompt ────────────────────────────────────────────────────────────

const logger = createLogger('decompose-service');

export const DEFAULT_SYSTEM_PROMPT = `你是一个专业的项目管理助手。你的任务是将需求文档拆解为结构化的模块和任务。

## 输出格式

你必须且只能输出一个 JSON 数组，不要包含任何其他文本、注释或 markdown 标记。

\`\`\`json
[
  {
    "name": "模块名称",
    "description": "模块的简要描述",
    "tasks": [
      {
        "title": "任务标题",
        "description": "任务的详细描述（可选）"
      }
    ]
  }
]
\`\`\`

## 拆解原则

1. 每个模块应该是内聚的、可独立开发和交付的功能单元
2. 每个任务应该是明确的、可验证的工作项
3. 模块之间应该有清晰的边界和最小依赖
4. 任务粒度适中：太大需要再拆分，太小则合并
5. 保持模块名称简洁（2-10 个字），描述清晰
6. 任务标题应该是动作导向的（如"实现XX功能"而非"XX功能"）
7. 按照逻辑依赖顺序排列模块

## 注意事项

- 只输出 JSON 数组，不要输出其他任何内容
- 如果需求文档不清晰，根据上下文做出合理推断
- 每个模块至少包含一个任务
- 确保所有任务合起来能覆盖需求文档的全部内容`;

// ── Chunk event types (for multi-turn chat) ─────────────────────────────────

export interface ChunkTextEvent {
	type: 'chunk';
	stage: 'text';
	content: string;
}

export interface ChunkModulesEvent {
	type: 'chunk';
	stage: 'modules';
	modules: DecomposeModule[];
}

export type ChunkEvent = ChunkTextEvent | ChunkModulesEvent;

// ── Message building for multi-turn ─────────────────────────────────────────

const MAX_HISTORY_TURNS = 10;

export interface HistoryMessage {
	role: 'user' | 'assistant';
	content: string;
	modulesJson?: string | null;
}

export function buildMessages(
	history: HistoryMessage[],
	sourceMd: string,
	customSystemPrompt?: string | null
): Array<{ role: string; content: string }> {
	const systemPrompt = customSystemPrompt || DEFAULT_SYSTEM_PROMPT;
	const msgs: Array<{ role: string; content: string }> = [
		{ role: 'system', content: systemPrompt }
	];

	// Include source context as first user message
	msgs.push({
		role: 'user',
		content: `请将以下需求文档拆解为模块和任务：\n\n${sourceMd}`
	});

	// Add history (capped at MAX_HISTORY_TURNS turns = N user + N assistant)
	const recent = history.slice(-MAX_HISTORY_TURNS * 2);
	for (const msg of recent) {
		let content = msg.content;
		if (msg.role === 'assistant' && msg.modulesJson) {
			// Append modules info for context
			try {
				const mods = JSON.parse(msg.modulesJson);
				if (Array.isArray(mods) && mods.length > 0) {
					content += `\n\n[已提取模块: ${mods.map((m: any) => m.name).join(', ')}]`;
				}
			} catch {
				// ignore parse errors
			}
		}
		msgs.push({ role: msg.role, content });
	}

	return msgs;
}

// ── Module extraction from LLM response ──────────────────────────────────────

export function extractModulesFromText(text: string): DecomposeModule[] {
	const modules: DecomposeModule[] = [];

	// Try to find JSON array in the text
	// First try: fenced code block
	const fencedMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
	if (fencedMatch) {
		const parsed = tryParseModules(fencedMatch[1]);
		if (parsed.length > 0) return parsed;
	}

	// Second try: bare JSON array
	const bareMatch = text.match(/\[[\s\S]*\]/);
	if (bareMatch) {
		const parsed = tryParseModules(bareMatch[0]);
		if (parsed.length > 0) return parsed;
	}

	return modules;
}

function tryParseModules(jsonStr: string): DecomposeModule[] {
	const modules: DecomposeModule[] = [];
	try {
		const parsed = JSON.parse(jsonStr);
		const candidates = Array.isArray(parsed) ? parsed : [parsed];
		for (const candidate of candidates) {
			const result = decomposeModuleSchema.safeParse(candidate);
			if (result.success) {
				modules.push(result.data);
			}
		}
	} catch {
		// Try extracting individual objects
		const { objects } = extractCompleteJsonObjects(jsonStr);
		for (const objStr of objects) {
			try {
				const parsed = JSON.parse(objStr);
				const candidates = Array.isArray(parsed) ? parsed : [parsed];
				for (const candidate of candidates) {
					const result = decomposeModuleSchema.safeParse(candidate);
					if (result.success) {
						modules.push(result.data);
					}
				}
			} catch {
				// skip
			}
		}
	}
	return modules;
}

// ── Multi-turn stream decompose ──────────────────────────────────────────────

/**
 * Stream a multi-turn decompose chat. Yields chunk events for text streaming
 * and module extraction.
 */
export async function* streamDecomposeMulti(
	history: HistoryMessage[],
	sourceMd: string,
	client?: LlmClient,
	opts?: { customSystemPrompt?: string | null }
): AsyncGenerator<ChunkEvent | DecomposeErrorEvent | DecomposeDoneEvent> {
	const llm = client ?? new LlmClient();
	let fullText = '';
	let errorCount = 0;
	let extractedModules: DecomposeModule[] = [];

	const msgs = buildMessages(history, sourceMd, opts?.customSystemPrompt);

	try {
		for await (const chunk of llm.chatCompletionStreamMulti(msgs)) {
			fullText += chunk;
			yield { type: 'chunk', stage: 'text', content: chunk } as ChunkTextEvent;
		}

		// After stream completes, extract modules from the full response
		extractedModules = extractModulesFromText(fullText);
		if (extractedModules.length > 0) {
			yield { type: 'chunk', stage: 'modules', modules: extractedModules } as ChunkModulesEvent;
		}
	} catch (err: any) {
		errorCount++;
		yield { type: 'error', stage: 'streaming', message: err.message } as DecomposeErrorEvent;
	} finally {
		yield { type: 'done', total: extractedModules.length, errors: errorCount } as DecomposeDoneEvent;
	}
}

// ── Incremental JSON object extractor ───────────────────────────────────────

/**
 * Tracks brace depth, string state, and escape state to extract
 * complete JSON objects from a streaming byte buffer.
 *
 * Handles:
 * - Nested objects and arrays
 * - Strings containing braces and brackets
 * - Escaped characters inside strings
 * - Multiple complete objects in one chunk
 * - Objects split across chunks
 */
export function extractCompleteJsonObjects(buffer: string): {
	objects: string[];
	remaining: string;
} {
	const objects: string[] = [];
	let depth = 0;
	let inString = false;
	let escaped = false;
	let objStart = -1;

	for (let i = 0; i < buffer.length; i++) {
		const ch = buffer[i];

		if (escaped) {
			escaped = false;
			continue;
		}

		if (ch === '\\' && inString) {
			escaped = true;
			continue;
		}

		if (ch === '"') {
			inString = !inString;
			continue;
		}

		if (inString) continue;

		if (ch === '{' || ch === '[') {
			if (depth === 0) {
				objStart = i;
			}
			depth++;
		} else if (ch === '}' || ch === ']') {
			depth--;
			if (depth === 0 && objStart !== -1) {
				objects.push(buffer.slice(objStart, i + 1));
				objStart = -1;
			}
		}
	}

	return {
		objects,
		remaining: objStart !== -1 ? buffer.slice(objStart) : ''
	};
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Stream-decompose a milestone's source markdown into modules via LLM.
 *
 * @param sourceMd - The raw markdown content of the milestone
 * @param client   - Optional LlmClient instance (for testing / custom config)
 *
 * Yields `DecomposeEvent` objects:
 * - `{ type: 'module', index, module }` — successfully validated module
 * - `{ type: 'error', stage, message }` — error during the process
 * - `{ type: 'done', total, errors }` — stream complete
 */
export async function* streamDecompose(
	sourceMd: string,
	client?: LlmClient
): AsyncGenerator<DecomposeEvent> {
	const llm = client ?? new LlmClient();
	let moduleIndex = 0;
	let errorCount = 0;
	let jsonBuffer = '';

	const userMessage = `请将以下需求文档拆解为模块和任务：\n\n${sourceMd}`;

	try {
		// Phase 1: Connecting
		for await (const chunk of llm.chatCompletionStream(DEFAULT_SYSTEM_PROMPT, userMessage)) {
			jsonBuffer += chunk;

			// Try to extract complete objects from the buffer
			const { objects, remaining } = extractCompleteJsonObjects(jsonBuffer);
			jsonBuffer = remaining;

			for (const jsonStr of objects) {
				// The extracted JSON might be an array (the LLM wraps modules in [])
				let candidates: unknown[];
				try {
					const parsed = JSON.parse(jsonStr);
					candidates = Array.isArray(parsed) ? parsed : [parsed];
				} catch {
					// JSON parse failed — might be an array with some bad elements.
					// Strip outer array brackets and re-extract individual objects.
					let innerStr = jsonStr.trim();
					if (innerStr.startsWith('[') && innerStr.endsWith(']')) {
						innerStr = innerStr.slice(1, -1);
					}
					const inner = extractCompleteJsonObjects(innerStr);
					if (inner.objects.length > 0) {
						const parsed: unknown[] = [];
						for (const s of inner.objects) {
							try { parsed.push(JSON.parse(s)); } catch {
								errorCount++;
								yield { type: 'error', stage: 'parsing' as const, message: `JSON parse error: malformed object` };
							}
						}
						candidates = parsed;
						if (candidates.length === 0) continue;
					} else {
						// Truly unparseable
						errorCount++;
						const event: DecomposeErrorEvent = {
							type: 'error',
							stage: 'parsing',
							message: `JSON parse error: unparseable content`
						};
						yield event;
						logger.warn('JSON parse error: unparseable content');
						continue;
					}
				}

				for (const candidate of candidates) {
					const result = decomposeModuleSchema.safeParse(candidate);

					if (result.success) {
						const event: DecomposeModuleEvent = {
							type: 'module',
							index: moduleIndex++,
							module: result.data
						};
						yield event;
					} else {
						errorCount++;
						const detail = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
						const event: DecomposeErrorEvent = {
							type: 'error',
							stage: 'parsing',
							message: `Zod validation failed: ${detail}`
						};
						yield event;
						logger.warn('Zod validation failed for module', { detail });
					}
				}
			}
		}

		// Phase 2: Handle any remaining buffer (partial object at end of stream)
		if (jsonBuffer.trim()) {
			// Try wrapping in array brackets if it looks like the LLM forgot them
			let finalBuffer = jsonBuffer.trim();
			if (!finalBuffer.startsWith('[') && !finalBuffer.startsWith('{')) {
				finalBuffer = `[${finalBuffer}]`;
			}

			const { objects } = extractCompleteJsonObjects(finalBuffer);
			for (const jsonStr of objects) {
				let candidates: unknown[];
				try {
					const parsed = JSON.parse(jsonStr);
					candidates = Array.isArray(parsed) ? parsed : [parsed];
				} catch (parseErr: any) {
					errorCount++;
					const event: DecomposeErrorEvent = {
						type: 'error',
						stage: 'parsing',
						message: `JSON parse error on remaining buffer: ${parseErr.message}`
					};
					yield event;
					continue;
				}

				for (const candidate of candidates) {
					const result = decomposeModuleSchema.safeParse(candidate);
					if (result.success) {
						const event: DecomposeModuleEvent = {
							type: 'module',
							index: moduleIndex++,
							module: result.data
						};
						yield event;
					} else {
						errorCount++;
						const detail = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
						const event: DecomposeErrorEvent = {
							type: 'error',
							stage: 'parsing',
							message: `Zod validation failed: ${detail}`
						};
						yield event;
					}
				}
			}
		}
	} catch (err: any) {
		errorCount++;
		// Classify the error stage
		let stage: 'connecting' | 'streaming' | 'parsing' = 'connecting';
		if (moduleIndex > 0) {
			stage = 'streaming';
		}
		const event: DecomposeErrorEvent = {
			type: 'error',
			stage,
			message: err.message
		};
		yield event;
		logger.warn('Stream error', { error: err.message });
	} finally {
		const doneEvent: DecomposeDoneEvent = {
			type: 'done',
			total: moduleIndex,
			errors: errorCount
		};
		yield doneEvent;
		logger.info('Stream complete', { total: moduleIndex, errors: errorCount });
	}
}
