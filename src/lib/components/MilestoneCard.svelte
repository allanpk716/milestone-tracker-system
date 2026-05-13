<script lang="ts">
	import StatusBadge from './StatusBadge.svelte';

	interface Milestone {
		id: string;
		title: string;
		sourceMd: string | null;
		gitUrl: string | null;
		status: string;
		createdAt: string;
	}

	interface Props {
		milestone: Milestone;
	}

	let { milestone }: Props = $props();

	let formattedDate = $derived(
		new Date(milestone.createdAt).toLocaleDateString('zh-CN', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		})
	);
</script>

<a
	href="/milestones/{milestone.id}"
	class="block bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md hover:border-blue-200 transition-all group"
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<h3 class="text-base font-semibold text-gray-900 group-hover:text-blue-600 truncate">
				{milestone.title}
			</h3>
			<p class="text-xs text-gray-400 mt-1 font-mono">{milestone.id}</p>
		</div>
		<StatusBadge status={milestone.status} />
	</div>

	<div class="mt-3 flex items-center gap-4 text-xs text-gray-500">
		<span>📅 {formattedDate}</span>
		{#if milestone.gitUrl}
			<span class="truncate max-w-[200px]" title={milestone.gitUrl}>
				🔗 {new URL(milestone.gitUrl).hostname}
			</span>
		{/if}
	</div>

	{#if milestone.sourceMd}
		<p class="mt-2 text-xs text-gray-400 line-clamp-2">
			{milestone.sourceMd.slice(0, 120)}
		</p>
	{/if}
</a>
