<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import KanbanModuleCard from '$lib/components/KanbanModuleCard.svelte';
	import DecomposeStream from '$lib/components/DecomposeStream.svelte';
	import MdViewer from '$lib/components/MdViewer.svelte';
	import TaskContextMenu from '$lib/components/TaskContextMenu.svelte';
	import TaskEditModal from '$lib/components/TaskEditModal.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { hasPendingModules } from '$lib/stores/decompose-state.svelte.js';
	import { toast } from '$lib/stores/toast.svelte.js';

	let { data } = $props();
	let kanban = $derived(data.kanban);

	// Delete state
	let showDeleteConfirm = $state(false);
	let deleting = $state(false);
	let deleteModuleCount = $derived(kanban.modules.length);
	let deleteTaskCount = $derived(
		kanban.modules.reduce((s: number, m: any) => s + (m.tasks?.length ?? 0), 0)
	);

	interface TaskSummary {
		id: string;
		shortId: number;
		title: string;
		status: string;
		moduleId: string;
	}

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

	let activeTab = $state<'kanban' | 'detail'>('kanban');
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

	const statusUpdateOptions = ['draft', 'in-progress', 'completed', 'archived'] as const;

	const statusLabelMap: Record<string, string> = {
		'draft': '草稿',
		'in-progress': '进行中',
		'completed': '已完成',
		'archived': '已归档'
	};
	const aiWarning = '⚠️ 该里程碑可能正在被 AI 开发，变更状态可能导致 AI 工作中断或数据丢失';

	let pendingStatus: string | null = $state(null);
	let showStatusConfirm = $state(false);
	let selectValue = $state(kanban.status);

	// Sync selectValue when kanban status changes
	$effect(() => {
		selectValue = kanban.status;
	});

	function handleStatusSelect(newStatus: string) {
		if (newStatus === kanban.status) return;
		pendingStatus = newStatus;
		showStatusConfirm = true;
	}

	async function handleStatusConfirm() {
		if (!pendingStatus) return;
		const status = pendingStatus;
		pendingStatus = null;
		showStatusConfirm = false;
		await updateStatus(status);
	}

	function handleStatusCancel() {
		pendingStatus = null;
		showStatusConfirm = false;
		selectValue = kanban.status;
	}

	async function updateStatus(newStatus: string) {
		try {
			const res = await fetch(`/api/milestones/${kanban.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus })
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			toast.show('状态已更新', 'success');
			await invalidateAll();
			goto('/');
		} catch {
			toast.show('更新状态失败', 'error');
		}
	}

	async function handleDeleteConfirm() {
		if (deleting) return;
		deleting = true;
		try {
			const res = await fetch(`/api/milestones/${kanban.id}`, { method: 'DELETE' });
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || `HTTP ${res.status}`);
			}
			toast.show('里程碑已删除', 'success');
			showDeleteConfirm = false;
			await invalidateAll();
			goto('/');
		} catch (err: any) {
			toast.show(`删除失败: ${err.message}`, 'error');
		} finally {
			deleting = false;
		}
	}

	function progressColor(percent: number): string {
		if (percent === 100) return 'bg-green-500';
		if (percent >= 60) return 'bg-blue-500';
		if (percent >= 30) return 'bg-yellow-500';
		return 'bg-gray-400';
	}
</script>

<svelte:head>
	<title>{kanban.title} — 里程碑管理</title>
</svelte:head>

<a href="/" class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors duration-150 mb-5 group">
	<svg class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
	</svg>
	返回列表
</a>

<div class="bg-white rounded-2xl border border-slate-200/80 p-6 mb-5 shadow-sm">
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-3">
				<h1 class="text-xl font-bold text-slate-900 truncate">{kanban.title}</h1>
				<StatusBadge status={kanban.status} size="md" />
			</div>
			<p class="text-xs text-slate-300 font-mono mt-1 tracking-tight">{kanban.id}</p>
			<div class="flex items-center gap-4 mt-2 text-sm text-slate-400">
				<span>📅 {new Date(kanban.createdAt).toLocaleDateString('zh-CN')}</span>
				{#if kanban.gitUrl}
					<a href={kanban.gitUrl} target="_blank" rel="noopener noreferrer"
					   class="text-indigo-500 hover:text-indigo-600 truncate max-w-[300px]">
						🔗 {kanban.gitUrl}
					</a>
				{/if}
			</div>
		</div>
			{#if kanban.status !== 'in-progress'}
			<button
				class="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
				onclick={() => (showDeleteConfirm = true)}
				aria-label="删除里程碑"
				title="删除里程碑"
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</button>
			{/if}

		<select class="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 transition-all"
			value={selectValue} onchange={(e) => handleStatusSelect(e.currentTarget.value)}>
			{#each statusUpdateOptions as opt}
				<option value={opt}>{opt}</option>
			{/each}
		</select>
	</div>

	{#if totalTasks > 0}
	<div class="mt-4">
		<div class="flex items-center justify-between text-sm mb-1.5">
			<span class="text-slate-600 font-medium">总体进度</span>
			<span class="text-slate-500 tabular-nums">{doneTasks}/{totalTasks} ({progressPercent}%)</span>
		</div>
		<div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
			<div class="h-full rounded-full transition-all duration-500 {progressColor(progressPercent)}" style="width: {progressPercent}%"></div>
		</div>
	</div>
	{/if}

	{#if totalTasks > 0}
	<div class="flex items-center gap-5 mt-3 text-xs text-slate-400">
		<span>📦 模块 {completedModules}/{totalModules}</span>
		<span>📋 任务 {doneTasks}/{totalTasks}</span>
		{#if inProgressCount > 0}
			<span class="text-indigo-500">🔄 进行中 {inProgressCount}</span>
		{/if}
		{#if zombieCount > 0}
			<span class="text-amber-500">⚠️ 僵尸 {zombieCount}</span>
		{/if}
	</div>
	{/if}
</div>

<div class="flex items-center gap-1 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
	<button class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
		{activeTab === 'kanban' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}"
		onclick={() => (activeTab = 'kanban')}>
		<span class="mr-1.5">📊</span>看板
	</button>
	<button class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
		{activeTab === 'detail' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}"
		onclick={() => (activeTab = 'detail')}>
		<span class="mr-1.5">📋</span>详情
	</button>
</div>

{#if activeTab === 'kanban'}
	<div class="flex items-center gap-2 mb-4">
		{#each statusOptions as opt}
			<button class="px-3 py-1 text-xs rounded-full border transition-all duration-200
				{statusFilter === opt.value
					? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium shadow-sm'
					: 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}"
				onclick={() => (statusFilter = opt.value)}>
				{opt.label}
			</button>
		{/each}
	</div>

	<div class="space-y-3">
		{#if filteredModules.length > 0}
			{#each filteredModules as module (module.id)}
				<KanbanModuleCard module={module} {taskMap} />
			{/each}
		{:else}
			<div class="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
				<div class="text-3xl mb-3">📊</div>
				<p class="text-sm text-slate-400">
					{statusFilter === 'all' ? '暂无模块' : "没有「{statusOptions.find(o => o.value === statusFilter)?.label}」状态的任务"}
				</p>
			</div>
		{/if}
	</div>
{/if}

{#if activeTab === 'detail'}
<div class="flex flex-col lg:flex-row gap-5 items-start">
	<!-- Left column: MdViewer + module overview -->
	<div class="w-full lg:w-[60%] min-w-0 space-y-5">
		{#if kanban.sourceMd}
		<div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
			<div class="h-[70vh]">
				<MdViewer sourceMd={kanban.sourceMd} />
			</div>
		</div>
		{:else}
		<div class="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm text-center">
			<div class="text-3xl mb-3">📄</div>
			<p class="text-sm text-slate-400">暂无来源文档</p>
		</div>
		{/if}

		{#if kanban.modules.length > 0}
		<div class="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
			<h2 class="text-sm font-semibold text-slate-700 mb-4">📦 模块概览 ({kanban.modules.length})</h2>
			<div class="space-y-3">
				{#each kanban.modules as module (module.id)}
					<div class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
						<StatusBadge status={module.status} size="sm" />
						<span class="text-sm text-slate-700 font-medium flex-1 truncate">{module.name}</span>
						{#if module.totalTasks > 0}
							<div class="flex items-center gap-2 flex-shrink-0">
								<div class="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
									<div class="h-full rounded-full transition-all {progressColor(module.progressPercent || 0)}"
										style="width: {module.progressPercent || 0}%"></div>
								</div>
								<span class="text-xs text-slate-400 tabular-nums w-12 text-right">{module.doneTasks}/{module.totalTasks}</span>
							</div>
						{:else}
							<span class="text-xs text-slate-300">无任务</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
		{:else}
		<div class="bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-sm">
			<div class="text-3xl mb-3">📦</div>
			<p class="text-sm text-slate-500">暂无模块</p>
			<p class="text-xs text-slate-400 mt-1">后续可通过分解功能添加模块和任务</p>
		</div>
		{/if}
	</div>

	<!-- Right column: AI decompose area -->
	<div class="w-full lg:w-[40%] min-w-0">
		<div class="lg:sticky lg:top-5">
			<DecomposeStream milestoneId={kanban.id} sourceMd={kanban.sourceMd} status={kanban.status} />

			{#if kanban.status === 'draft' && hasPendingModules(kanban.id)}
			<div class="mt-4">
				<a href="/milestones/{kanban.id}/preview"
				   class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl
					border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50
					transition-all duration-200">
					<span>📋</span>继续编辑分解结果
				</a>
			</div>
			{/if}
		</div>
	</div>
</div>
{/if}

<TaskContextMenu />
<TaskEditModal />

{#if showStatusConfirm && pendingStatus}
	<ConfirmDialog
		open={showStatusConfirm}
		title="确认状态变更"
		message="将状态从「{statusLabelMap[kanban.status] || kanban.status}」改为「{statusLabelMap[pendingStatus] || pendingStatus}」"
		confirmText="确认变更"
		cancelText="取消"
		warning={kanban.status === 'in-progress' && pendingStatus !== 'in-progress' ? aiWarning : undefined}
		onconfirm={handleStatusConfirm}
		oncancel={handleStatusCancel}
	/>
{/if}


<!-- Delete confirmation dialog -->
{#if kanban}
	<ConfirmDialog
		open={showDeleteConfirm}
		title="删除里程碑"
		message="将删除 {deleteModuleCount} 个模块、{deleteTaskCount} 个任务。此操作不可撤销。"
		confirmText={deleting ? '删除中…' : '确认删除'}
		cancelText="取消"
		variant="danger"
		onconfirm={handleDeleteConfirm}
		oncancel={() => (showDeleteConfirm = false)}
	/>
{/if}
