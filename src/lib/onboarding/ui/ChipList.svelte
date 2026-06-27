<script lang="ts">
	import ChipToggle from './ChipToggle.svelte';

	let {
		items = $bindable(),
		suggestions = [],
		placeholder = 'Add',
		label = ''
	}: { items: string[]; suggestions?: string[]; placeholder?: string; label?: string } = $props();

	let text = $state('');

	const norm = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, 40);

	// Custom additions only — suggestions render their own toggle state above, so
	// showing them again as removable chips would double up.
	const custom = $derived(items.filter((x) => !suggestions.includes(x)));

	function add(v: string) {
		const t = norm(v);
		if (t && !items.includes(t)) items = [...items, t];
		text = '';
	}
	function toggle(label: string) {
		items = items.includes(label) ? items.filter((x) => x !== label) : [...items, label];
	}
	function removeValue(v: string) {
		items = items.filter((x) => x !== v);
	}
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			add(text);
		}
	}
</script>

{#if suggestions.length}
	<div class="mb-3 flex flex-wrap gap-2">
		{#each suggestions as s (s)}
			<ChipToggle label={s} selected={items.includes(s)} onToggle={() => toggle(s)} />
		{/each}
	</div>
{/if}

<div class="flex gap-2">
	<input
		class="min-h-14 flex-1 rounded-xl border border-[var(--color-slate)]/25 bg-[var(--color-paper)] px-4 py-3 text-lg focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:outline-none"
		{placeholder}
		aria-label={label || placeholder}
		bind:value={text}
		{onkeydown}
	/>
	<button
		type="button"
		class="min-h-14 rounded-xl bg-[var(--color-accent)] px-5 text-lg font-semibold text-white active:scale-95 disabled:opacity-40"
		onclick={() => add(text)}
		disabled={!norm(text)}>Add</button
	>
</div>

{#if custom.length}
	<div class="mt-3 flex flex-wrap gap-2">
		{#each custom as item (item)}
			<span
				class="flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-3 py-2 text-lg font-medium text-white"
			>
				{item}
				<button
					type="button"
					class="leading-none text-white/80"
					onclick={() => removeValue(item)}
					aria-label={`Remove ${item}`}>✕</button
				>
			</span>
		{/each}
	</div>
{/if}
