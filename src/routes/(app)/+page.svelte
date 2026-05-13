<script lang="ts">
	import { toast } from '$lib/stores/toast.svelte.js';
	import MilestoneCard from '$lib/components/MilestoneCard.svelte';

	interface Milestone {
		id: string;
		title: string;
		sourceMd: string | null;
		gitUrl: string | null;
		status: string;
		createdAt: string;
	}

	let { data } = $props();
	let milestones = $derived(data.milestones ?? []);
	let loading = $state(false);
	let error = $state('');

	async function loadMilestones() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/milestones');
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			milestones = await res.json();
		} catch (e: any) {
			error = '加载里程碑列表失败';
			toast.show(error, 'error');
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>里程碑列表 — 里程碑管理系统</title>
</svelte:head>

<div class="flex items-center justify-between mb-6">
	<div>
		<h1 class="text-xl font-bold text-gray-900">里程碑列表</h1>
		<p class="text-sm text-gray-500 mt-0.5">共 {milestones.length} 个里程碑</p>
	</div>
	<a
		href="/milestones/create"
		class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md
		       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
	>
		+ 新建里程碑
	</a>
</div>

{#if error}
	<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
		{error}
	</div>
{/if}

{#if loading}
	<div class="flex items-center justify-center py-16">
		<div class="text-gray-400 text-sm">加载中…</div>
	</div>
{:else if milestones.length === 0}
	<div class="flex flex-col items-center justify-center py-20 text-center">
		<div class="text-4xl mb-4">📋</div>
		<h2 class="text-lg font-medium text-gray-700 mb-1">暂无里程碑</h2>
		<p class="text-sm text-gray-400 mb-4">创建第一个里程碑开始追踪进度</p>
		<a
			href="/milestones/create"
			class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md
			       hover:bg-blue-700 transition-colors"
		>
			+ 新建里程碑
		</a>
	</div>
{:else}
	<div class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
		{#each milestones as milestone (milestone.id)}
			<MilestoneCard {milestone} />
		{/each}
	</div>
{/if}
