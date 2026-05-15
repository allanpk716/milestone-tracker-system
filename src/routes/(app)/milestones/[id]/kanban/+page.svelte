<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	const { data } = $props();
	// Redirect to parent milestone page (which now has tabs with kanban as default)
	$effect(() => {
		goto(`/milestones/${page.params.id}`, { replaceState: true });
	});
</script>

<div class="flex items-center justify-center py-24">
	<div class="flex items-center gap-2 text-sm text-slate-400">
		<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
		</svg>
		正在跳转到看板视图…
	</div>
</div>
