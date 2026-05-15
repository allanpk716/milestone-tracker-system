<script lang="ts">
	import { goto } from '$app/navigation';
	import { postSse, type PostSseResult } from '$lib/client/sse-client.js';
	import type { DecomposeModule } from '$lib/schemas/decompose.js';
	import { setPendingModules } from '$lib/stores/decompose-state.svelte.js';

	// ── Props ─────────────────────────────────────────────────────────────────

	interface Props {
		milestoneId: string;
		sourceMd: string | null;
		status: string;
	}

	let { milestoneId, sourceMd, status }: Props = $props();

	// ── Types ─────────────────────────────────────────────────────────────────

	interface StreamModule extends DecomposeModule {
		index: number;
	}

	interface StreamError {
		stage: string;
		message: string;
	}

	interface StreamStats {
		total: number;
		errors: number;
		tasks: number;
	}

	// ── State ─────────────────────────────────────────────────────────────────

	let modules = $state<StreamModule[]>([]);
	let errors = $state<StreamError[]>([]);
	let isStreaming = $state(false);
	let isDone = $state(false);
	let stats = $state<StreamStats | null>(null);
	let streamHandle: PostSseResult | null = null;

	// ── Derived ───────────────────────────────────────────────────────────────

	let canDecompose = $derived(
		status === 'draft' && !!sourceMd && !isStreaming
	);
	let totalTasks = $derived(
		modules.reduce((sum, m) => sum + m.tasks.length, 0)
	);

	// ── Actions ───────────────────────────────────────────────────────────────

	function startDecompose() {
		// Reset state
		modules = [];
		errors = [];
		isDone = false;
		stats = null;
		isStreaming = true;

		streamHandle = postSse(`/api/milestones/${milestoneId}/decompose`, {}, {
			onModule(index, module) {
				modules = [...modules, { ...module, index }];
			},
			onError(stage, message) {
				errors = [...errors, { stage, message }];
			},
			onDone(total, errorCount) {
				isStreaming = false;
				isDone = true;
				stats = {
					total,
					errors: errorCount,
					tasks: totalTasks
				};
			}
		});
	}

	function cancelDecompose() {
		streamHandle?.abort();
		isStreaming = false;
		isDone = true;
	}

	/** Store modules in shared state and navigate to preview page. */
	function goToPreview() {
		const plainModules = modules.map((m) => ({
			name: m.name,
			description: m.description ?? undefined,
			tasks: m.tasks.map((t) => ({
				title: t.title,
				description: t.description ?? undefined
			}))
		}));
		setPendingModules(milestoneId, plainModules);
		goto(`/milestones/${milestoneId}/preview`);
	}
</script>

{#if status === 'draft' && sourceMd}
	<div class="mb-6">
		<!-- Action bar -->
		<div class="flex items-center gap-3">
			{#if !isStreaming && !isDone}
				<button
					class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
					       bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
					       transition-colors shadow-sm"
					onclick={startDecompose}
				>
					<span>🤖</span>
					<span>AI 拆解</span>
				</button>
			{:else if isStreaming}
				<div class="flex items-center gap-2 text-sm text-blue-600">
					<span class="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
					<span>AI 正在分析中...</span>
				</div>
				<button
					class="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300 active:bg-red-200 transition-all shadow-sm inline-flex items-center gap-1.5"
					onclick={cancelDecompose}
				>
					<span>✕</span>
					<span>终止</span>
				</button>
			{/if}
		</div>

		<!-- Streamed results -->
		{#if modules.length > 0 || errors.length > 0}
			<div class="mt-4 space-y-3">
				<!-- Streamed modules -->
				{#each modules as mod (mod.index)}
					<div class="bg-white rounded-lg border border-gray-200 p-4 animate-[fadeSlideIn_0.3s_ease-out]">
						<div class="flex items-start gap-3">
							<span class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">
								{mod.index + 1}
							</span>
							<div class="flex-1 min-w-0">
								<h3 class="text-sm font-semibold text-gray-800">{mod.name}</h3>
								{#if mod.description}
									<p class="text-xs text-gray-500 mt-1">{mod.description}</p>
								{/if}
								{#if mod.tasks.length > 0}
									<ul class="mt-2 space-y-1">
										{#each mod.tasks as task, j}
											<li class="flex items-start gap-2 text-xs text-gray-600">
												<span class="text-gray-400 mt-0.5">•</span>
												<span class="font-medium">{task.title}</span>
												{#if task.description}
													<span class="text-gray-400">— {task.description}</span>
												{/if}
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						</div>
					</div>
				{/each}

				<!-- Errors -->
				{#each errors as err, i}
					<div class="bg-red-50 border border-red-200 rounded-lg p-3 animate-[fadeSlideIn_0.3s_ease-out]">
						<div class="flex items-start gap-2">
							<span class="text-red-500 text-sm">⚠️</span>
							<div class="flex-1 min-w-0">
								<p class="text-xs font-medium text-red-700">解析错误 ({err.stage})</p>
								<p class="text-xs text-red-600 mt-0.5 break-words">{err.message}</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Done stats -->
		{#if isDone && stats}
			<div class="mt-4 flex items-center gap-4 text-sm">
				<div class="flex items-center gap-1.5 text-gray-600">
					<span>📦</span>
					<span><strong>{stats.total}</strong> 个模块</span>
				</div>
				<div class="flex items-center gap-1.5 text-gray-600">
					<span>📝</span>
					<span><strong>{stats.tasks}</strong> 个任务</span>
				</div>
				{#if stats.errors > 0}
					<div class="flex items-center gap-1.5 text-red-600">
						<span>⚠️</span>
						<span><strong>{stats.errors}</strong> 个错误</span>
					</div>
				{/if}
				{#if !isStreaming}
					<button
						class="text-xs text-blue-600 hover:underline"
						onclick={startDecompose}
					>
						重新拆解
					</button>
					{#if stats.total > 0}
						<button
							class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
								bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
								transition-colors shadow-sm"
							onclick={goToPreview}
						>
							<span>📋</span>
							<span>预览编辑</span>
						</button>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	@keyframes fadeSlideIn {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
</style>
