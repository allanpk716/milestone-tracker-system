<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import MdViewer from '$lib/components/MdViewer.svelte';
	import DecomposeEditor from '$lib/components/DecomposeEditor.svelte';
	import CompareSuggestions from '$lib/components/CompareSuggestions.svelte';
	import {
		getPendingModules,
		clearPendingModules,
		type EditableModule
	} from '$lib/stores/decompose-state.svelte.js';
	import { toast } from '$lib/stores/toast.svelte.js';

	let { data } = $props();
	let milestone = $derived(data.milestone);

	// ── State ─────────────────────────────────────────────────────────────────

	let milestoneId = $derived(milestone.id);

	let modules = $state<EditableModule[]>(
		getPendingModules(milestoneId) ?? []
	);

	let isConfirming = $state(false);
	let confirmResult = $state<{
		moduleCount: number;
		taskCount: number;
		moduleIds: string[];
	} | null>(null);

	let showCompare = $state(false);
	let hasEdits = $state(false);

	// ── Track edits for unsaved-changes guard ─────────────────────────────────

	function markEdited() {
		if (!hasEdits) hasEdits = true;
	}

	// ── Derived ───────────────────────────────────────────────────────────────

	let checkedModules = $derived(
		modules.filter((m) => m.checked && m.tasks.some((t) => t.checked))
	);

	let canConfirm = $derived(
		checkedModules.length > 0 && !isConfirming && milestone.status === 'draft'
	);

	let checkedTaskCount = $derived(
		checkedModules.reduce(
			(sum, m) => sum + m.tasks.filter((t) => t.checked).length,
			0
		)
	);

	// ── Before-unload guard ───────────────────────────────────────────────────

	onMount(() => {
		const handler = (e: BeforeUnloadEvent) => {
			if (hasEdits && !confirmResult) {
				e.preventDefault();
				e.returnValue = '';
			}
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	});

	// ── Confirm action ────────────────────────────────────────────────────────

	async function handleConfirm() {
		if (!canConfirm) {
			if (checkedModules.length === 0) {
				toast.show('请至少选择一个模块', 'error');
			}
			return;
		}

		isConfirming = true;

		try {
			// Build confirm payload from checked modules/tasks
			const confirmModules = checkedModules.map((m) => ({
				name: m.name,
				description: m.description || undefined,
				tasks: m.tasks
					.filter((t) => t.checked)
					.map((t) => ({
						title: t.title,
						description: t.description || undefined
					}))
			}));

			const res = await fetch(`/api/milestones/${milestone.id}/confirm`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ modules: confirmModules })
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				const msg = (body as any).error?.message ?? `HTTP ${res.status}`;
				throw new Error(msg);
			}

			const result = await res.json();

			// Store result for UI feedback
			confirmResult = {
				moduleCount: result.modules?.length ?? 0,
				taskCount: result.modules?.reduce(
					(sum: number, m: any) => sum + (m.tasks?.length ?? 0),
					0
				),
				moduleIds: (result.modules ?? []).map((m: any) => m.id)
			};

			// Clear pending state
			clearPendingModules(milestone.id);

			console.log(
				`[confirm] Milestone ${milestone.id} activated: ${confirmResult.moduleCount} modules, ${confirmResult.taskCount} tasks, IDs:`,
				confirmResult.moduleIds
			);

			toast.show(
				`已确认 ${confirmResult.moduleCount} 个模块，${confirmResult.taskCount} 个任务`,
				'success'
			);

			// Show compare suggestions panel (non-blocking advisory)
			showCompare = true;
		} catch (err: any) {
			console.error('[confirm] Failed:', err);
			toast.show(`确认失败: ${err.message}`, 'error');
			isConfirming = false;
		}
	}

	/** Called when CompareSuggestions is dismissed — navigate to detail page. */
	function handleCompareDismiss() {
		showCompare = false;
		goto(`/milestones/${milestone.id}`);
	}
</script>

<svelte:head>
	<title>预览编辑 — {milestone.title}</title>
</svelte:head>

<!-- Compare suggestions overlay -->
{#if showCompare && confirmResult}
	<CompareSuggestions
		milestoneId={milestoneId}
		confirmedModules={checkedModules}
		onDismiss={handleCompareDismiss}
	/>
{/if}

<!-- Top bar -->
<div class="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
	<div class="flex items-center gap-3 min-w-0">
		<a
			href="/milestones/{milestone.id}"
			class="flex-shrink-0 text-sm text-gray-500 hover:text-blue-600 transition-colors"
		>
			← 返回
		</a>
		<h1 class="text-sm font-semibold text-gray-800 truncate">{milestone.title}</h1>
	</div>

	<div class="flex items-center gap-3">
		{#if canConfirm}
			<span class="text-xs text-gray-400">
				{checkedModules.length} 个模块 · {checkedTaskCount} 个任务
			</span>
			<button
				class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
					bg-green-600 text-white hover:bg-green-700 active:bg-green-800
					transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
				disabled={!canConfirm}
				onclick={handleConfirm}
			>
				{#if isConfirming}
					<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
					确认中...
				{:else}
					✅ 确认拆解
				{/if}
			</button>
		{:else if confirmResult}
			<div class="flex items-center gap-2 text-sm text-green-600">
				<span>✅ 已确认</span>
				<span class="text-xs text-gray-400">
					{confirmResult.moduleCount} 模块 · {confirmResult.taskCount} 任务
				</span>
			</div>
		{/if}
	</div>
</div>

<!-- Success banner (visible when confirmed, before compare modal) -->
{#if confirmResult && !showCompare}
	<div class="bg-green-50 border-b border-green-200 px-4 py-3 text-center animate-[fadeSlideIn_0.3s_ease-out]">
		<p class="text-sm text-green-700">
			🎉 里程碑已激活！{confirmResult.moduleCount} 个模块，{confirmResult.taskCount} 个任务已写入。
		</p>
		<a
			href="/milestones/{milestone.id}"
			class="text-sm text-blue-600 hover:underline"
		>
			查看详情 →
		</a>
	</div>
{/if}

<!-- Main content: left-right split -->
<div class="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
	<!-- Left panel: Markdown viewer -->
	<div class="md:w-1/2 h-1/2 md:h-full border-r border-gray-200 bg-white">
		{#if milestone.sourceMd}
			<MdViewer sourceMd={milestone.sourceMd} />
		{:else}
			<div class="flex items-center justify-center h-full text-sm text-gray-400">
				暂无来源文档
			</div>
		{/if}
	</div>

	<!-- Right panel: Decompose editor -->
	<div class="md:w-1/2 h-1/2 md:h-full bg-gray-50">
		{#if modules.length > 0}
			<DecomposeEditor bind:modules onchange={markEdited} />
		{:else}
			<div class="flex flex-col items-center justify-center h-full text-center px-6">
				<div class="text-4xl mb-4">📦</div>
				<p class="text-sm text-gray-500 mb-1">暂无拆解结果</p>
				<p class="text-xs text-gray-400">
					请先在详情页使用 AI 拆解功能生成模块和任务
				</p>
				<a
					href="/milestones/{milestone.id}"
					class="mt-4 text-sm text-blue-600 hover:underline"
				>
					返回详情页
				</a>
			</div>
		{/if}
	</div>
</div>

<style>
	@keyframes fadeSlideIn {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
