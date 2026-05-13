<script lang="ts">
	import StatusBadge from './StatusBadge.svelte';
	import KanbanTaskCard from './KanbanTaskCard.svelte';

	interface Task {
		id: string;
		shortId: number;
		moduleId: string;
		title: string;
		description: string | null;
		references: string | null;
		status: string;
		assignee: string | null;
		subTotal: number;
		subDone: number;
		progressMessage: string | null;
		commitHash: string | null;
		createdAt: string;
		updatedAt: string;
		reportedAt: string | null;
		isZombie: boolean;
	}

	interface ModuleData {
		id: string;
		milestoneId: string;
		name: string;
		description: string | null;
		status: string;
		sortOrder: number;
		tasks: Task[];
		totalTasks: number;
		doneTasks: number;
		progressPercent: number;
		assignees: string[];
	}

	interface TaskSummary {
		id: string;
		shortId: number;
		title: string;
		status: string;
		moduleId: string;
	}

	interface Props {
		module: ModuleData;
		taskMap: Map<number, TaskSummary>;
	}

	let { module, taskMap }: Props = $props();

	let expanded = $state(false);

	let subDoneTotal = $derived(module.tasks.reduce((s, t) => s + t.subDone, 0));
	let subTotalCount = $derived(module.tasks.reduce((s, t) => s + t.subTotal, 0));

	function progressColor(percent: number): string {
		if (percent === 100) return 'bg-green-500';
		if (percent >= 60) return 'bg-blue-500';
		if (percent >= 30) return 'bg-yellow-500';
		return 'bg-gray-400';
	}
</script>

<div class="border border-gray-200 rounded-lg overflow-hidden">
	<!-- Collapsible header -->
	<button
		class="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
		onclick={() => (expanded = !expanded)}
		aria-expanded={expanded}
	>
		<span class="text-xs transition-transform duration-200 {expanded ? 'rotate-90' : ''}">▶</span>

		<!-- Module name + status -->
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2">
				<span class="text-sm font-semibold text-gray-800 truncate">{module.name}</span>
				<StatusBadge status={module.status} size="sm" />
			</div>
		</div>

		<!-- Stats cluster -->
		<div class="flex items-center gap-4 flex-shrink-0 text-xs text-gray-500">
			<!-- Progress bar + percentage -->
			{#if module.totalTasks > 0}
				<div class="flex items-center gap-2">
					<div class="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
						<div
							class="h-full rounded-full transition-all {progressColor(module.progressPercent)}"
							style="width: {module.progressPercent}%"
						></div>
					</div>
					<span class="font-mono w-10 text-right">{module.progressPercent}%</span>
				</div>
			{:else}
				<span class="text-gray-400">无任务</span>
			{/if}

			<!-- Sub-milestone counts -->
			{#if subTotalCount > 0}
				<span class="text-gray-400" title="子里程碑进度">
					📊 {subDoneTotal}/{subTotalCount}
				</span>
			{/if}

			<!-- Agent names -->
			{#if module.assignees.length > 0}
				<span class="flex items-center gap-1" title={module.assignees.join(', ')}>
					{#each module.assignees.slice(0, 3) as agent}
						<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium" title={agent}>
							{agent.charAt(0).toUpperCase()}
						</span>
					{/each}
					{#if module.assignees.length > 3}
						<span class="text-gray-400">+{module.assignees.length - 3}</span>
					{/if}
				</span>
			{/if}

			<!-- Task count -->
			<span class="text-gray-400">{module.doneTasks}/{module.totalTasks}</span>
		</div>
	</button>

	<!-- Expanded task cards -->
	{#if expanded}
		<div class="p-3 space-y-2 bg-white">
			{#each module.tasks as task (task.id)}
				<KanbanTaskCard {task} {taskMap} />
			{/each}
			{#if module.tasks.length === 0}
				<p class="text-sm text-gray-400 text-center py-4">暂无任务</p>
			{/if}
		</div>
	{/if}
</div>
