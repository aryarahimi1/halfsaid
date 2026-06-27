<script lang="ts">
	import type { Profile } from '$lib/profile';
	import { RELATIONSHIPS } from './steps';
	import StepShell from './StepShell.svelte';
	import ChipToggle from './ui/ChipToggle.svelte';

	let { draft, name }: { draft: Profile; name: string } = $props();

	let personName = $state('');
	let relationship = $state('');

	const norm = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, 40);
	const canAdd = $derived(norm(personName).length > 0);

	function pickRelationship(r: string) {
		relationship = relationship === r ? '' : r;
	}

	function addPerson() {
		const nm = norm(personName);
		if (!nm) return;
		draft.people = [...draft.people, { name: nm, relationship: norm(relationship) }];
		personName = '';
		relationship = '';
	}

	function removePerson(i: number) {
		draft.people = draft.people.filter((_, x) => x !== i);
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addPerson();
		}
	}
</script>

<StepShell
	title={name ? `Who does ${name} talk to?` : 'Who do you talk to most?'}
	subtitle="Add the people in your day. Each one becomes a button — so you can say their name in one tap."
>
	<label class="block">
		<span class="mb-1 block text-sm font-medium text-[var(--color-slate)]">Their name</span>
		<input
			class="min-h-14 w-full rounded-xl border border-[var(--color-slate)]/25 bg-[var(--color-paper)] px-4 py-3 text-lg focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:outline-none"
			placeholder="e.g. Maria"
			bind:value={personName}
			{onkeydown}
		/>
	</label>

	<div class="mt-3 flex flex-wrap gap-2">
		{#each RELATIONSHIPS as r (r)}
			<ChipToggle label={r} selected={relationship === r} onToggle={() => pickRelationship(r)} />
		{/each}
	</div>

	<button
		type="button"
		class="mt-3 min-h-14 w-full rounded-xl bg-[var(--color-accent)] px-4 py-3 text-lg font-semibold text-white active:scale-[0.98] disabled:opacity-40"
		onclick={addPerson}
		disabled={!canAdd}>Add</button
	>

	{#if draft.people.length === 0}
		<p class="mt-4 text-[var(--color-slate)]/80">
			No one yet. Add the people you see most — family, friends, the people who help you.
		</p>
	{:else}
		<ul class="mt-4 space-y-2">
			{#each draft.people as person, i (i)}
				<li
					class="flex items-center justify-between rounded-xl border border-[var(--color-slate)]/15 bg-[var(--color-paper)] px-4 py-3"
				>
					<span class="text-lg text-[var(--color-ink)]">
						<span class="font-medium">{person.name}</span>
						{#if person.relationship}<span class="text-[var(--color-slate)]">
								· {person.relationship}</span
							>{/if}
					</span>
					<button
						type="button"
						class="text-xl text-[var(--color-slate)] active:scale-90"
						onclick={() => removePerson(i)}
						aria-label={`Remove ${person.name}`}>✕</button
					>
				</li>
			{/each}
		</ul>
	{/if}
</StepShell>
