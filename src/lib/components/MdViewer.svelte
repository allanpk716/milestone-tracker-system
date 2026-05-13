<script lang="ts">
	import { marked } from 'marked';
	import type { Tokens } from 'marked';

	// ── Props ─────────────────────────────────────────────────────────────────

	interface Props {
		sourceMd: string;
	}

	let { sourceMd }: Props = $props();

	// ── Types ─────────────────────────────────────────────────────────────────

	interface TocItem {
		id: string;
		text: string;
		level: number;
	}

	// ── Derived ───────────────────────────────────────────────────────────────

	let renderedHtml = $derived(marked.parse(sourceMd, { async: false }) as string);

	let tocItems = $derived.by(() => {
		const tokens = marked.lexer(sourceMd);
		const items: TocItem[] = [];
		let counter = 0;

		for (const token of tokens) {
			if (
				token.type === 'heading' &&
				token.depth >= 1 &&
				token.depth <= 4
			) {
				const heading = token as Tokens.Heading;
				counter++;
				const id = `heading-${counter}`;
				items.push({
					id,
					text: heading.text,
					level: heading.depth
				});
			}
		}

		return items;
	});

	let activeHeadingId = $state<string | null>(null);

	// ── Helpers ───────────────────────────────────────────────────────────────

	/** Generate heading IDs by post-processing the rendered HTML. */
	function processRenderedHtml(): string {
		let counter = 0;
		return (renderedHtml as string).replace(
			/<h([1-4])([^>]*)>(.*?)<\/h\1>/gi,
			(_match: string, level: string, attrs: string, content: string) => {
				counter++;
				const id = `heading-${counter}`;
				return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
			}
		);
	}

	/** Scroll to a TOC heading and update active state. */
	function scrollToHeading(id: string) {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			activeHeadingId = id;
		}
	}

	/** Track which heading is visible via IntersectionObserver. */
	let contentEl: HTMLDivElement | undefined = $state();
	let observer: IntersectionObserver | undefined;

	$effect(() => {
		if (!contentEl) return;

		const ids = tocItems.map((t) => t.id);
		if (ids.length === 0) return;

		observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						activeHeadingId = entry.target.id;
					}
				}
			},
			{ root: contentEl, rootMargin: '-20% 0px -70% 0px', threshold: 0 }
		);

		// Small delay to let DOM settle after HTML render
		requestAnimationFrame(() => {
			for (const id of ids) {
				const el = document.getElementById(id);
				if (el) observer!.observe(el);
			}
		});

		return () => observer?.disconnect();
	});
</script>

<div class="flex h-full">
	<!-- TOC sidebar -->
	{#if tocItems.length > 0}
		<nav class="flex-shrink-0 w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto py-3 px-3">
			<p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">目录</p>
			<ul class="space-y-1">
				{#each tocItems as item (item.id)}
					<li>
						<button
							class="block w-full text-left text-xs truncate transition-colors rounded px-2 py-1
								{activeHeadingId === item.id
									? 'text-blue-700 bg-blue-50 font-medium'
									: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}"
							style="padding-left: {(item.level - 1) * 12 + 8}px"
							onclick={() => scrollToHeading(item.id)}
						>
							{item.text}
						</button>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}

	<!-- Markdown content -->
	<div class="flex-1 overflow-y-auto p-6" bind:this={contentEl}>
		<div class="prose prose-sm max-w-none markdown-body">
			{@html processRenderedHtml()}
		</div>
	</div>
</div>

<style>
	.markdown-body :global(h1),
	.markdown-body :global(h2),
	.markdown-body :global(h3),
	.markdown-body :global(h4) {
		scroll-margin-top: 1rem;
	}
	.markdown-body :global(h1) {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
		padding-bottom: 0.375rem;
		border-bottom: 1px solid #e5e7eb;
	}
	.markdown-body :global(h2) {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin-top: 1.25rem;
		margin-bottom: 0.5rem;
	}
	.markdown-body :global(h3) {
		font-size: 1.1rem;
		font-weight: 600;
		color: #374151;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}
	.markdown-body :global(h4) {
		font-size: 1rem;
		font-weight: 600;
		color: #4b5563;
		margin-top: 0.75rem;
		margin-bottom: 0.375rem;
	}
	.markdown-body :global(p) {
		margin: 0.5rem 0;
		line-height: 1.7;
		color: #374151;
	}
	.markdown-body :global(ul),
	.markdown-body :global(ol) {
		padding-left: 1.5rem;
		margin: 0.5rem 0;
	}
	.markdown-body :global(li) {
		margin: 0.25rem 0;
		line-height: 1.6;
		color: #374151;
	}
	.markdown-body :global(code) {
		background: #f3f4f6;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.85em;
		color: #dc2626;
	}
	.markdown-body :global(pre) {
		background: #1f2937;
		color: #e5e7eb;
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin: 0.75rem 0;
	}
	.markdown-body :global(pre code) {
		background: none;
		color: inherit;
		padding: 0;
		font-size: 0.85em;
	}
	.markdown-body :global(blockquote) {
		border-left: 3px solid #d1d5db;
		padding-left: 1rem;
		margin: 0.75rem 0;
		color: #6b7280;
	}
	.markdown-body :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 0.75rem 0;
	}
	.markdown-body :global(th),
	.markdown-body :global(td) {
		border: 1px solid #e5e7eb;
		padding: 0.5rem 0.75rem;
		text-align: left;
		font-size: 0.875rem;
	}
	.markdown-body :global(th) {
		background: #f9fafb;
		font-weight: 600;
		color: #374151;
	}
	.markdown-body :global(a) {
		color: #2563eb;
		text-decoration: underline;
	}
	.markdown-body :global(hr) {
		border: none;
		border-top: 1px solid #e5e7eb;
		margin: 1rem 0;
	}
	.markdown-body :global(strong) {
		color: #111827;
		font-weight: 600;
	}
</style>
