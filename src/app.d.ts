// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			authMethod?: 'cookie' | 'bearer';
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
	// Build-time version injected from package.json via vite define
	const __APP_VERSION__: string;
}

export {};
