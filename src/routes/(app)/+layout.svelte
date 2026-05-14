<script lang="ts">
	import Toast from '$lib/components/Toast.svelte';

	let { children } = $props();
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
	<!-- Top nav -->
	<nav class="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-14">
				<a href="/" class="flex items-center gap-2.5 group">
					<span class="text-lg">📊</span>
					<span class="text-base font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors duration-200">
						里程碑管理
					</span>
				</a>
				<div class="flex items-center gap-3">
					<span class="text-[11px] text-slate-400 font-mono tracking-tight" title="构建版本">
						v{__APP_VERSION__}
					</span>
					<div class="w-px h-4 bg-slate-200"></div>
					<a
						href="/milestones/create"
						class="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-indigo-600
						       px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all duration-200"
					>
						<span class="text-base leading-none">+</span>
						新建
					</a>
					<button
						class="text-sm text-slate-400 hover:text-rose-500 px-2 py-1.5 rounded-lg
						       hover:bg-rose-50 transition-all duration-200"
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
	<main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{@render children()}
	</main>
</div>

<Toast />
