<script lang="ts">
	import { tick } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/stores/toast.svelte.js';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import MilestoneSlidePanel from '$lib/components/MilestoneSlidePanel.svelte';

	interface Milestone {
		id: string;
		title: string;
		sourceMd: string | null;
		gitUrl: string | null;
		status: string;
		createdAt: string;
	}

	const statusColors: Record<string, string> = {
		draft: 'bg-slate-400',
		'in-progress': 'bg-indigo-500',
		completed: 'bg-emerald-500',
		blocked: 'bg-rose-500',
		review: 'bg-amber-500',
		done: 'bg-emerald-500',
		archived: 'bg-slate-300',
		todo: 'bg-slate-400',
		skipped: 'bg-slate-300',
	};

	type StatusGroup = { status: string; label: string; count: number; color: string; dot: string };

	let { data } = $props();
	let milestones = $derived(data.milestones ?? []);
	let loading = $state(false);
	let error = $state('');
	let activeFilter = $state<string | null>(null);

	// Slide panel state
	let selectedMilestoneId = $state<string | null>(null);



	// Open panel when landing on /milestones/[id] from a direct URL
	$effect(() => {
		const path = page.url.pathname;
		const match = path.match(/^\/milestones\/([^/]+)$/);
		if (match) {
			selectedMilestoneId = match[1];
		}
	});

	function openPanel(milestoneId: string, e?: MouseEvent) {
		if (e) {
			if (e.button !== 0 || e.ctrlKey || e.metaKey) return;
			e.preventDefault();
		}
		selectedMilestoneId = milestoneId;
		history.pushState({}, '', `/milestones/${milestoneId}`);
	}

	function closePanel() {
		selectedMilestoneId = null;
		// Restore URL to list
		history.pushState({}, '', '/');
	}

	async function handleMilestoneDeleted() {
		selectedMilestoneId = null;
		history.pushState({}, '', '/');
		await invalidateAll();
	}

	// Handle browser back/forward
	$effect(() => {
		if (!browser) return;
		const handler = () => {
			const path = window.location.pathname;
			const match = path.match(/^\/milestones\/([^/]+)$/);
			selectedMilestoneId = match ? match[1] : null;
		};
		window.addEventListener('popstate', handler);
		return () => window.removeEventListener('popstate', handler);
	});

	let statusGroups = $derived.by(() => {
		const defs: Record<string, { label: string; color: string; dot: string }> = {
			'in-progress': { label: '进行中', color: 'bg-indigo-50 text-indigo-700 ring-indigo-200', dot: 'bg-indigo-500' },
			draft: { label: '草稿', color: 'bg-slate-50 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
			completed: { label: '已完成', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
			blocked: { label: '阻塞', color: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
			review: { label: '审核中', color: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
		};
		const counts: Record<string, number> = {};
		for (const m of milestones) {
			counts[m.status] = (counts[m.status] || 0) + 1;
		}
		return Object.entries(defs)
			.filter(([status]) => counts[status])
			.map(([status, cfg]) => ({
				status,
				label: cfg.label,
				count: counts[status],
				color: cfg.color,
				dot: cfg.dot,
			}));
	});

	let filteredMilestones = $derived(
		activeFilter ? milestones.filter(m => m.status === activeFilter) : milestones
	);

	function toggleFilter(status: string) {
		activeFilter = activeFilter === status ? null : status;
	}
</script>

<svelte:head>
	<title>里程碑列表 — 里程碑管理系统</title>
</svelte:head>

<div class="flex items-end justify-between mb-8">
	<div>
		<h1 class="text-2xl font-bold text-slate-900 tracking-tight">里程碑</h1>
		<p class="text-sm text-slate-400 mt-1 font-medium tabular-nums">
			{#if activeFilter}
				筛选：{statusGroups.find(g => g.status === activeFilter)?.label} · {filteredMilestones.length} / {milestones.length}
			{:else}
				共 {milestones.length} 个
			{/if}
		</p>
	</div>
	<a
		href="/milestones/create"
		class="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl
		       shadow-sm shadow-indigo-200 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-200
		       focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-2
		       active:scale-[0.97] transition-all duration-200"
	>
		<span class="text-sm leading-none">+</span>
		新建里程碑
	</a>
</div>

{#if error}
	<div class="bg-rose-50 border border-rose-200/60 text-rose-700 px-4 py-3 rounded-xl text-sm mb-6">
		{error}
	</div>
{/if}

{#if milestones.length === 0}
	<div class="flex flex-col items-center justify-center py-28 text-center">
		<div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
			<span class="text-3xl">📋</span>
		</div>
		<h2 class="text-lg font-semibold text-slate-700 mb-1">暂无里程碑</h2>
		<p class="text-sm text-slate-400 mb-6">创建第一个里程碑开始追踪进度</p>
		<a href="/milestones/create"
			class="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl
			       shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.97] transition-all duration-200">
			<span class="text-sm leading-none">+</span>新建里程碑
		</a>
	</div>
{:else}
	<!-- Filter bar -->
	<div class="flex items-center gap-2 mb-6 flex-wrap">
		<button
			class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
			       {!activeFilter ? 'bg-slate-800 text-white ring-1 ring-slate-800 shadow-sm' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300'}"
			onclick={() => (activeFilter = null)}>
			全部
			<span class="tabular-nums {activeFilter ? 'text-slate-400' : 'text-slate-300'}">{milestones.length}</span>
		</button>
		{#each statusGroups as group}
			<button
				class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
				       {activeFilter === group.status ? 'ring-2 shadow-sm ' + group.color + ' ring-current' : group.color + ' ring-1 hover:shadow-sm'}"
				onclick={() => toggleFilter(group.status)}>
				<span class="w-1.5 h-1.5 rounded-full {group.dot}"></span>
				{group.label}
				<span class="tabular-nums font-semibold">{group.count}</span>
			</button>
		{/each}
	</div>

	<!-- Milestone grid -->
	<div class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
		{#each filteredMilestones as milestone, i (milestone.id)}
			<div class="animate-in" style="--delay: {Math.min(i * 60, 400)}ms">
				<a
					href="/milestones/{milestone.id}"
					class="group relative block bg-white rounded-2xl border border-slate-200/80 overflow-hidden
					       hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300/80
					       active:scale-[0.98] transition-all duration-200"
					onclick={(e) => openPanel(milestone.id, e)}
				>
					<div class="absolute left-0 top-0 bottom-0 w-[3px] {statusColors[milestone.status] || 'bg-slate-400'} rounded-l-2xl
					            opacity-60 group-hover:opacity-100 transition-opacity duration-200"></div>
					<div class="p-5 pl-6">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<h3 class="text-[15px] font-semibold text-slate-800 group-hover:text-indigo-600 truncate transition-colors duration-200">
									{milestone.title}
								</h3>
								<p class="text-[11px] text-slate-300 mt-1 font-mono tracking-tight">{milestone.id}</p>
							</div>
							<StatusBadge status={milestone.status} />
						</div>
						<div class="mt-3.5 flex items-center gap-4 text-xs text-slate-400">
							<span class="inline-flex items-center gap-1">
								<svg class="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
								</svg>
								{new Date(milestone.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
							</span>
							{#if milestone.gitUrl}
								<span class="truncate max-w-[180px] inline-flex items-center gap-1" title={milestone.gitUrl}>
									<svg class="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.28" />
									</svg>
									{new URL(milestone.gitUrl).hostname}
								</span>
							{/if}
						</div>
						{#if milestone.sourceMd}
							<p class="mt-3 text-xs text-slate-400 leading-relaxed line-clamp-2">
								{milestone.sourceMd.slice(0, 120)}
							</p>
						{/if}
					</div>
				</a>
			</div>
		{/each}
	</div>
{/if}

<!-- Slide panel -->
<MilestoneSlidePanel milestoneId={selectedMilestoneId} onclose={closePanel} ondeleted={handleMilestoneDeleted} />

<style>
	.animate-in {
		animation: fadeSlideIn 0.4s cubic-bezier(0.2, 0, 0, 1) both;
		animation-delay: var(--delay, 0ms);
	}
	@keyframes fadeSlideIn {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
