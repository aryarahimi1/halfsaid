<script lang="ts">
	import { goto } from '$app/navigation';
	import { profileStore } from '$lib/profile.svelte';
</script>

<div
	class="mb-3 rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-4"
>
	<p class="font-medium text-[var(--color-ink)]">Make this board yours</p>
	<p class="mt-1 text-sm text-[var(--color-slate)]">
		Add your name and the people you talk to, so your sentences come out right.
	</p>
	<div class="mt-3 flex gap-2">
		<button
			type="button"
			class="min-h-12 flex-1 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-lg font-semibold text-white active:scale-[0.98]"
			onclick={() => goto('/setup')}>Set it up</button
		>
		<button
			type="button"
			class="min-h-12 rounded-xl px-4 py-2 text-lg text-[var(--color-slate)] active:scale-95"
			onclick={() => profileStore.dismissOnboarding()}>Maybe later</button
		>
	</div>
</div>
