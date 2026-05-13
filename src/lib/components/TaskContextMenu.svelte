<script lang="ts">
	import {
		getContextMenu,
		closeContextMenu,
		openEditModal
	} from '$lib/stores/kanban-state.svelte.js';
	import { toast } from '$lib/stores/toast.svelte.js';

	type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'review' | 'done' | 'skipped';

	const statusLabels: Record<string, string> = {
		todo: '待办',
		'in-progress': '进行中',
		blocked: '阻塞',
		review: '审核中',
		done: '已完成',
		skipped: '已跳过'
	};

	interface MenuItem {
		icon: string;
		label: string;
		action: () => void;
		enabledFor: TaskStatus[];
		separator?: boolean;
	}

	let menu = $derived(getContextMenu());

	let menuItems = $derived<MenuItem[]>([
		{
			icon: '✅',
			label: 'UAT 通过',
			action: () => doAdminAction('done', 'UAT 通过'),
			enabledFor: ['review']
		},
		{
			icon: '❌',
			label: 'UAT 不通过',
			action: () => doAdminAction('in-progress', 'UAT 不通过'),
			enabledFor: ['review']
		},
		{
			icon: '🔀',
			label: '确认合并',
			action: () => doAdminAction('done', '确认合并'),
			enabledFor: ['review'],
			separator: true
		},
		{
			icon: '🔓',
			label: '强制释放',
			action: () => doAdminAction(menu.task?.status ?? 'todo', '强制释放', null),
			enabledFor: ['todo', 'in-progress', 'blocked', 'review']
		},
		{
			icon: '🔄',
			label: '重新打开',
			action: () => doAdminAction('in-progress', '重新打开'),
			enabledFor: ['done', 'skipped']
		},
		{
			icon: '🚫',
			label: '取消',
			action: () => doAdminAction('skipped', '取消'),
			enabledFor: ['todo', 'in-progress', 'blocked', 'review'],
			separator: true
		},
		{
			icon: '⏸️',
			label: '暂停',
			action: () => doAdminAction('blocked', '暂停'),
			enabledFor: ['in-progress']
		},
		{
			icon: '▶️',
			label: '恢复',
			action: () => doAdminAction('in-progress', '恢复'),
			enabledFor: ['blocked']
		},
		{
			icon: '✏️',
			label: '编辑任务',
			action: () => {
				if (menu.task) openEditModal(menu.task);
			},
			enabledFor: ['todo', 'in-progress', 'blocked', 'review', 'done', 'skipped'],
			separator: true
		}
	]);

	function isItemEnabled(enabledFor: TaskStatus[]): boolean {
		if (!menu.task) return false;
		return enabledFor.includes(menu.task.status as TaskStatus);
	}

	async function doAdminAction(
		status: string,
		actionLabel: string,
		assignee?: string | null
	) {
		if (!menu.task) return;
		closeContextMenu();

		const body: Record<string, unknown> = { status };
		if (assignee !== undefined) body.assignee = assignee;

		try {
			const res = await fetch(`/api/tasks/${menu.task.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || `HTTP ${res.status}`);
			}
			toast.show(`任务 #${menu.task.shortId} ${actionLabel} — ${statusLabels[status] || status}`, 'success');
			invalidate();
		} catch (err: any) {
			toast.show(`操作失败: ${err.message}`, 'error');
		}
	}

	// Invalidate SvelteKit data to refresh the page
	async function invalidate() {
		const { invalidateAll } = await import('$app/navigation');
		await invalidateAll();
	}
</script>

{#if menu.visible && menu.task}
	<!-- Backdrop to close on outside click -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-40"
		onclick={closeContextMenu}
		oncontextmenu={(e) => e.preventDefault()}
	></div>

	<div
		class="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[180px]"
		style="left: {menu.x}px; top: {menu.y}px;"
		role="menu"
	>
		{#each menuItems as item, i}
			{#if item.separator && i > 0}
				<div class="border-t border-gray-100 my-1"></div>
			{/if}
			<button
				class="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2
					{isItemEnabled(item.enabledFor)
						? 'hover:bg-gray-50 text-gray-700 cursor-pointer'
						: 'text-gray-300 cursor-default'}"
				onclick={isItemEnabled(item.enabledFor) ? item.action : undefined}
				role="menuitem"
				aria-disabled={!isItemEnabled(item.enabledFor)}
			>
				<span>{item.icon}</span> {item.label}
			</button>
		{/each}
	</div>
{/if}
