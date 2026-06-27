<script lang="ts">
	let {
		label,
		selected = false,
		onToggle
	}: { label: string; selected?: boolean; onToggle: () => void } = $props();
</script>

<button
	type="button"
	class="min-h-14 rounded-xl px-4 py-2 text-lg font-medium transition active:scale-95 focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:outline-none {selected
		? 'bg-[var(--color-accent)] text-white'
		: 'bg-[var(--color-calm)] text-[var(--color-ink)]'}"
	aria-pressed={selected}
	onclick={onToggle}
>
	{label}
</button>
