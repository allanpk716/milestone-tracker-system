<script lang="ts">
	import StatusBadge from './StatusBadge.svelte';
	import KanbanModuleCard from './KanbanModuleCard.svelte';
	import TaskContextMenu from './TaskContextMenu.svelte';
	import TaskEditModal from './TaskEditModal.svelte';
	import { toast } from '$lib/stores/toast.svelte.js';

	interface Props {
		milestoneId: string | null;
		onclose: () => void;
	}

	let { milestoneId, onclose }: Props = $props();

	// Panel data
	let kanban: any = $state(null);
	let loading = $state(false);
	let error = $state('');

	// Tab state
	let activeTab = $state<'kanban' | 'detail'>('kanban');

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
		if (!kanban) return [];
		if (statusFilter === 'all') return kanban.modules;
		return kanban.modules.map((mod: any) => ({
			...mod,
			tasks: mod.tasks.filter((t: any) => t.status === statusFilter)
		})).filter((mod: any) => mod.tasks.length > 0);
	});

	// Task map
	interface TaskSummary { id: string; shortId: number; title: string; status: string; moduleId: string; }
	let taskMap: Map<number, TaskSummary> = $derived.by(() => {
		const map = new Map<number, TaskSummary>();
		if (!kanban) return map;
		for (const mod of kanban.modules) {
			for (const task of mod.tasks) {
				map.set(task.shortId, { id: task.id, shortId: task.shortId, title: task.title, status: task.status, moduleId: task.moduleId });
			}
		}
		return map;
	});

	// Stats
	let totalTasks = $derived(kanban ? kanban.modules.reduce((s: number, m: any) => s + m.totalTasks, 0) : 0);
	let doneTasks = $derived(kanban ? kanban.modules.reduce((s: number, m: any) => s + m.doneTasks, 0) : 0);
	let progressPercent = $derived(totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0);

	// Source preview
	let showFullSource = $state(false);
	let sourcePreview = $derived(
		kanban?.sourceMd ? kanban.sourceMd.slice(0, 300) + (kanban.sourceMd.length > 300 ? '…' : '') : null
	);

	// Fetch data when milestoneId changes
	$effect(() => {
		if (milestoneId) {
			activeTab = 'kanban';
			statusFilter = 'all';
			showFullSource = false;
			loadData(milestoneId);
		} else {
			kanban = null;
		}
	});

	async function loadData(id: string) {
		loading = true;
		error = '';
		try {
			const res = await fetch(`/api/milestones/${id}/modules`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			// Use kanban-style data
			const kanbanRes = await fetch(`/api/milestones/${id}`);
			if (!kanbanRes.ok) throw new Error(`HTTP ${kanbanRes.status}`);
			const msData = await kanbanRes.json();
			// We need kanban enriched data, let's compute it client-side from modules endpoint
			const modulesRes = await fetch(`/api/milestones/${id}/modules`);
			if (!modulesRes.ok) throw new Error(`HTTP ${modulesRes.status}`);
			const modulesData = await modulesRes.json();

			const now = Date.now();
			const enrichedModules = modulesData.map((mod: any) => {
				const tasksWithZombie = (mod.tasks || []).map((t: any) => ({
					...t,
					isZombie: t.status === 'in-progress' && (now - new Date(t.updatedAt).getTime()) > 3600000
				}));
				const total = tasksWithZombie.length;
				const done = tasksWithZombie.filter((t: any) => t.status === 'done').length;
				return {
					...mod,
					tasks: tasksWithZombie,
					totalTasks: total,
					doneTasks: done,
					progressPercent: total > 0 ? Math.round((done / total) * 100) : 0,
					assignees: [...new Set(tasksWithZombie.map((t: any) => t.assignee).filter(Boolean))]
				};
			});

			kanban = { ...msData, modules: enrichedModules };
		} catch {
			error = '加载数据失败';
			toast.show(error, 'error');
		} finally {
			loading = false;
		}
	}

	async function updateStatus(newStatus: string) {
		if (!kanban) return;
		try {
			const res = await fetch(`/api/milestones/${kanban.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus })
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			toast.show('状态已更新', 'success');
			loadData(kanban.id);
		} catch {
			toast.show('更新状态失败', 'error');
		}
	}

	function progressColor(p: number): string {
		if (p === 100) return 'bg-green-500';
		if (p >= 60) return 'bg-blue-500';
		if (p >= 30) return 'bg-yellow-500';
		return 'bg-gray-400';
	}

	const statusUpdateOptions = ['draft', 'in-progress', 'completed', 'archived'] as const;

	// Keyboard: Esc to close
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if milestoneId}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 animate-in"
		onclick={onclose}
	></div>

	<!-- Panel -->
	<aside class="fixed top-0 right-0 h-full w-[60%] max-w-[800px] bg-white shadow-2xl z-50 flex flex-col slide-in">
		<!-- Header -->
		<div class="flex items-center justify-between px-6 py-4 border-b border-slate-200/80">
			<div class="min-w-0 flex-1">
				{#if kanban}
					<div class="flex items-center gap-2.5">
						<h2 class="text-lg font-bold text-slate-900 truncate">{kanban.title}</h2>
						<StatusBadge status={kanban.status} size="sm" />
					</div>
					<p class="text-xs text-slate-300 font-mono mt-0.5">{kanban.id}</p>
				{:else if loading}
					<div class="h-5 w-40 bg-slate-100 rounded animate-pulse"></div>
				{/if}
			</div>
			<div class="flex items-center gap-2 flex-shrink-0">
				{#if kanban}
					<a href="/milestones/{kanban.id}" class="text-xs text-indigo-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
						全屏查看 →
					</a>
				{/if}
				<button
					class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
					onclick={onclose}
					aria-label="关闭面板"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto px-6 py-4">
			{#if loading}
				<div class="flex items-center justify-center py-16">
					<div class="flex items-center gap-2 text-slate-400 text-sm">
						<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
						</svg>
						加载中…
					</div>
				</div>
			{:else if error}
				<div class="py-16 text-center">
					<p class="text-sm text-rose-500">{error}</p>
					<button class="mt-2 text-xs text-indigo-500 hover:underline" onclick={() => milestoneId && loadData(milestoneId)}>重试</button>
				</div>
			{:else if kanban}
				<!-- Status + progress -->
				<div class="mb-4">
					<div class="flex items-center justify-between mb-3">
						<div class="flex items-center gap-2 text-sm text-slate-400">
							<span>📅 {new Date(kanban.createdAt).toLocaleDateString('zh-CN')}</span>
						</div>
						<select class="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
							value={kanban.status} onchange={(e) => updateStatus(e.currentTarget.value)}>
							{#each statusUpdateOptions as opt}
								<option value={opt}>{opt}</option>
							{/each}
						</select>
					</div>

					{#if totalTasks > 0}
					<div>
						<div class="flex items-center justify-between text-xs mb-1">
							<span class="text-slate-500">进度</span>
							<span class="text-slate-400 tabular-nums">{doneTasks}/{totalTasks} ({progressPercent}%)</span>
						</div>
						<div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
							<div class="h-full rounded-full transition-all duration-500 {progressColor(progressPercent)}" style="width: {progressPercent}%"></div>
						</div>
					</div>
					{/if}
				</div>

				<!-- Tab bar -->
				<div class="flex items-center gap-1 mb-4 bg-slate-100 rounded-lg p-0.5 w-fit">
					<button class="px-3 py-1.5 text-xs font-medium rounded-md transition-all
						{activeTab === 'kanban' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}"
						onclick={() => (activeTab = 'kanban')}>
						📊 看板
					</button>
					<button class="px-3 py-1.5 text-xs font-medium rounded-md transition-all
						{activeTab === 'detail' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}"
						onclick={() => (activeTab = 'detail')}>
						📋 详情
					</button>
				</div>

				<!-- Kanban tab -->
				{#if activeTab === 'kanban'}
					<div class="flex items-center gap-1.5 mb-3 flex-wrap">
						{#each statusOptions as opt}
							<button class="px-2.5 py-1 text-[11px] rounded-full border transition-all
								{statusFilter === opt.value
									? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
									: 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}"
								onclick={() => (statusFilter = opt.value)}>
								{opt.label}
							</button>
						{/each}
					</div>

					<div class="space-y-2">
						{#if filteredModules.length > 0}
							{#each filteredModules as module (module.id)}
								<KanbanModuleCard module={module} {taskMap} />
							{/each}
						{:else}
							<div class="py-8 text-center">
								<p class="text-sm text-slate-400">
									{statusFilter === 'all' ? '暂无模块' : "没有「{statusOptions.find(o => o.value === statusFilter)?.label}」状态的任务"}
								</p>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Detail tab -->
				{#if activeTab === 'detail'}
					{#if sourcePreview}
					<div class="bg-slate-50 rounded-xl p-4 mb-4">
						<div class="flex items-center justify-between mb-2">
							<h3 class="text-xs font-semibold text-slate-600">📄 来源文档</h3>
							{#if kanban.sourceMd && kanban.sourceMd.length > 300}
								<button class="text-[11px] text-indigo-500 hover:text-indigo-600"
									onclick={() => (showFullSource = !showFullSource)}>
									{showFullSource ? '收起' : '展开'}
								</button>
							{/if}
						</div>
						<pre class="text-xs text-slate-500 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-48 overflow-y-auto">
							{showFullSource ? kanban.sourceMd : sourcePreview}
						</pre>
					</div>
					{/if}

					{#if kanban.modules.length > 0}
					<div>
						<h3 class="text-xs font-semibold text-slate-600 mb-2">📦 模块 ({kanban.modules.length})</h3>
						<div class="space-y-1">
							{#each kanban.modules as module (module.id)}
								<div class="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 text-xs">
									<StatusBadge status={module.status} size="sm" />
									<span class="text-slate-700 font-medium flex-1 truncate">{module.name}</span>
									<span class="text-slate-400 tabular-nums">{module.doneTasks}/{module.totalTasks}</span>
								</div>
							{/each}
						</div>
					</div>
					{/if}
				{/if}
			{/if}
		</div>
	</aside>

	<!-- Global overlays for kanban card interactions -->
	<TaskContextMenu />
	<TaskEditModal />
{/if}

<style>
	.slide-in {
		animation: slideIn 0.3s cubic-bezier(0.2, 0, 0, 1) both;
	}
	.animate-in {
		animation: fadeIn 0.3s cubic-bezier(0.2, 0, 0, 1) both;
	}
	@keyframes slideIn {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
</style>
