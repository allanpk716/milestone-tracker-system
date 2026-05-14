<script lang="ts">
	interface Props {
		status: string;
		size?: 'sm' | 'md';
	}

	let { status, size = 'sm' }: Props = $props();

	const colorMap: Record<string, string> = {
		draft: 'bg-slate-100 text-slate-600 ring-slate-200',
		'in-progress': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
		completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		archived: 'bg-slate-100 text-slate-500 ring-slate-200',
		todo: 'bg-slate-100 text-slate-500 ring-slate-200',
		blocked: 'bg-rose-50 text-rose-700 ring-rose-200',
		review: 'bg-amber-50 text-amber-700 ring-amber-200',
		done: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		skipped: 'bg-slate-100 text-slate-400 ring-slate-200'
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

	let colorClass = $derived(colorMap[status] || 'bg-slate-100 text-slate-600 ring-slate-200');
	let label = $derived(labelMap[status] || status);
	let sizeClass = $derived(
		size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
	);
</script>

<span class="inline-flex items-center rounded-full font-medium ring-1 {colorClass} {sizeClass}">
	{label}
</span>
