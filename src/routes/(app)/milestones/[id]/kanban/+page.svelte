<script lang="ts">
	import { page } from '$app/state';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import KanbanModuleCard from '$lib/components/KanbanModuleCard.svelte';
	import TaskContextMenu from '$lib/components/TaskContextMenu.svelte';
	import TaskEditModal from '$lib/components/TaskEditModal.svelte';

	let { data } = $props();
	let kanban = $derived(data.kanban);

	interface TaskSummary {
		id: string;
		shortId: number;
		title: string;
		status: string;
		moduleId: string;
	}

	// Build flat task lookup map: shortId → TaskSummary (for #N ref expansion)
	let taskMap: Map<number, TaskSummary> = $derived.by(() => {
		const map = new Map<number, TaskSummary>();
		for (const mod of kanban.modules) {
			for (const task of mod.tasks) {
				map.set(task.shortId, {
					id: task.id,
					shortId: task.shortId,
					title: task.title,
					status: task.status,
					moduleId: task.moduleId
				});
			}
		}
		return map;
	});

	// Compute overall stats
	let totalModules = $derived(kanban.modules.length);
	let completedModules = $derived(kanban.modules.filter((m: any) => m.status === 'completed').length);
	let totalTasks = $derived(kanban.modules.reduce((s: number, m: any) => s + m.totalTasks, 0));
	let doneTasks = $derived(kanban.modules.reduce((s: number, m: any) => s + m.doneTasks, 0));
	let progressPercent = $derived(totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0);
	let zombieCount = $derived(
		kanban.modules.reduce((s: number, m: any) => s + m.tasks.filter((t: any) => t.isZombie).length, 0)
	);
	let inProgressCount = $derived(
		kanban.modules.reduce((s: number, m: any) => s + m.tasks.filter((t: any) => t.status === 'in-progress').length, 0)
	);

	// Status filter
	let statusFilter = $state<string>('all');
	const statusOptions = [
		{ value: 'all', label: '全部' },
		{ value: 'todo', label: '待办' },
		{ value: 'in-progress', label: '进行中' },
		{ value: 'blocked', label: '阻塞' },
		{ value: 'review', label: '审核中' },
		{ value: 'done', label: '已完成' },
		{ value: 'skipped', label: '已跳过' }
	];

	let filteredModules = $derived.by(() => {
		if (statusFilter === 'all') return kanban.modules;
		return kanban.modules.map((mod: any) => ({
			...mod,
			tasks: mod.tasks.filter((t: any) => t.status === statusFilter)
		})).filter((mod: any) => mod.tasks.length > 0);
	});

	function progressColor(percent: number): string {
		if (percent === 100) return 'bg-green-500';
		if (percent >= 60) return 'bg-blue-500';
		if (percent >= 30) return 'bg-yellow-500';
		return 'bg-gray-400';
	}
</script>

<svelte:head>
	<title>{kanban.title} — 看板视图</title>
</svelte:head>

<!-- Breadcrumb -->
<nav class="flex items-center gap-1 text-sm text-gray-500 mb-6">
	<a href="/" class="hover:text-blue-600 transition-colors">里程碑列表</a>
	<span>/</span>
	<a href="/milestones/{kanban.id}" class="hover:text-blue-600 transition-colors">{kanban.title}</a>
	<span>/</span>
	<span class="text-gray-800">看板视图</span>
</nav>

<!-- Header -->
<div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0">
			<div class="flex items-center gap-3">
				<h1 class="text-xl font-bold text-gray-900 truncate">{kanban.title}</h1>
				<StatusBadge status={kanban.status} size="md" />
			</div>
			<p class="text-sm text-gray-400 font-mono mt-1">{kanban.id}</p>
		</div>
		<a
			href="/milestones/{kanban.id}"
			class="text-sm text-blue-600 hover:underline flex-shrink-0"
		>
			← 返回详情
		</a>
	</div>

	<!-- Overall progress -->
	{#if totalTasks > 0}
		<div class="mt-4">
			<div class="flex items-center justify-between text-sm mb-1">
				<span class="text-gray-600">总体进度</span>
				<span class="text-gray-500">{doneTasks}/{totalTasks} ({progressPercent}%)</span>
			</div>
			<div class="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
				<div
					class="h-full rounded-full transition-all {progressColor(progressPercent)}"
					style="width: {progressPercent}%"
				></div>
			</div>
		</div>
	{/if}

	<!-- Stats row -->
	<div class="flex items-center gap-6 mt-4 text-sm text-gray-500">
		<span>📦 模块: {completedModules}/{totalModules}</span>
		<span>📋 任务: {doneTasks}/{totalTasks}</span>
		{#if inProgressCount > 0}
			<span class="text-blue-600">🔄 进行中: {inProgressCount}</span>
		{/if}
		{#if zombieCount > 0}
			<span class="text-amber-600">⚠️ 僵尸任务: {zombieCount}</span>
		{/if}
	</div>
</div>

<!-- Status filter -->
<div class="flex items-center gap-2 mb-4">
	<span class="text-sm text-gray-500">筛选:</span>
	{#each statusOptions as opt}
		<button
			class="px-3 py-1 text-xs rounded-full border transition-colors
				{statusFilter === opt.value
					? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
					: 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}"
			onclick={() => (statusFilter = opt.value)}
		>
			{opt.label}
		</button>
	{/each}
</div>

<!-- Module cards -->
<div class="space-y-3">
	{#if filteredModules.length > 0}
		{#each filteredModules as module (module.id)}
			<KanbanModuleCard module={module} {taskMap} />
		{/each}
	{:else}
		<div class="bg-white rounded-lg border border-gray-200 p-8 text-center">
			<div class="text-3xl mb-3">📊</div>
			<p class="text-sm text-gray-500">
				{statusFilter === 'all' ? '暂无模块' : `没有「${statusOptions.find(o => o.value === statusFilter)?.label}」状态的任务`}
			</p>
		</div>
	{/if}
</div>

<!-- Global overlays (positioned fixed, rendered at page level) -->
<TaskContextMenu />
<TaskEditModal />
