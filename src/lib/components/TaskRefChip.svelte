<script lang="ts">
	/**
	 * TaskRefChip — renders task description with #N references expanded as
	 * clickable status chips. Requires a flat lookup map of shortId → task.
	 */

	interface TaskSummary {
		id: string;
		shortId: number;
		title: string;
		status: string;
		moduleId: string;
	}

	interface Props {
		description: string | null | undefined;
		taskMap: Map<number, TaskSummary>;
	}

	let { description, taskMap }: Props = $props();

	// Split description on #N patterns, preserving surrounding text
	let segments = $derived(parseRefs(description || ''));

	interface Segment {
		type: 'text' | 'ref';
		value: string;
		shortId?: number;
	}

	function parseRefs(text: string): Segment[] {
		const result: Segment[] = [];
		const regex = /#(\d+)/g;
		let lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(text)) !== null) {
			if (match.index > lastIndex) {
				result.push({ type: 'text', value: text.slice(lastIndex, match.index) });
			}
			result.push({ type: 'ref', value: match[0], shortId: parseInt(match[1], 10) });
			lastIndex = regex.lastIndex;
		}
		if (lastIndex < text.length) {
			result.push({ type: 'text', value: text.slice(lastIndex) });
		}
		return result;
	}

	const statusChipColors: Record<string, string> = {
		todo: 'bg-gray-100 text-gray-600 border-gray-200',
		'in-progress': 'bg-blue-50 text-blue-700 border-blue-200',
		blocked: 'bg-red-50 text-red-700 border-red-200',
		review: 'bg-purple-50 text-purple-700 border-purple-200',
		done: 'bg-green-50 text-green-700 border-green-200',
		skipped: 'bg-gray-50 text-gray-400 border-gray-200'
	};
</script>

{#each segments as seg}
	{#if seg.type === 'ref'}
		{#if taskMap.has(seg.shortId!)}
			{@const refTask = taskMap.get(seg.shortId!)!}
			<a
				href="/milestones/{refTask.moduleId.replace(/^MOD-/, 'MS-').split('-')[0]}/kanban"
				class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono border
					{statusChipColors[refTask.status] || 'bg-gray-50 text-gray-500 border-gray-200'}
					hover:opacity-80 transition-opacity no-underline"
				title="#{refTask.shortId} — {refTask.title} ({refTask.status})"
			>
				#{refTask.shortId}
				<span class="font-sans truncate max-w-[120px]">{refTask.title}</span>
			</a>
		{:else}
			<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-gray-50 text-gray-400 border border-gray-200">
				{seg.value}
			</span>
		{/if}
	{:else}
		<span>{seg.value}</span>
	{/if}
{/each}
