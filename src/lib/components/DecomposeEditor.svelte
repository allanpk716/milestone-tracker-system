<script lang="ts">
	import type { EditableModule, EditableTask } from '$lib/stores/decompose-state.svelte.js';

	// ── Props ─────────────────────────────────────────────────────────────────

	interface Props {
		modules: EditableModule[];
		onchange?: () => void;
	}

	let { modules = $bindable(), onchange }: Props = $props();

	// ── Helpers ───────────────────────────────────────────────────────────────

	/** Add a new empty module at the end. */
	function addModule() {
		modules.push({
			name: '',
			description: '',
			checked: true,
			tasks: []
		});
		onchange?.();
	}

	/** Remove a module by index. */
	function removeModule(index: number) {
		modules.splice(index, 1);
		onchange?.();
	}

	/** Add a new empty task to a module. */
	function addTask(modIndex: number) {
		modules[modIndex].tasks.push({
			title: '',
			description: '',
			checked: true
		});
		onchange?.();
	}

	/** Remove a task from a module. */
	function removeTask(modIndex: number, taskIndex: number) {
		modules[modIndex].tasks.splice(taskIndex, 1);
		onchange?.();
	}

	/** Start editing — called on focus or double-click. */
	function startEdit(input: HTMLInputElement | HTMLTextAreaElement) {
		input.readOnly = false;
		input.focus();
		input.select();
	}
</script>

<div class="h-full overflow-y-auto p-4 space-y-4">
	{#each modules as mod, modIndex}
		<div
			class="bg-white rounded-lg border {mod.checked ? 'border-gray-200' : 'border-gray-100 bg-gray-50'} shadow-sm transition-colors"
		>
			<!-- Module header -->
			<div class="p-4 pb-2">
				<div class="flex items-start gap-3">
					<!-- Module checkbox -->
					<input
						type="checkbox"
						checked={mod.checked}
						onchange={(e) => (mod.checked = e.currentTarget.checked)}
						class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
						aria-label="Toggle module: {mod.name || 'unnamed'}"
					/>

					<div class="flex-1 min-w-0">
						<!-- Module name -->
						<input
							type="text"
							value={mod.name}
							oninput={(e) => (mod.name = e.currentTarget.value)}
							placeholder="模块名称"
							class="block w-full text-sm font-semibold text-gray-800 bg-transparent border-b border-transparent
								hover:border-gray-200 focus:border-blue-400 focus:outline-none py-0.5 transition-colors
								placeholder:text-gray-300 {!mod.checked ? 'opacity-50' : ''}"
						/>

						<!-- Module description -->
						<textarea
							value={mod.description}
							oninput={(e) => (mod.description = e.currentTarget.value)}
							placeholder="模块描述（可选）"
							rows="1"
							class="block w-full text-xs text-gray-500 bg-transparent border-b border-transparent
								hover:border-gray-200 focus:border-blue-400 focus:outline-none py-0.5 mt-1 transition-colors
								resize-none placeholder:text-gray-300 {!mod.checked ? 'opacity-50' : ''}"
						></textarea>
					</div>

					<!-- Remove module -->
					<button
						class="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1"
						onclick={() => removeModule(modIndex)}
						aria-label="Remove module"
					>
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Tasks -->
			<div class="px-4 pb-3 pl-11">
				<div class="space-y-2">
					{#each mod.tasks as task, taskIndex}
						<div
							class="flex items-start gap-2 py-1.5 px-2 rounded-md
								{mod.checked && task.checked ? 'bg-gray-50' : 'bg-gray-50/50'}
								{!mod.checked || !task.checked ? 'opacity-50' : ''} transition-opacity"
						>
							<!-- Task checkbox -->
							<input
								type="checkbox"
								checked={task.checked && mod.checked}
								disabled={!mod.checked}
								onchange={(e) => (task.checked = e.currentTarget.checked)}
								class="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
								aria-label="Toggle task: {task.title || 'unnamed'}"
							/>

							<!-- Task content -->
							<div class="flex-1 min-w-0">
								<input
									type="text"
									value={task.title}
									oninput={(e) => (task.title = e.currentTarget.value)}
									placeholder="任务标题"
									class="block w-full text-xs font-medium text-gray-700 bg-transparent border-b border-transparent
										hover:border-gray-200 focus:border-blue-400 focus:outline-none py-0.5 transition-colors
										placeholder:text-gray-300"
								/>
								{#if task.description}
									<input
										type="text"
										value={task.description}
										oninput={(e) => (task.description = e.currentTarget.value)}
										placeholder="任务描述（可选）"
										class="block w-full text-xs text-gray-400 bg-transparent border-b border-transparent
											hover:border-gray-200 focus:border-blue-400 focus:outline-none py-0.5 transition-colors
											placeholder:text-gray-300 mt-0.5"
									/>
								{/if}
							</div>

							<!-- Remove task -->
							<button
								class="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors p-0.5"
								onclick={() => removeTask(modIndex, taskIndex)}
								aria-label="Remove task"
							>
								<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					{/each}
				</div>

				<!-- Add task button -->
				<button
					class="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800
						hover:bg-blue-50 rounded px-2 py-1 transition-colors"
					onclick={() => addTask(modIndex)}
				>
					<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
					</svg>
					添加任务
				</button>
			</div>
		</div>
	{/each}

	<!-- Add module button -->
	<button
		class="w-full flex items-center justify-center gap-2 py-3 text-sm text-blue-600 hover:text-blue-800
			hover:bg-blue-50 border-2 border-dashed border-gray-200 hover:border-blue-300 rounded-lg transition-colors"
		onclick={addModule}
	>
		<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
		</svg>
		添加模块
	</button>
</div>
