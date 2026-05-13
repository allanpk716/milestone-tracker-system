/**
 * Compare service — streams LLM comparison of decomposed result vs original requirements.
 *
 * Takes source markdown + confirmed modules/tasks, asks the LLM to compare
 * and suggest improvements. Output is advisory plain text (not structured JSON).
 *
 * Uses SSE events: suggestion (text chunks), done, error.
 */

import { LlmClient } from './llm-client.js';
import { createLogger } from './logger.js';
import type { ConfirmModule } from '$lib/schemas/confirm.js';
import type {
	CompareEvent,
	CompareSuggestionEvent,
	CompareErrorEvent,
	CompareDoneEvent
} from '$lib/schemas/confirm.js';

const logger = createLogger('compare-service');

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `你是一个专业的项目管理助手。你的任务是对比原始需求文档和拆解结果，给出改进建议。

## 工作方式

1. 仔细阅读原始需求文档
2. 对比已拆解的模块和任务
3. 指出可能遗漏的需求点
4. 建议模块或任务的优化方向
5. 标注优先级较高的建议

## 输出要求

- 用简洁的中文输出分析结果
- 每个建议单独一段，标注类型（遗漏/优化/拆分建议）
- 最后给出一个简短的总结评分（覆盖度 0-100%）
- 不要输出 JSON 或结构化格式，直接输出纯文本`;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Stream LLM comparison of source markdown vs confirmed modules.
 *
 * Yields CompareEvent objects:
 * - `{ type: 'suggestion', content }` — text chunk from LLM
 * - `{ type: 'error', stage, message }` — error during streaming
 * - `{ type: 'done' }` — stream complete
 */
export async function* streamCompare(
	sourceMd: string,
	confirmedModules: ConfirmModule[],
	client?: LlmClient
): AsyncGenerator<CompareEvent> {
	const llm = client ?? new LlmClient();

	// Build a structured text representation of the confirmed modules
	const modulesText = confirmedModules
		.map((mod, idx) => {
			const tasksText = mod.tasks.map((t, tIdx) => `    ${tIdx + 1}. ${t.title}${t.description ? ` - ${t.description}` : ''}`).join('\n');
			return `模块 ${idx + 1}: ${mod.name}${mod.description ? `\n  描述: ${mod.description}` : ''}\n  任务:\n${tasksText}`;
		})
		.join('\n\n');

	const userMessage = `## 原始需求文档

${sourceMd}

## 拆解结果

${modulesText}

请对比以上内容，给出改进建议。`;

	logger.info('Starting comparison', {
		sourceMdLength: sourceMd.length,
		moduleCount: confirmedModules.length,
		taskCount: confirmedModules.reduce((sum, m) => sum + m.tasks.length, 0)
		// apiKey intentionally omitted
	});

	try {
		for await (const chunk of llm.chatCompletionStream(SYSTEM_PROMPT, userMessage)) {
			const event: CompareSuggestionEvent = {
				type: 'suggestion',
				content: chunk
			};
			yield event;
		}

		const doneEvent: CompareDoneEvent = { type: 'done' };
		yield doneEvent;
		logger.info('Comparison complete');
	} catch (err: any) {
		const stage: 'connecting' | 'streaming' = 'connecting';
		const errorEvent: CompareErrorEvent = {
			type: 'error',
			stage,
			message: err.message
		};
		yield errorEvent;
		logger.warn('Stream error', { error: err.message });
	}
}
