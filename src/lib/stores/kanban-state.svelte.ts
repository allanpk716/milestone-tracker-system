// Shared reactive state for kanban page: context menu + edit modal

export interface TaskRef {
	id: string;
	shortId: number;
	title: string;
	description: string | null;
	status: string;
	assignee: string | null;
	moduleId: string;
}

// ── Context Menu State ──────────────────────────────────────────────────────

let contextMenuTask = $state<TaskRef | null>(null);
let contextMenuVisible = $state(false);
let contextMenuX = $state(0);
let contextMenuY = $state(0);

export function openContextMenu(task: TaskRef, x: number, y: number) {
	contextMenuTask = task;
	contextMenuX = x;
	contextMenuY = y;
	contextMenuVisible = true;
}

export function closeContextMenu() {
	contextMenuVisible = false;
	contextMenuTask = null;
}

export function getContextMenu() {
	return {
		get task() { return contextMenuTask; },
		get visible() { return contextMenuVisible; },
		get x() { return contextMenuX; },
		get y() { return contextMenuY; }
	};
}

// ── Edit Modal State ────────────────────────────────────────────────────────

let editModalTask = $state<TaskRef | null>(null);
let editModalVisible = $state(false);

export function openEditModal(task: TaskRef) {
	editModalTask = task;
	editModalVisible = true;
	closeContextMenu();
}

export function closeEditModal() {
	editModalVisible = false;
	editModalTask = null;
}

export function getEditModal() {
	return {
		get task() { return editModalTask; },
		get visible() { return editModalVisible; }
	};
}
