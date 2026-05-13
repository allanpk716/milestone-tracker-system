<script lang="ts">
	import { toast } from '$lib/stores/toast.js';
	import { goto } from '$app/navigation';

	let title = $state('');
	let gitUrl = $state('');
	let sourceMd = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const body: Record<string, string> = { title };
			if (gitUrl.trim()) body.gitUrl = gitUrl.trim();
			if (sourceMd.trim()) body.sourceMd = sourceMd.trim();

			const res = await fetch('/api/milestones', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (!res.ok) {
				const data = await res.json();
				error = data.details?.[0]?.message || data.message || '创建失败';
				return;
			}

			const milestone = await res.json();
			toast.show('里程碑创建成功', 'success');
			goto(`/milestones/${milestone.id}`);
		} catch {
			error = '网络错误，请重试';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>新建里程碑 — 里程碑管理系统</title>
</svelte:head>

<nav class="flex items-center gap-1 text-sm text-gray-500 mb-6">
	<a href="/" class="hover:text-blue-600 transition-colors">里程碑列表</a>
	<span>/</span>
	<span class="text-gray-800">新建里程碑</span>
</nav>

<div class="max-w-2xl">
	<form onsubmit={handleSubmit} class="space-y-5">
		{#if error}
			<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
				{error}
			</div>
		{/if}

		<!-- Title -->
		<div>
			<label for="title" class="block text-sm font-medium text-gray-700 mb-1">
				标题 <span class="text-red-500">*</span>
			</label>
			<input
				id="title"
				type="text"
				bind:value={title}
				required
				maxlength={200}
				disabled={loading}
				class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm
				       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
				       disabled:opacity-50 disabled:cursor-not-allowed"
				placeholder="例如：v1.0 核心功能开发"
			/>
		</div>

		<!-- Git URL -->
		<div>
			<label for="gitUrl" class="block text-sm font-medium text-gray-700 mb-1">
				Git 仓库地址
			</label>
			<input
				id="gitUrl"
				type="url"
				bind:value={gitUrl}
				disabled={loading}
				class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm
				       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
				       disabled:opacity-50 disabled:cursor-not-allowed"
				placeholder="https://github.com/owner/repo"
			/>
			<p class="text-xs text-gray-400 mt-1">可选，填写关联的 Git 仓库地址</p>
		</div>

		<!-- Source MD -->
		<div>
			<label for="sourceMd" class="block text-sm font-medium text-gray-700 mb-1">
				来源文档 (Markdown)
			</label>
			<textarea
				id="sourceMd"
				bind:value={sourceMd}
				rows={12}
				disabled={loading}
				class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-mono
				       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
				       disabled:opacity-50 disabled:cursor-not-allowed resize-y"
				placeholder="粘贴里程碑规划文档（Markdown 格式）…"
			></textarea>
			<p class="text-xs text-gray-400 mt-1">可选，粘贴原始规划文档以供后续分解参考</p>
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-3 pt-2">
			<button
				type="submit"
				disabled={loading || !title.trim()}
				class="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md
				       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
				       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{loading ? '创建中…' : '创建里程碑'}
			</button>
			<a
				href="/"
				class="px-5 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
			>
				取消
			</a>
		</div>
	</form>
</div>
