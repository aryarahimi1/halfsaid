<script lang="ts">
	let { onstart, onskip }: { onstart: () => void; onskip: () => void } = $props();
</script>

<div class="flex-1">
	<h2 class="font-display text-3xl leading-tight font-bold text-[var(--color-ink)]">
		Let's make this board yours
	</h2>
	<p class="mt-3 text-lg text-[var(--color-slate)]">
		Halfsaid works better when it knows a little about you — your name, the people you talk to, the
		things you ask for most. It uses this only to understand you. Nothing is shared, and it all
		stays on this device.
	</p>
	<p class="mt-3 text-[var(--color-slate)]">
		A few quick questions. Skip any of them. Change anything later.
	</p>
	<p class="mt-4 rounded-xl bg-[var(--color-calm)] px-4 py-3 text-[var(--color-slate)]">
		Setting this up for someone you care for? Answer as them — it's their voice.
	</p>

	<div class="mt-6 flex flex-col gap-2">
		<button
			type="button"
			class="min-h-14 rounded-xl bg-[var(--color-accent)] px-4 py-3 text-lg font-semibold text-white active:scale-[0.98]"
			onclick={onstart}>Let's go</button
		>
		<button
			type="button"
			class="min-h-14 rounded-xl px-4 py-3 text-lg text-[var(--color-slate)] active:scale-95"
			onclick={onskip}>Skip for now</button
		>
	</div>
</div>
