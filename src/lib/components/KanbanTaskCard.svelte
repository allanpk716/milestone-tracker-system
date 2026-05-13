<script lang="ts">
	import StatusBadge from './StatusBadge.svelte';
	import TaskRefChip from './TaskRefChip.svelte';
	import { openContextMenu } from '$lib/stores/kanban-state.svelte.js';

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

	interface TaskSummary {
		id: string;
		shortId: number;
		title: string;
		status: string;
		moduleId: string;
	}

	interface Props {
		task: Task;
		taskMap: Map<number, TaskSummary>;
	}

	let { task, taskMap }: Props = $props();

	let progressPercent = $derived(
		task.subTotal > 0 ? Math.round((task.subDone / task.subTotal) * 100) : 0
	);

	function onContextmenu(e: MouseEvent) {
		e.preventDefault();
		openContextMenu(task, e.clientX, e.clientY);
	}

	function zombieTimeAgo(): string {
		if (!task.isZombie) return '';
		const diff = Date.now() - new Date(task.updatedAt).getTime();
		const hours = Math.floor(diff / (1000 * 60 * 60));
		if (hours < 48) return `${hours} 小时前`;
		const days = Math.floor(hours / 24);
		return `${days} 天前`;
	}
</script>

<div
	class="relative rounded-lg border bg-white transition-all hover:shadow-sm
		{task.isZombie ? 'border-l-4 border-l-amber-500 border-t-amber-200 border-r-amber-200 border-b-amber-200' : 'border-gray-200'}"
	oncontextmenu={onContextmenu}
>
	<!-- Zombie warning strip -->
	{#if task.isZombie}
		<div class="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded-t-lg">
			<span>⚠️</span>
			<span>僵尸任务 — 最后更新于 {zombieTimeAgo()}</span>
		</div>
	{/if}

	<div class="p-3 space-y-2">
		<!-- Header row -->
		<div class="flex items-start gap-2">
			<span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-gray-100 text-xs font-mono text-gray-600 flex-shrink-0">
				#{task.shortId}
			</span>
			<span class="text-sm font-medium text-gray-800 flex-1 truncate">{task.title}</span>
			<StatusBadge status={task.status} size="sm" />
		</div>

		<!-- Assignee -->
		{#if task.assignee}
			<div class="flex items-center gap-1 text-xs text-gray-500">
				<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium">
					{task.assignee.charAt(0).toUpperCase()}
				</span>
				{task.assignee}
			</div>
		{/if}

		<!-- Progress bar -->
		{#if task.subTotal > 0}
			<div class="flex items-center gap-2">
				<div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
					<div
						class="h-full rounded-full transition-all {progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}"
						style="width: {progressPercent}%"
					></div>
				</div>
				<span class="text-xs text-gray-400 flex-shrink-0">{task.subDone}/{task.subTotal} ({progressPercent}%)</span>
			</div>
		{/if}

		<!-- Description with #N ref expansion -->
		{#if task.description}
			<div class="text-xs text-gray-600 leading-relaxed">
				<TaskRefChip description={task.description} {taskMap} />
			</div>
		{/if}

		<!-- References with #N ref expansion -->
		{#if task.references}
			<div class="text-xs text-gray-500 leading-relaxed">
				<TaskRefChip description={task.references} {taskMap} />
			</div>
		{/if}

		<!-- Progress message -->
		{#if task.progressMessage}
			<p class="text-xs text-gray-400 italic">{task.progressMessage}</p>
		{/if}
	</div>
</div>
