<script lang="ts">
	import { getToasts } from '$lib/stores/toast.js';

	let toasts = $derived(getToasts());

	const iconMap = {
		success: '✓',
		error: '✕',
		info: 'ℹ'
	};

	const colorMap = {
		success: 'bg-green-50 border-green-300 text-green-800',
		error: 'bg-red-50 border-red-300 text-red-800',
		info: 'bg-blue-50 border-blue-300 text-blue-800'
	};
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm" aria-live="polite">
	{#each toasts as toast (toast.id)}
		<div
			class="flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg text-sm
			       animate-[slideIn_0.2s_ease-out] {colorMap[toast.type]}"
			role="alert"
		>
			<span class="text-base font-bold">{iconMap[toast.type]}</span>
			<span>{toast.message}</span>
		</div>
	{/each}
</div>

<style>
	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(100%);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
</style>
