// Simple toast notification system
// Usage in any component: import { toast } from '$lib/stores/toast'; toast.show('message', 'success');

interface ToastItem {
	id: number;
	message: string;
	type: 'success' | 'error' | 'info';
}

let toasts = $state<ToastItem[]>([]);
let nextId = $state(0);

function show(message: string, type: ToastItem['type'] = 'info', duration = 4000) {
	const id = nextId++;
	toasts.push({ id, message, type });
	setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
	}, duration);
}

export function getToasts() {
	return toasts;
}

export const toast = { show };
