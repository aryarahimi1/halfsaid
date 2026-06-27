<script lang="ts">
	import type { Profile } from '$lib/profile';
	import { PRONOUNS } from './steps';
	import StepShell from './StepShell.svelte';
	import ChipToggle from './ui/ChipToggle.svelte';

	let { draft }: { draft: Profile } = $props();

	function setPronouns(p: string) {
		draft.pronouns = draft.pronouns === p ? '' : p;
	}
</script>

<StepShell title="First, your name" subtitle="Just a first name is fine.">
	<label class="block">
		<span class="mb-1 block text-sm font-medium text-[var(--color-slate)]"
			>What should we call you?</span
		>
		<input
			class="min-h-14 w-full rounded-xl border border-[var(--color-slate)]/25 bg-[var(--color-paper)] px-4 py-3 text-lg focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:outline-none"
			placeholder="Type a name"
			bind:value={draft.name}
		/>
	</label>

	<div class="mt-5">
		<span class="mb-2 block text-sm font-medium text-[var(--color-slate)]">Your pronouns</span>
		<div class="flex flex-wrap gap-2">
			{#each PRONOUNS as p (p)}
				<ChipToggle label={p} selected={draft.pronouns === p} onToggle={() => setPronouns(p)} />
			{/each}
		</div>
		<p class="mt-2 text-sm text-[var(--color-slate)]/80">
			This helps Halfsaid choose the right words. Or skip it.
		</p>
	</div>
</StepShell>
