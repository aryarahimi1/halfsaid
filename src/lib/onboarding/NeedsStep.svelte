<script lang="ts">
	import type { Profile } from '$lib/profile';
	import { NEEDS, SIGNALS } from './steps';
	import StepShell from './StepShell.svelte';
	import ChipList from './ui/ChipList.svelte';

	let { draft }: { draft: Profile } = $props();
</script>

<StepShell
	title="What do you ask for most?"
	subtitle="Tap the ones that fit. These become buttons too."
>
	<div>
		<span class="mb-2 block text-sm font-semibold tracking-wide text-[var(--color-slate)] uppercase"
			>Everyday needs</span
		>
		<ChipList
			bind:items={draft.commonNeeds}
			suggestions={NEEDS}
			placeholder="Add a need"
			label="Everyday needs"
		/>
	</div>

	<div class="mt-6">
		<span class="mb-1 block text-sm font-semibold tracking-wide text-[var(--color-slate)] uppercase"
			>When something's too much</span
		>
		<p class="mb-3 text-sm text-[var(--color-slate)]/80">
			Quick ways to say something's wrong, without finding the words.
		</p>
		<ChipList
			bind:items={draft.signals}
			suggestions={SIGNALS}
			placeholder="Add a signal"
			label="Signal something is wrong"
		/>
	</div>
</StepShell>
