<script lang="ts">
	import { goto } from '$app/navigation';
	import { postSseGeneric, type PostSseResult } from '$lib/client/sse-client.js';
	import type { EditableModule } from '$lib/stores/decompose-state.svelte.js';

	// ── Props ─────────────────────────────────────────────────────────────────

	interface Props {
		milestoneId: string;
		confirmedModules: EditableModule[];
		onDismiss: () => void;
	}

	let { milestoneId, confirmedModules, onDismiss }: Props = $props();

	// ── State ─────────────────────────────────────────────────────────────────

	let suggestionText = $state('');
	let isStreaming = $state(false);
	let isDone = $state(false);
	let errorMessage = $state<string | null>(null);
	let streamHandle: PostSseResult | null = null;

	// ── Lifecycle ─────────────────────────────────────────────────────────────

	$effect(() => {
		// Auto-start compare when component mounts
		startCompare();
		return () => {
			streamHandle?.abort();
		};
	});

	// ── Actions ───────────────────────────────────────────────────────────────

	function startCompare() {
		isStreaming = true;
		suggestionText = '';
		isDone = false;
		errorMessage = null;

		// Build modules summary for compare request
		const modulesPayload = confirmedModules.map((m) => ({
			name: m.name,
			description: m.description || undefined,
			tasks: m.tasks.map((t) => ({
				title: t.title,
				description: t.description || undefined
			}))
		}));

		streamHandle = postSseGeneric(
			`/api/milestones/${milestoneId}/compare`,
			{ modules: modulesPayload },
			{
				onSuggestion(content) {
					suggestionText += content;
				},
				onError(stage, message) {
					console.error(`[CompareSuggestions] error (${stage}):`, message);
					errorMessage = `${stage}: ${message}`;
				},
				onDone() {
					isStreaming = false;
					isDone = true;
				}
			}
		);
	}

	function handleDismiss() {
		streamHandle?.abort();
		onDismiss();
	}

	function handleContinue() {
		streamHandle?.abort();
		goto(`/milestones/${milestoneId}`);
	}

	function handleRetry() {
		startCompare();
	}
</script>

<!-- Compare suggestions panel (advisory, non-blocking) -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
	role="dialog"
	aria-modal="true"
	aria-label="AI 对比建议"
	onkeydown={(e) => e.key === 'Escape' && handleDismiss()}
>
	<div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col m-4 animate-[scaleIn_0.2s_ease-out]">
		<!-- Header -->
		<div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
			<div class="flex items-center gap-3">
				<span class="text-lg">💡</span>
				<div>
					<h2 class="text-sm font-semibold text-gray-800">AI 对比建议</h2>
					<p class="text-xs text-gray-400">参考性建议，不影响已确认的拆解结果</p>
				</div>
			</div>

			<div class="flex items-center gap-2">
				{#if isStreaming}
					<span class="inline-flex items-center gap-1.5 text-xs text-blue-600">
						<span class="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
						分析中...
					</span>
				{:else if isDone}
					<span class="text-xs text-green-600">✓ 完成</span>
				{/if}

				<button
					class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
					onclick={handleDismiss}
					aria-label="关闭"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto px-6 py-4">
			{#if errorMessage && !suggestionText}
				<!-- Error state -->
				<div class="flex flex-col items-center justify-center py-8 text-center">
					<div class="text-3xl mb-3">⚠️</div>
					<p class="text-sm text-gray-600 mb-1">对比分析遇到问题</p>
					<p class="text-xs text-gray-400 mb-4 break-words max-w-md">{errorMessage}</p>
					<button
						class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
							bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
						onclick={handleRetry}
					>
						<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
						</svg>
						重试
					</button>
				</div>
			{:else if suggestionText}
				<!-- Suggestion text (rendered as plain text with whitespace preservation) -->
				<div class="prose prose-sm max-w-none">
					<div class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{suggestionText}</div>
				</div>
				{#if errorMessage}
					<!-- Partial error after some content streamed -->
					<div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
						<p class="text-xs text-amber-700">⚠️ 流中断: {errorMessage}</p>
					</div>
				{/if}
			{:else if isStreaming}
				<!-- Waiting for first chunk -->
				<div class="flex items-center justify-center py-12">
					<div class="flex items-center gap-2 text-sm text-gray-400">
						<span class="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></span>
						正在分析对比...
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
			<button
				class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg
					text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
				onclick={handleDismiss}
			>
				关闭
			</button>
			<button
				class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg
					bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
					transition-colors shadow-sm"
				onclick={handleContinue}
			>
				继续
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
				</svg>
			</button>
		</div>
	</div>
</div>

<style>
	@keyframes scaleIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
