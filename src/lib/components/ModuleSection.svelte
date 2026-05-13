<script lang="ts">
	import StatusBadge from './StatusBadge.svelte';
	import TaskCard from './TaskCard.svelte';

	interface Task {
		id: string;
		shortId: number;
		moduleId: string;
		title: string;
		description: string | null;
		status: string;
		assignee: string | null;
		subTotal: number;
		subDone: number;
		progressMessage: string | null;
	}

	interface Module {
		id: string;
		milestoneId: string;
		name: string;
		description: string | null;
		status: string;
		sortOrder: number;
		tasks: Task[];
	}

	interface Props {
		module: Module;
	}

	let { module }: Props = $props();

	let doneCount = $derived(module.tasks.filter((t) => t.status === 'done').length);
	let totalCount = $derived(module.tasks.length);
	let progressPercent = $derived(
		totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
	);

	let collapsed = $state(false);
</script>

<div class="border border-gray-200 rounded-lg overflow-hidden">
	<!-- Module header -->
	<button
		class="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
		onclick={() => (collapsed = !collapsed)}
		aria-expanded={!collapsed}
	>
		<span class="text-sm transition-transform {collapsed ? '' : 'rotate-90'}">▶</span>
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2">
				<span class="text-sm font-semibold text-gray-800 truncate">{module.name}</span>
				<StatusBadge status={module.status} size="sm" />
			</div>
			{#if module.description}
				<p class="text-xs text-gray-400 mt-0.5 truncate">{module.description}</p>
			{/if}
		</div>
		<div class="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
			<span>{doneCount}/{totalCount}</span>
			{#if totalCount > 0}
				<div class="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
					<div
						class="h-full rounded-full {progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}"
						style="width: {progressPercent}%"
					></div>
				</div>
			{/if}
		</div>
	</button>

	<!-- Tasks -->
	{#if !collapsed}
		<div class="divide-y divide-gray-100">
			{#each module.tasks as task (task.id)}
				<TaskCard {task} />
			{/each}
			{#if module.tasks.length === 0}
				<p class="text-sm text-gray-400 px-3 py-4 text-center">暂无任务</p>
			{/if}
		</div>
	{/if}
</div>
