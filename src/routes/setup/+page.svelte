<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { profileStore } from '$lib/profile.svelte';
	import type { Profile } from '$lib/profile';
	import { STEPS } from '$lib/onboarding/steps';
	import WelcomeStep from '$lib/onboarding/WelcomeStep.svelte';
	import IdentityStep from '$lib/onboarding/IdentityStep.svelte';
	import PeopleStep from '$lib/onboarding/PeopleStep.svelte';
	import NeedsStep from '$lib/onboarding/NeedsStep.svelte';
	import FavoritesStep from '$lib/onboarding/FavoritesStep.svelte';
	import ReviewStep from '$lib/onboarding/ReviewStep.svelte';

	const mode = page.url.searchParams.has('edit') ? 'edit' : 'onboarding';

	let draft = $state<Profile | null>(null);
	let step = $state(0);

	onMount(() => {
		profileStore.load();
		profileStore.ensureProfile(); // guarantees there is an active profile to edit
		const active = profileStore.active;
		if (active) draft = structuredClone($state.snapshot(active)) as Profile;
		step = mode === 'edit' ? STEPS.indexOf('review') : 0;
	});

	const name = $derived(draft?.name?.trim() ?? '');
	const current = $derived(STEPS[step]);
	const showFooter = $derived(
		current === 'identity' ||
			current === 'people' ||
			current === 'needs' ||
			current === 'favorites'
	);

	// Autosave the draft back to the store on every change (so leaving via × keeps it).
	$effect(() => {
		if (draft) profileStore.saveActive($state.snapshot(draft) as Profile);
	});

	const next = () => (step = Math.min(step + 1, STEPS.length - 1));
	const back = () => (step = Math.max(step - 1, 0));
	const goTo = (i: number) => (step = i);
	const finish = () => {
		// Don't leave an orphan blank profile if they close without entering anything —
		// but a restored own-voice IS real content, so never delete a profile carrying one.
		const hasOwnVoice = profileStore.active?.voice?.kind === 'cloned';
		if (profileStore.activeId && !profileStore.exists && !hasOwnVoice) {
			profileStore.remove(profileStore.activeId);
		}
		goto('/');
	};
</script>

<div class="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pt-4 pb-10">
	<!-- Top bar: progress dots + step text + close -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<div class="flex gap-1.5" aria-hidden="true">
				{#if step > 0}
					{#each STEPS.slice(1) as s, i (s)}
						<span
							class="h-2 w-2 rounded-full {i + 1 <= step
								? 'bg-[var(--color-accent)]'
								: 'bg-[var(--color-slate)]/25'}"
						></span>
					{/each}
				{/if}
			</div>
			{#if step > 0}
				<span class="text-sm text-[var(--color-slate)]">Step {step} of {STEPS.length - 1}</span>
			{/if}
		</div>
		<button
			type="button"
			class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-lg text-[var(--color-slate)] active:scale-95"
			onclick={finish}
			aria-label="Close setup">✕</button
		>
	</div>

	{#if draft}
		<div class="mt-4 flex flex-1 flex-col">
			{#if current === 'welcome'}
				<WelcomeStep onstart={next} onskip={finish} />
			{:else if current === 'identity'}
				<IdentityStep {draft} />
			{:else if current === 'people'}
				<PeopleStep {draft} {name} />
			{:else if current === 'needs'}
				<NeedsStep {draft} />
			{:else if current === 'favorites'}
				<FavoritesStep {draft} {name} />
			{:else if current === 'review'}
				<ReviewStep {draft} {name} {mode} onedit={goTo} ondone={finish} />
			{/if}

			{#if showFooter}
				<div class="mt-6 flex items-center gap-2">
					<button
						type="button"
						class="min-h-14 rounded-xl px-4 py-3 text-lg text-[var(--color-slate)] active:scale-95"
						onclick={back}>Back</button
					>
					<button
						type="button"
						class="ml-auto min-h-14 flex-1 rounded-xl bg-[var(--color-accent)] px-4 py-3 text-lg font-semibold text-white active:scale-[0.98]"
						onclick={next}>Next</button
					>
				</div>
			{/if}
		</div>
	{/if}
</div>
