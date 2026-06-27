<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle,
		children
	}: { title: string; subtitle?: string; children: Snippet } = $props();
</script>

<div class="flex-1">
	<h2 class="font-display text-2xl leading-tight font-bold text-[var(--color-ink)]">{title}</h2>
	{#if subtitle}
		<p class="mt-2 text-[var(--color-slate)]">{subtitle}</p>
	{/if}
	<div class="mt-5">
		{@render children()}
	</div>
</div>
