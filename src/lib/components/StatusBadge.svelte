<script lang="ts">
	interface Props {
		status: string;
		size?: 'sm' | 'md';
	}

	let { status, size = 'sm' }: Props = $props();

	const colorMap: Record<string, string> = {
		draft: 'bg-gray-100 text-gray-700',
		'in-progress': 'bg-blue-100 text-blue-700',
		completed: 'bg-green-100 text-green-700',
		archived: 'bg-yellow-100 text-yellow-700',
		todo: 'bg-gray-100 text-gray-600',
		blocked: 'bg-red-100 text-red-700',
		review: 'bg-purple-100 text-purple-700',
		done: 'bg-green-100 text-green-700',
		skipped: 'bg-gray-100 text-gray-400'
	};

	const labelMap: Record<string, string> = {
		draft: '草稿',
		'in-progress': '进行中',
		completed: '已完成',
		archived: '已归档',
		todo: '待办',
		blocked: '阻塞',
		review: '审核中',
		done: '已完成',
		skipped: '已跳过'
	};

	let colorClass = $derived(colorMap[status] || 'bg-gray-100 text-gray-600');
	let label = $derived(labelMap[status] || status);
	let sizeClass = $derived(
		size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
	);
</script>

<span class="inline-flex items-center rounded-full font-medium {colorClass} {sizeClass}">
	{label}
</span>
