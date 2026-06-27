<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Profile } from '$lib/profile';
	import { profileStore } from '$lib/profile.svelte';
	import StepShell from './StepShell.svelte';

	let {
		draft,
		name,
		mode,
		onedit,
		ondone
	}: {
		draft: Profile;
		name: string;
		mode: 'onboarding' | 'edit';
		onedit: (stepIndex: number) => void;
		ondone: () => void;
	} = $props();

	// Step indices in STEPS: identity=1, people=2, needs=3, favorites=4.
	function summary(items: string[], empty: string): string {
		const shown = items.slice(0, 3).join(', ');
		const extra = items.length - 3;
		if (!items.length) return empty;
		return extra > 0 ? `${shown} +${extra}` : shown;
	}

	const youSummary = $derived(
		name ? (draft.pronouns ? `${name} · ${draft.pronouns}` : name) : 'Add your name'
	);
	const peopleSummary = $derived(
		summary(
			draft.people.map((p) => p.name),
			'No one added yet'
		)
	);
	const needsSummary = $derived(
		summary([...draft.commonNeeds, ...draft.signals], 'Nothing added yet')
	);
	const favSummary = $derived(summary(draft.likes, 'Nothing added yet'));

	function startOver() {
		if (typeof window !== 'undefined' && !window.confirm('Start over and clear this profile?'))
			return;
		profileStore.reset();
		goto('/');
	}
</script>

<StepShell
	title={mode === 'onboarding' ? (name ? `All set, ${name}.` : 'All set.') : 'Your profile'}
	subtitle="Here's what your board knows. Tap anything to change it — or add more anytime."
>
	<div class="space-y-2">
		{#each [{ label: 'You', value: youSummary, step: 1 }, { label: 'People', value: peopleSummary, step: 2 }, { label: 'Needs', value: needsSummary, step: 3 }, { label: 'Favorites', value: favSummary, step: 4 }] as card (card.label)}
			<button
				type="button"
				class="flex w-full items-center justify-between rounded-2xl border border-[var(--color-slate)]/15 bg-[var(--color-paper)] px-4 py-4 text-left shadow-sm active:scale-[0.99]"
				onclick={() => onedit(card.step)}
			>
				<span>
					<span class="block text-sm font-medium text-[var(--color-slate)]">{card.label}</span>
					<span class="block text-lg text-[var(--color-ink)]">{card.value}</span>
				</span>
				<span class="text-[var(--color-slate)]">Edit</span>
			</button>
		{/each}

		<button
			type="button"
			class="flex w-full items-center justify-between rounded-2xl border border-[var(--color-slate)]/15 bg-[var(--color-paper)] px-4 py-4 text-left shadow-sm active:scale-[0.99]"
			onclick={() => goto('/voice')}
		>
			<span>
				<span class="block text-sm font-medium text-[var(--color-slate)]">Your voice</span>
				<span class="block text-lg text-[var(--color-ink)]">
					{draft.voice?.kind === 'cloned' ? 'Your own voice' : 'Speak in your own voice'}
				</span>
			</span>
			<span class="text-[var(--color-slate)]">{draft.voice?.kind === 'cloned' ? 'Edit' : 'Set up'}</span
			>
		</button>
	</div>

	<button
		type="button"
		class="mt-6 min-h-14 w-full rounded-xl bg-[var(--color-accent)] px-4 py-3 text-lg font-semibold text-white active:scale-[0.98]"
		onclick={ondone}>{mode === 'onboarding' ? 'Start talking' : 'Done'}</button
	>

	<button
		type="button"
		class="mt-3 min-h-14 w-full rounded-xl px-4 py-3 text-[var(--color-slate)] active:scale-95"
		onclick={startOver}>Start over</button
	>
</StepShell>
