<script lang="ts">
	import { postSseGeneric, type PostSseResult } from '$lib/client/sse-client.js';
	import type { DecomposeModule } from '$lib/schemas/decompose.js';
	import { setPendingModules } from '$lib/stores/decompose-state.svelte.js';
	import { toast } from '$lib/stores/toast.svelte.js';

	// ── Props ─────────────────────────────────────────────────────────────────

	interface Message {
		role: 'user' | 'assistant';
		content: string;
		modulesJson?: string | null;
	}

	interface Props {
		milestoneId: string;
		sourceMd: string | null;
		status: string;
		conversation?: {
			id: string;
			messages: Message[];
			systemPrompt?: string | null;
		} | null;
		onmodules?: (modules: DecomposeModule[]) => void;
	}

	let { milestoneId, sourceMd, status, conversation, onmodules }: Props = $props();

	// ── State ─────────────────────────────────────────────────────────────────

	let messages = $state<Message[]>(conversation?.messages ?? []);
	let inputText = $state('');
	let isStreaming = $state(false);
	let streamingText = $state('');
	let streamResult: PostSseResult | null = null;
	let referenceModules = $state<DecomposeModule[]>([]);
	let showPromptPanel = $state(false);
	let customPrompt = $state<string | null>(conversation?.systemPrompt ?? null);
	let defaultPrompt = $state<string>('');
	let promptEditText = $state('');

	// ── Computed ───────────────────────────────────────────────────────────────

	let hasConversation = $derived(messages.length > 0 || isStreaming);
	let canStart = $derived(status === 'draft' && !!sourceMd && !isStreaming);
	let canSend = $derived(hasConversation && !isStreaming && inputText.trim().length > 0);

	// ── Methods ────────────────────────────────────────────────────────────────

	async function startDecompose() {
		if (!canStart) return;
		isStreaming = true;
		streamingText = '';
		const extractedModules: DecomposeModule[] = [];

		streamResult = postSseGeneric(
			`/api/milestones/${milestoneId}/conversation`,
			customPrompt ? { customSystemPrompt: customPrompt } : {},
			{
				onEvent: (eventType, data) => {
					if (eventType === 'chunk' && (data as any).stage === 'text') {
						streamingText += (data as any).content;
					}
					if (eventType === 'chunk' && (data as any).stage === 'modules') {
						const mods = (data as any).modules as DecomposeModule[];
						extractedModules.push(...mods);
						onmodules?.(mods);
						setPendingModules(milestoneId, mods);
					}
				},
				onError: (stage, message) => {
					toast.error(`AI 拆解失败: ${message}`);
				},
				onDone: () => {
					if (streamingText) {
						messages = [
							...messages,
							{ role: 'assistant', content: streamingText, modulesJson: extractedModules.length > 0 ? JSON.stringify(extractedModules) : null }
						];
					}
					isStreaming = false;
					streamingText = '';
					streamResult = null;
				}
			}
		);
	}

	async function sendMessage() {
		if (!canSend || !inputText.trim()) return;

		const content = inputText.trim();
		const refs = referenceModules;
		let fullContent = content;
		if (refs.length > 0) {
			fullContent += `\n\n[引用的模块:\n${refs.map((m, i) => `${i + 1}. ${m.name}: ${m.description || '无描述'}`).join('\n')}]`;
			referenceModules = [];
		}

		messages = [...messages, { role: 'user', content }];
		inputText = '';
		isStreaming = true;
		streamingText = '';
		const extractedModules: DecomposeModule[] = [];

		streamResult = postSseGeneric(
			`/api/milestones/${milestoneId}/conversation/messages`,
			{
				content,
				referenceModules: refs.length > 0 ? refs : undefined
			},
			{
				onEvent: (eventType, data) => {
					if (eventType === 'chunk' && (data as any).stage === 'text') {
						streamingText += (data as any).content;
					}
					if (eventType === 'chunk' && (data as any).stage === 'modules') {
						const mods = (data as any).modules as DecomposeModule[];
						extractedModules.push(...mods);
						onmodules?.(mods);
						setPendingModules(milestoneId, [...getExistingModules(), ...mods]);
					}
				},
				onError: (stage, message) => {
					toast.error(`发送失败: ${message}`);
				},
				onDone: () => {
					if (streamingText) {
						messages = [
							...messages,
							{ role: 'assistant', content: streamingText, modulesJson: extractedModules.length > 0 ? JSON.stringify(extractedModules) : null }
						];
					}
					isStreaming = false;
					streamingText = '';
					streamResult = null;
				}
			}
		);
	}

	function cancelStream() {
		streamResult?.abort();
		if (streamingText) {
			messages = [...messages, { role: 'assistant', content: streamingText }];
		}
		isStreaming = false;
		streamingText = '';
		streamResult = null;
	}

	async function deleteConversation() {
		try {
			const res = await fetch(`/api/milestones/${milestoneId}/conversation`, { method: 'DELETE' });
			if (res.ok) {
				messages = [];
				inputText = '';
				streamingText = '';
				isStreaming = false;
				setPendingModules(milestoneId, []);
			}
		} catch {
			toast.error('删除对话失败');
		}
	}

	function toggleReference(mod: DecomposeModule) {
		const idx = referenceModules.findIndex(m => m.name === mod.name);
		if (idx >= 0) {
			referenceModules = referenceModules.filter((_, i) => i !== idx);
		} else {
			referenceModules = [...referenceModules, mod];
		}
	}

	function getModulesFromMessage(msg: Message): DecomposeModule[] {
		if (!msg.modulesJson) return [];
		try {
			return JSON.parse(msg.modulesJson);
		} catch {
			return [];
		}
	}

	function getExistingModules(): DecomposeModule[] {
		const mods: DecomposeModule[] = [];
		for (const msg of messages) {
			if (msg.role === 'assistant' && msg.modulesJson) {
				try {
					mods.push(...JSON.parse(msg.modulesJson));
				} catch { /* skip */ }
			}
		}
		return mods;
	}

	// ── Prompt management ─────────────────────────────────────────────────────

	async function loadPrompt() {
		try {
			const res = await fetch(`/api/milestones/${milestoneId}/conversation/prompt`);
			if (res.ok) {
				const data = await res.json();
				defaultPrompt = data.defaultPrompt;
				customPrompt = data.customPrompt;
				promptEditText = data.customPrompt ?? data.defaultPrompt;
			}
		} catch { /* ignore */ }
	}

	async function savePrompt() {
		try {
			const res = await fetch(`/api/milestones/${milestoneId}/conversation/prompt`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ systemPrompt: promptEditText })
			});
			if (res.ok) {
				customPrompt = promptEditText;
				toast.success('提示词已保存');
			}
		} catch {
			toast.error('保存提示词失败');
		}
	}

	async function resetPrompt() {
		try {
			const res = await fetch(`/api/milestones/${milestoneId}/conversation/prompt`, { method: 'DELETE' });
			if (res.ok) {
				customPrompt = null;
				promptEditText = defaultPrompt;
				toast.success('已还原为默认提示词');
			}
		} catch {
			toast.error('还原提示词失败');
		}
	}

	function togglePromptPanel() {
		showPromptPanel = !showPromptPanel;
		if (showPromptPanel && !defaultPrompt) {
			loadPrompt();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}
</script>

{#if status === 'draft' && sourceMd}
	<div class="flex flex-col h-full border border-slate-200 rounded-xl bg-white overflow-hidden">
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
			<span class="text-sm font-medium text-slate-700">AI 拆解对话</span>
			<div class="flex items-center gap-1.5">
				<button
					class="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
					onclick={togglePromptPanel}
					title="提示词设置"
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
					</svg>
				</button>
				{#if hasConversation}
					<button
						class="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
						onclick={deleteConversation}
						title="删除对话"
					>
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
						</svg>
					</button>
				{/if}
			</div>
		</div>

		<!-- Prompt panel (collapsible) -->
		{#if showPromptPanel}
			<div class="border-b border-slate-200 p-3 bg-slate-50">
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-medium text-slate-600">提示词设置</span>
					<div class="flex gap-1.5">
						<button
							class="px-2 py-1 text-xs rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all"
							onclick={resetPrompt}
						>
							还原默认
						</button>
						<button
							class="px-2 py-1 text-xs rounded bg-indigo-500 text-white hover:bg-indigo-600 transition-all"
							onclick={savePrompt}
						>
							保存
						</button>
					</div>
				</div>
				<textarea
					class="w-full h-32 text-xs p-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
					bind:value={promptEditText}
				></textarea>
			</div>
		{/if}

		<!-- Messages area -->
		<div class="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
			{#if !hasConversation && !isStreaming}
				<div class="text-center py-8">
					<div class="text-2xl mb-2">🤖</div>
					<p class="text-sm text-slate-400 mb-4">点击下方按钮开始 AI 拆解</p>
					<button
						class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
						       bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
						       transition-colors shadow-sm"
						onclick={startDecompose}
						disabled={!canStart}
					>
						<span>🚀</span>
						<span>开始拆解</span>
					</button>
				</div>
			{:else}
				{#each messages as msg (msg)}
					<div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
						<div class="max-w-[85%] {msg.role === 'user'
							? 'bg-blue-500 text-white rounded-xl rounded-br-sm px-3 py-2'
							: 'bg-slate-100 text-slate-800 rounded-xl rounded-bl-sm px-3 py-2'}">
							<!-- Message content -->
							{#if msg.role === 'assistant'}
								<pre class="text-xs whitespace-pre-wrap break-words font-sans m-0">{msg.content}</pre>
							{:else}
								<p class="text-xs">{msg.content}</p>
							{/if}

							<!-- Module cards for assistant messages -->
							{#if msg.role === 'assistant' && msg.modulesJson}
								{@const mods = getModulesFromMessage(msg)}
								{#if mods.length > 0}
									<div class="mt-2 space-y-1.5">
										{#each mods as mod, i}
											<div class="flex items-start gap-1.5 bg-white/20 rounded-lg p-2">
												<span class="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center">
													{i + 1}
												</span>
												<div class="flex-1 min-w-0">
													<p class="text-xs font-semibold">{mod.name}</p>
													{#if mod.description}
														<p class="text-[10px] opacity-75 mt-0.5">{mod.description}</p>
													{/if}
													<p class="text-[10px] opacity-60 mt-0.5">{mod.tasks.length} 个任务</p>
												</div>
												<button
													class="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-blue-200/50 hover:bg-blue-200 transition-all"
													onclick={() => toggleReference(mod)}
													title="引用此模块"
												>
													📎
												</button>
											</div>
										{/each}
									</div>
								{/if}
							{/if}
						</div>
					</div>
				{/each}

				<!-- Streaming indicator -->
				{#if isStreaming}
					<div class="flex justify-start">
						<div class="max-w-[85%] bg-slate-100 text-slate-800 rounded-xl rounded-bl-sm px-3 py-2">
							{#if streamingText}
								<pre class="text-xs whitespace-pre-wrap break-words font-sans m-0">{streamingText}</pre>
							{:else}
								<div class="flex items-center gap-2 text-xs text-blue-600">
									<span class="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
									<span>AI 正在思考...</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Reference chips -->
		{#if referenceModules.length > 0}
			<div class="px-3 py-1.5 border-t border-slate-100 flex flex-wrap gap-1">
				{#each referenceModules as mod}
					<span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-700 border border-blue-200">
						{mod.name}
						<button
							class="hover:text-blue-900"
							onclick={() => toggleReference(mod)}
						>✕</button>
					</span>
				{/each}
			</div>
		{/if}

		<!-- Input area -->
		{#if hasConversation}
			<div class="border-t border-slate-200 p-2.5">
				<div class="flex gap-2">
					<textarea
						class="flex-1 text-xs p-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
						placeholder="输入修改指令..."
						rows="2"
						bind:value={inputText}
						onkeydown={handleKeydown}
						disabled={isStreaming}
					></textarea>
					<div class="flex flex-col gap-1">
						{#if isStreaming}
							<button
								class="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all"
								onclick={cancelStream}
							>
								终止
							</button>
						{:else}
							<button
								class="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
								onclick={sendMessage}
								disabled={!canSend}
							>
								发送
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
