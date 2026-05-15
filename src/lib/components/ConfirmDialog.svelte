<script lang="ts">
	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'default' | 'danger';
		warning?: string | undefined;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open,
		title,
		message,
		confirmText = '确认',
		cancelText = '取消',
		variant = 'default',
		warning,
		onconfirm,
		oncancel
	}: Props = $props();

	function onKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') oncancel();
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) oncancel();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
		onclick={onBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-label={title}
	>
		<div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
			<!-- Header -->
			<div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">{title}</h2>
				<button
					class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
					onclick={oncancel}
					aria-label="关闭"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Body -->
			<div class="px-6 py-4 space-y-3">
				<p class="text-sm text-gray-700">{message}</p>
				{#if warning}
					<div class="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
						<span class="text-amber-600 text-base leading-5">⚠️</span>
						<p class="text-sm text-amber-800">{warning}</p>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
				<button
					type="button"
					class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
					onclick={oncancel}
				>
					{cancelText}
				</button>
				<button
					type="button"
					class="px-4 py-2 text-sm text-white rounded-lg transition-colors
						{variant === 'danger'
							? 'bg-red-600 hover:bg-red-700'
							: 'bg-indigo-600 hover:bg-indigo-700'}"
					onclick={onconfirm}
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
