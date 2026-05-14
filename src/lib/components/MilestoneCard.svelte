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

	let accentColor = $derived(statusColors[milestone.status] || 'bg-slate-400');

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
	class="group relative block bg-white rounded-2xl border border-slate-200/80 overflow-hidden
	       hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300/80
	       active:scale-[0.98] transition-all duration-200"
>
	<!-- Status accent bar -->
	<div class="absolute left-0 top-0 bottom-0 w-[3px] {accentColor} rounded-l-2xl
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
				{formattedDate}
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
