<script lang="ts">
	import type { Profile } from '$lib/profile';
	import { FAVORITES } from './steps';
	import StepShell from './StepShell.svelte';
	import ChipList from './ui/ChipList.svelte';

	let { draft, name }: { draft: Profile; name: string } = $props();
</script>

<StepShell
	title="The good stuff"
	subtitle={`Favorite things, shows, places, comfort objects — anything that helps ${
		name || 'you'
	} feel okay. Halfsaid uses these to understand what you mean.`}
>
	<ChipList
		bind:items={draft.likes}
		suggestions={FAVORITES}
		placeholder="e.g. Bluey, my red blanket, the dog, music"
		label="Favorite things"
	/>
</StepShell>
