<script lang="ts">
	import Toast from '$lib/components/Toast.svelte';

	let { children } = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Top nav -->
	<nav class="bg-white border-b border-gray-200 sticky top-0 z-40">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-14">
				<a href="/" class="flex items-center gap-2 text-gray-900 hover:text-blue-600 transition-colors">
					<span class="text-lg font-bold">📊 里程碑管理</span>
				</a>
				<div class="flex items-center gap-4">
					<span class="text-xs text-gray-400 font-mono" title="构建版本">v{__APP_VERSION__}</span>
					<a
						href="/milestones/create"
						class="text-sm text-gray-600 hover:text-blue-600 transition-colors"
					>
						+ 新建里程碑
					</a>
					<button
						class="text-sm text-gray-500 hover:text-red-600 transition-colors"
						onclick={async () => {
							await fetch('/api/auth/logout', { method: 'POST' });
							window.location.href = '/login';
						}}
					>
						退出
					</button>
				</div>
			</div>
		</div>
	</nav>

	<!-- Page content -->
	<main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		{@render children()}
	</main>
</div>

<Toast />
