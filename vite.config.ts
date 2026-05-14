import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf-8'));

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	}
});
