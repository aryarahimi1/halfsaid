<script lang="ts">
	// First Words — the opener. Lands the stakes in one breath and demos itself:
	// a few broken words become a whole sentence, right here, before you touch
	// anything. Shown once (then never), reopenable from the board.
	import { onMount, onDestroy } from 'svelte';
	import AssembledSentence from './AssembledSentence.svelte';

	let { onstart }: { onstart: () => void } = $props();

	const examples = [
		{ fragments: ['water', 'hot', 'cup'], sentence: 'Can I have a cup of hot water?' },
		{
			fragments: ['tired', 'happy', 'see you'],
			sentence: "I'm tired, but I'm so happy to see you."
		},
		{ fragments: ['bathroom', 'help', 'now'], sentence: 'I need help to the bathroom now.' }
	];
	let idx = $state(0);
	let timer: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		timer = setInterval(() => (idx = (idx + 1) % examples.length), 3600);
	});
	onDestroy(() => clearInterval(timer));
</script>

<div
	class="intro fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[var(--color-calm)] px-6 py-10"
	role="dialog"
	aria-modal="true"
	aria-label="Welcome to Halfsaid"
>
	<div class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
		<p class="font-display text-lg font-bold tracking-tight text-[var(--color-accent-strong)]">
			Halfsaid
		</p>
		<h1
			class="font-display mt-3 text-4xl leading-[1.08] font-bold tracking-tight text-[var(--color-ink)]"
		>
			Say what you already mean.
		</h1>
		<p class="mt-4 text-lg leading-relaxed text-[var(--color-slate)]">
			Two million people have the words in their head but can't get them out. The usual fix is a
			$15,000 device. This is free, and it speaks in your own voice.
		</p>

		<!-- Demos itself: a few broken words become a sentence, cycling. -->
		<div
			class="mt-7 rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-paper)] p-5 shadow-sm"
		>
			<div class="flex flex-wrap items-center gap-2">
				{#each examples[idx].fragments as f (f)}
					<span
						class="rounded-lg bg-[var(--color-calm)] px-3 py-1.5 text-base font-medium text-[var(--color-ink)]"
						>{f}</span
					>
				{/each}
				<span class="text-[var(--color-slate)]" aria-hidden="true">→</span>
			</div>
			<p class="font-display mt-3 text-2xl leading-snug">
				{#key idx}
					<AssembledSentence text={examples[idx].sentence} fragments={examples[idx].fragments} />
				{/key}
			</p>
		</div>

		<button
			type="button"
			class="mt-7 min-h-14 w-full rounded-xl bg-[var(--color-accent)] px-4 py-3 text-lg font-semibold text-white active:scale-[0.98]"
			onclick={onstart}>Start talking</button
		>
		<button
			type="button"
			class="mt-2 min-h-12 w-full rounded-xl px-4 py-2 text-[var(--color-slate)] active:scale-95"
			onclick={onstart}>Skip</button
		>
	</div>
</div>

<style>
	.intro {
		animation: fade 0.35s ease-out both;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.intro {
			animation: none;
		}
	}
</style>
