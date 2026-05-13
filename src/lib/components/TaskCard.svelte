<script lang="ts">
	import StatusBadge from './StatusBadge.svelte';

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

	interface Props {
		task: Task;
	}

	let { task }: Props = $props();

	let progressPercent = $derived(
		task.subTotal > 0 ? Math.round((task.subDone / task.subTotal) * 100) : 0
	);
</script>

<div class="flex items-start gap-3 py-2.5 px-3 rounded-md hover:bg-gray-50 transition-colors">
	<div class="flex-shrink-0 mt-0.5">
		<span class="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-100 text-xs font-mono text-gray-600">
			{task.shortId}
		</span>
	</div>

	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-2">
			<span class="text-sm text-gray-800 truncate">{task.title}</span>
			<StatusBadge status={task.status} size="sm" />
		</div>

		{#if task.assignee}
			<span class="text-xs text-gray-400">👤 {task.assignee}</span>
		{/if}

		{#if task.subTotal > 0}
			<div class="mt-1.5 flex items-center gap-2">
				<div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
					<div
						class="h-full rounded-full transition-all {progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}"
						style="width: {progressPercent}%"
					></div>
				</div>
				<span class="text-xs text-gray-400">{task.subDone}/{task.subTotal}</span>
			</div>
		{/if}

		{#if task.progressMessage}
			<p class="mt-1 text-xs text-gray-400 italic">{task.progressMessage}</p>
		{/if}
	</div>
</div>
