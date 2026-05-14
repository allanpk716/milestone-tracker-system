<script lang="ts">
	let password = $state('');
	let error = $state('');
	let loading = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = 'loading';

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password })
			});

			if (!res.ok) {
				const data = await res.json();
				error = data.message || '登录失败';
				loading = '';
				return;
			}

			// Success — redirect to home
			window.location.href = '/';
		} catch {
			error = '网络错误，请重试';
			loading = '';
		}
	}
</script>

<svelte:head>
	<title>登录 — 里程碑管理系统</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
	<div class="w-full max-w-sm">
		<div class="text-center mb-8">
			<h1 class="text-2xl font-bold text-gray-900">里程碑管理系统</h1>
			<p class="text-sm text-gray-500 mt-1">Milestone Tracker</p>
		</div>

		<form onsubmit={handleSubmit} class="bg-white rounded-lg shadow-md p-6 space-y-4">
			{#if error}
				<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
					{error}
				</div>
			{/if}

			<div>
				<label for="password" class="block text-sm font-medium text-gray-700 mb-1">
					管理员密码
				</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					autocomplete="current-password"
					disabled={loading === 'loading'}
					class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm
					       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
					       disabled:opacity-50 disabled:cursor-not-allowed"
					placeholder="请输入管理员密码"
				/>
			</div>

			<button
				type="submit"
				disabled={loading === 'loading' || !password}
				class="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md
				       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
				       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{loading === 'loading' ? '登录中…' : '登 录'}
			</button>
		</form>

		<p class="text-center text-xs text-gray-400 mt-6">
			Milestone Tracker v{__APP_VERSION__}
		</p>
	</div>
</div>
