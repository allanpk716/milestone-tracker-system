<script lang="ts">
	import { page } from '$app/state';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import ModuleSection from '$lib/components/ModuleSection.svelte';
	import DecomposeStream from '$lib/components/DecomposeStream.svelte';
	import { hasPendingModules } from '$lib/stores/decompose-state.svelte.js';
	import { toast } from '$lib/stores/toast.svelte.js';

	let { data } = $props();
	let milestone = $derived(data.milestone);

	interface Module {
		id: string;
		milestoneId: string;
		name: string;
		description: string | null;
		status: string;
		sortOrder: number;
		tasks: any[];
	}

	let modules: Module[] = $derived(milestone.modules ?? []);

	// Compute overall progress
	let totalTasks = $derived(modules.reduce((sum, m) => sum + m.tasks.length, 0));
	let doneTasks = $derived(
		modules.reduce((sum, m) => sum + m.tasks.filter((t: any) => t.status === 'done').length, 0)
	);
	let progressPercent = $derived(totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0);

	let sourcePreview = $derived(
		milestone.sourceMd ? milestone.sourceMd.slice(0, 500) + (milestone.sourceMd.length > 500 ? '…' : '') : null
	);

	let showFullSource = $state(false);

	// Status update handler
	let statusOptions = ['draft', 'in-progress', 'completed', 'archived'] as const;

	async function updateStatus(newStatus: string) {
		try {
			const res = await fetch(`/api/milestones/${milestone.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus })
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			toast.show('状态已更新', 'success');
			// Reload page data
			window.location.reload();
		} catch {
			toast.show('更新状态失败', 'error');
		}
	}
</script>

<svelte:head>
	<title>{milestone.title} — 里程碑详情</title>
</svelte:head>

<!-- Breadcrumb -->
<nav class="flex items-center gap-1 text-sm text-gray-500 mb-6">
	<a href="/" class="hover:text-blue-600 transition-colors">里程碑列表</a>
	<span>/</span>
	<span class="text-gray-800">{milestone.title}</span>
</nav>

<!-- Header -->
<div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0">
			<div class="flex items-center gap-3">
				<h1 class="text-xl font-bold text-gray-900 truncate">{milestone.title}</h1>
				<StatusBadge status={milestone.status} size="md" />
			</div>
			<p class="text-sm text-gray-400 font-mono mt-1">{milestone.id}</p>
			<div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
				<span>📅 {new Date(milestone.createdAt).toLocaleDateString('zh-CN')}</span>
				{#if milestone.gitUrl}
					<a
						href={milestone.gitUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-600 hover:underline truncate max-w-[300px]"
					>
						🔗 {milestone.gitUrl}
					</a>
				{/if}
			</div>
		</div>

		<!-- Status changer -->
		<select
			class="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
			value={milestone.status}
			onchange={(e) => updateStatus(e.currentTarget.value)}
		>
			{#each statusOptions as opt}
				<option value={opt}>{opt}</option>
			{/each}
		</select>
	</div>

	<!-- Progress bar -->
	{#if totalTasks > 0}
		<div class="mt-4">
			<div class="flex items-center justify-between text-sm mb-1">
				<span class="text-gray-600">总体进度</span>
				<span class="text-gray-500">{doneTasks}/{totalTasks} ({progressPercent}%)</span>
			</div>
			<div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
				<div
					class="h-full rounded-full transition-all {progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}"
					style="width: {progressPercent}%"
				></div>
			</div>
		</div>
	{/if}
</div>

<!-- Source MD preview -->
{#if sourcePreview}
	<div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
		<div class="flex items-center justify-between mb-3">
			<h2 class="text-sm font-semibold text-gray-700">📋 来源文档</h2>
			{#if milestone.sourceMd && milestone.sourceMd.length > 500}
				<button
					class="text-xs text-blue-600 hover:underline"
					onclick={() => (showFullSource = !showFullSource)}
				>
					{showFullSource ? '收起' : '展开全文'}
				</button>
			{/if}
		</div>
		<pre class="text-sm text-gray-600 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-64 overflow-y-auto">
			{showFullSource ? milestone.sourceMd : sourcePreview}
		</pre>
	</div>
{/if}

<!-- AI Decompose Stream -->
<DecomposeStream milestoneId={milestone.id} sourceMd={milestone.sourceMd} status={milestone.status} />

<!-- Continue editing link (shown when pending modules exist in shared state) -->
{#if milestone.status === 'draft' && hasPendingModules(milestone.id)}
	<div class="mb-6">
		<a
			href="/milestones/{milestone.id}/preview"
			class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
				border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100
				transition-colors"
		>
			<span>📋</span>
			<span>继续编辑</span>
		</a>
		<span class="text-xs text-gray-400 ml-2">返回预览编辑页面继续修改拆解结果</span>
	</div>
{/if}

<!-- Kanban view link -->
<div class="mb-6">
	<a
		href="/milestones/{milestone.id}/kanban"
		class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
			border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100
			transition-colors"
	>
		<span>📊</span>
		<span>看板视图</span>
	</a>
	<span class="text-xs text-gray-400 ml-2">以看板形式查看模块和任务进度</span>
</div>

<!-- Modules -->
<div class="space-y-4">
	{#if modules.length > 0}
		<h2 class="text-sm font-semibold text-gray-700">
			📦 模块 ({modules.length})
		</h2>
		{#each modules as module (module.id)}
			<ModuleSection {module} />
		{/each}
	{:else}
		<div class="bg-white rounded-lg border border-gray-200 p-8 text-center">
			<div class="text-3xl mb-3">📦</div>
			<p class="text-sm text-gray-500">暂无模块</p>
			<p class="text-xs text-gray-400 mt-1">后续可通过分解功能添加模块和任务</p>
		</div>
	{/if}
</div>
