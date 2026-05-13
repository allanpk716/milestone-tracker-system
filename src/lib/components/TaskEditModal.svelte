<script lang="ts">
	import { getEditModal, closeEditModal } from '$lib/stores/kanban-state.svelte.js';
	import { toast } from '$lib/stores/toast.js';

	let modal = $derived(getEditModal());

	let title = $state('');
	let description = $state('');
	let assignee = $state('');
	let saving = $state(false);
	let errors = $state<Record<string, string>>({});

	// Populate form when modal opens
	$effect(() => {
		if (modal.visible && modal.task) {
			title = modal.task.title;
			description = modal.task.description ?? '';
			assignee = modal.task.assignee ?? '';
			errors = {};
		}
	});

	async function save() {
		if (!modal.task) return;
		errors = {};

		// Validate
		if (!title.trim()) {
			errors.title = '任务标题不能为空';
			return;
		}

		saving = true;
		try {
			const body: Record<string, unknown> = { title: title.trim() };
			if (description !== modal.task.description) {
				body.description = description.trim() || null;
			}
			if (assignee !== (modal.task.assignee ?? '')) {
				body.assignee = assignee.trim() || null;
			}

			const res = await fetch(`/api/tasks/${modal.task.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || `HTTP ${res.status}`);
			}
			toast.show(`任务 #${modal.task.shortId} 已更新`, 'success');
			closeEditModal();
			// Refresh data
			const { invalidateAll } = await import('$app/navigation');
			await invalidateAll();
		} catch (err: any) {
			toast.show(`保存失败: ${err.message}`, 'error');
		} finally {
			saving = false;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeEditModal();
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) closeEditModal();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if modal.visible && modal.task}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
		onclick={onBackdropClick}
	>
		<div class="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
			<!-- Header -->
			<div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">
					编辑任务 <span class="text-gray-400 font-mono">#{modal.task.shortId}</span>
				</h2>
				<button
					class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
					onclick={closeEditModal}
					aria-label="关闭"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Form -->
			<form onsubmit={(e) => { e.preventDefault(); save(); }} class="px-6 py-4 space-y-4">
				<!-- Title -->
				<div>
					<label for="edit-title" class="block text-sm font-medium text-gray-700 mb-1">
						任务标题 <span class="text-red-500">*</span>
					</label>
					<input
						id="edit-title"
						type="text"
						bind:value={title}
						class="w-full px-3 py-2 border rounded-lg text-sm
							{errors.title ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
							focus:outline-none focus:ring-2"
						maxlength={300}
					/>
					{#if errors.title}
						<p class="mt-1 text-xs text-red-600">{errors.title}</p>
					{/if}
				</div>

				<!-- Description -->
				<div>
					<label for="edit-desc" class="block text-sm font-medium text-gray-700 mb-1">
						任务描述
					</label>
					<textarea
						id="edit-desc"
						bind:value={description}
						rows={4}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
							focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
						placeholder="可选：输入任务描述…"
					></textarea>
				</div>

				<!-- Assignee -->
				<div>
					<label for="edit-assignee" class="block text-sm font-medium text-gray-700 mb-1">
						负责人
					</label>
					<input
						id="edit-assignee"
						type="text"
						bind:value={assignee}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
							focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="可选：输入负责人名称…"
						maxlength={100}
					/>
				</div>
			</form>

			<!-- Footer -->
			<div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
				<button
					type="button"
					class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
					onclick={closeEditModal}
				>
					取消
				</button>
				<button
					type="button"
					class="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors
						disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={save}
					disabled={saving}
				>
					{saving ? '保存中…' : '保存'}
				</button>
			</div>
		</div>
	</div>
{/if}
