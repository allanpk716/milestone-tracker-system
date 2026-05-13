/**
 * Shared client-side state for decompose preview/edit flow.
 *
 * Stores pending decompose modules keyed by milestoneId so that
 * DecomposeStream → stores results → preview page reads them.
 *
 * Uses Svelte 5 runes for reactivity.
 */

import type { DecomposeModule } from '$lib/schemas/decompose.js';

// ── Types ────────────────────────────────────────────────────────────────────

/** Editable module with checked state for confirm selection. */
export interface EditableModule {
	name: string;
	description: string;
	checked: boolean;
	tasks: EditableTask[];
}

/** Editable task with checked state. */
export interface EditableTask {
	title: string;
	description: string;
	checked: boolean;
}

// ── State ────────────────────────────────────────────────────────────────────

const pendingMap = $state<Record<string, EditableModule[]>>({});

// ── Public API ───────────────────────────────────────────────────────────────

/** Store pending modules for a milestone. Converts DecomposeModule[] → EditableModule[]. */
export function setPendingModules(milestoneId: string, modules: DecomposeModule[]): void {
	pendingMap[milestoneId] = modules.map((m) => ({
		name: m.name,
		description: m.description ?? '',
		checked: true,
		tasks: m.tasks.map((t) => ({
			title: t.title,
			description: t.description ?? '',
			checked: true
		}))
	}));
}

/** Get pending modules for a milestone (or null if none stored). */
export function getPendingModules(milestoneId: string): EditableModule[] | null {
	return pendingMap[milestoneId] ?? null;
}

/** Clear pending modules for a milestone (e.g. after confirm). */
export function clearPendingModules(milestoneId: string): void {
	delete pendingMap[milestoneId];
}

/** Check whether a milestone has pending modules in the store. */
export function hasPendingModules(milestoneId: string): boolean {
	return (pendingMap[milestoneId]?.length ?? 0) > 0;
}
