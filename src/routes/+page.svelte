<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { composeBoard } from '$lib/aac';
	import { profileStore } from '$lib/profile.svelte';
	import { speak, initBrowserVoice } from '$lib/voice';
	import { createListener, listenSupported, type Listener } from '$lib/listen';
	import { API_BASE } from '$lib/api';
	import AssembledSentence from '$lib/AssembledSentence.svelte';
	import FirstRunGate from '$lib/onboarding/FirstRunGate.svelte';

	let fragments = $state<string[]>([]);
	let partner = $state('');
	let showPartner = $state(false);
	let candidates = $state<string[]>([]);
	let loading = $state(false);
	let source = $state<'ai' | 'fallback' | null>(null);
	let spoken = $state<string | null>(null);

	// Partner mic. canListen is false on SSR + first paint (no window), set after
	// mount, so the mic button appears without a hydration mismatch.
	let canListen = $state(false);
	let listening = $state(false);
	let starting = $state(false); // true between start() and onStart (permission-prompt window)
	let micError = $state<string | null>(null);
	let listener: Listener | null = null;

	// Personalization. The phrasebook is {} until the person sets up a profile (the
	// store hydrates in onMount), so before setup no <profile> block is sent to the
	// model — we never put a fictional stranger's identity in a real user's mouth.
	// `tiles` is likewise empty pre-setup, so the board falls back to the default.
	const phrasebook = $derived(profileStore.phrasebook);
	const board = $derived(composeBoard(profileStore.tiles));
	// True only when the person's OWN cloned voice actually spoke the last sentence
	// (set from speak()'s return value), so the badge never claims "in your voice"
	// for a silent fallback to the device voice.
	let spokenWithOwnVoice = $state(false);

	onMount(() => {
		profileStore.load();
		initBrowserVoice();
		canListen = listenSupported();
	});

	// Stop the mic if the component is torn down (e.g. navigating to /setup) so it
	// never keeps recording with no UI left to stop it.
	onDestroy(() => listener?.stop());

	function micMessage(code: string): string | null {
		switch (code) {
			case 'not-allowed':
			case 'service-not-allowed':
				return 'Microphone is blocked — allow it in your browser settings, or just type below.';
			case 'audio-capture':
				return 'No microphone found — plug one in, or just type below.';
			case 'no-speech':
				return "Didn't catch that — tap the mic and try again, or type below.";
			case 'network':
				return 'Speech service is offline — check your connection, or just type below.';
			case 'aborted':
				return null; // the user stopped it — not an error
			default:
				return "Couldn't use the mic — please type below instead.";
		}
	}

	// Listen to the conversation partner and drop what they said into the field.
	// Guard on `starting` too: `listening` only flips true in onStart, which lags
	// behind start() during the first-run permission prompt — without this a second
	// tap in that window would spawn a second recognizer for the one system mic.
	function toggleListen() {
		if (listening || starting) {
			listener?.stop();
			starting = false;
			return;
		}
		micError = null;
		starting = true;
		listener = createListener({
			onText: (t) => (partner = t),
			onStart: () => {
				starting = false;
				listening = true;
				showPartner = true;
				micError = null;
			},
			onEnd: () => {
				starting = false;
				listening = false;
			},
			onError: (code) => {
				starting = false;
				listening = false;
				micError = micMessage(code);
			}
		});
		if (listener) listener.start();
		else starting = false; // unsupported — never started
	}

	// Hide the partner panel; stop the mic too so the only stop control isn't hidden mid-listen.
	function closePartner() {
		showPartner = false;
		listener?.stop();
	}

	function tap(word: string) {
		fragments = [...fragments, word];
		candidates = []; // new input invalidates the old guesses
		source = null;
	}

	function backspace() {
		fragments = fragments.slice(0, -1);
		candidates = [];
	}

	function clearAll() {
		fragments = [];
		candidates = [];
		source = null;
	}

	// Offline / network failure: still give the person a sentence to speak. Joins
	// the fragments locally so the board never goes dark without signal.
	function localFallback(): string[] {
		const joined = fragments.join(' ').trim();
		return joined ? [joined.charAt(0).toUpperCase() + joined.slice(1) + '.'] : [];
	}

	async function build() {
		if (!fragments.length || loading) return;
		loading = true;
		candidates = [];
		try {
			const res = await fetch(`${API_BASE}/api/reconstruct`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					fragments,
					partnerContext: partner || undefined,
					phrasebook
				})
			});
			const data = await res.json();
			if (data.candidates?.length) {
				candidates = data.candidates;
				source = data.source ?? null;
			} else {
				candidates = localFallback();
				source = 'fallback';
			}
		} catch {
			// Offline — reconstruct locally so the user can still speak.
			candidates = localFallback();
			source = 'fallback';
		} finally {
			loading = false;
		}
	}

	// Confirm: the human is the author — nothing is spoken until they tap.
	async function say(sentence: string) {
		spoken = sentence;
		fragments = [];
		candidates = [];
		partner = '';
		source = null;
		// Speak in the person's own voice if they have one, else the device voice.
		// The badge reflects what ACTUALLY spoke (true only if the cloned voice played).
		spokenWithOwnVoice = await speak(sentence, profileStore.active?.voice);
	}

	function reject(i: number) {
		candidates = candidates.filter((_, idx) => idx !== i);
	}
</script>

<div class="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pb-10">
	<!-- Header -->
	<header class="flex items-baseline justify-between pt-5 pb-3">
		<div>
			<h1 class="font-display text-2xl leading-none font-bold tracking-tight text-[var(--color-ink)]">
				Halfsaid
			</h1>
			<p class="mt-1 text-sm text-[var(--color-slate)]">Say what you already mean.</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				class="inline-flex min-h-11 items-center rounded-full border border-[var(--color-slate)]/30 px-3 text-sm text-[var(--color-slate)] active:scale-95"
				onclick={() => goto('/setup?edit=1')}
				aria-label="Edit your profile"
			>
				{profileStore.active?.name?.trim() || 'Profile'}
			</button>
			<button
				class="inline-flex min-h-11 items-center rounded-full border border-[var(--color-slate)]/30 px-3 text-sm text-[var(--color-slate)] active:scale-95"
				onclick={() => (showPartner ? closePartner() : (showPartner = true))}
				aria-pressed={showPartner}
			>
				{showPartner ? 'Hide' : 'Someone asked…'}
			</button>
		</div>
	</header>

	{#if profileStore.loaded && !profileStore.exists && !profileStore.dismissed}
		<FirstRunGate />
	{/if}

	{#if showPartner}
		<div class="mb-3">
			<label
				for="partner-input"
				class="mb-1 block text-sm font-medium text-[var(--color-slate)]"
				>What did they just say to you?</label
			>
			<div class="flex gap-2">
				<input
					id="partner-input"
					class="min-h-12 w-full rounded-xl border border-[var(--color-slate)]/25 bg-[var(--color-paper)] px-4 py-3 text-lg focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:outline-none"
					placeholder={canListen ? 'Type it, or tap the mic →' : 'e.g. What do you want to drink?'}
					bind:value={partner}
					oninput={() => (micError = null)}
				/>
				{#if canListen}
					<button
						type="button"
						class="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border text-lg active:scale-95 {listening ||
						starting
							? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
							: 'border-[var(--color-slate)]/25 text-[var(--color-slate)]'}"
						onclick={toggleListen}
						aria-pressed={listening || starting}
						aria-label={listening || starting ? 'Stop listening' : 'Listen to the question'}
					>
						{listening || starting ? '■' : '🎤'}
					</button>
				{/if}
			</div>
			<!-- Persistent live region: kept mounted (sr-only when idle) so screen
			     readers reliably announce the listening state when it toggles. -->
			<p
				class="mt-1 text-sm font-medium text-[var(--color-accent-strong)]"
				class:sr-only={!listening}
				role="status"
				aria-live="polite"
			>
				{listening ? 'Listening…' : ''}
			</p>
			{#if micError}
				<p class="mt-1 text-sm font-medium text-red-700" role="alert" aria-live="assertive">
					{micError}
				</p>
			{/if}
		</div>
	{/if}

	<!-- Say bar: the fragments tapped so far -->
	<section
		class="sticky top-2 z-10 rounded-2xl border border-[var(--color-slate)]/15 bg-[var(--color-paper)] p-3 shadow-sm"
		aria-label="Your words"
	>
		<div class="flex min-h-14 flex-wrap items-center gap-2">
			{#if fragments.length === 0}
				<span class="px-1 text-[var(--color-slate)]/70">Tap words below…</span>
			{:else}
				{#each fragments as f, i (i)}
					<span
						class="rounded-xl bg-[var(--color-calm)] px-3 py-2 text-lg font-medium text-[var(--color-ink)]"
						>{f}</span
					>
				{/each}
			{/if}
		</div>

		<div class="mt-2 flex gap-2">
			<button
				class="flex-1 rounded-xl bg-[var(--color-accent)] px-4 py-3 text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40"
				onclick={build}
				disabled={!fragments.length || loading}
			>
				{loading ? 'Assembling…' : 'Build sentence'}
			</button>
			<button
				class="rounded-xl border border-[var(--color-slate)]/25 px-4 py-3 text-lg text-[var(--color-slate)] active:scale-95 disabled:opacity-30"
				onclick={backspace}
				disabled={!fragments.length}
				aria-label="Remove last word">⌫</button
			>
			<button
				class="rounded-xl border border-[var(--color-slate)]/25 px-4 py-3 text-lg text-[var(--color-slate)] active:scale-95 disabled:opacity-30"
				onclick={clearAll}
				disabled={!fragments.length}
				aria-label="Clear all">Clear</button
			>
		</div>
	</section>

	<!-- The Bridge: your words become a sentence, assembling on screen.
	     Persistent status region so assistive tech announces loading + the result. -->
	<div class="mt-4" role="status" aria-live="polite">
		{#if loading}
			<div class="rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 px-5 py-5">
				<p class="text-lg text-[var(--color-slate)]">Reconstructing your words…</p>
				<div class="think mt-3" aria-hidden="true"></div>
			</div>
		{:else if candidates.length}
			<!-- Primary: the sentence assembles, your words vs the AI's connective glue -->
			<div
				class="flex items-stretch gap-2 overflow-hidden rounded-2xl border border-[var(--color-accent)]/50 bg-[var(--color-paper)] shadow-sm"
			>
				<button
					class="flex-1 px-5 py-6 text-left active:bg-[var(--color-accent)]/5"
					onclick={() => say(candidates[0])}
					aria-label={`Say: ${candidates[0]}`}
				>
					<span class="font-display text-3xl leading-snug tracking-tight">
						{#key candidates[0]}
							<AssembledSentence text={candidates[0]} {fragments} />
						{/key}
					</span>
				</button>
				<button
					class="flex w-14 shrink-0 items-center justify-center self-stretch border-l border-[var(--color-slate)]/15 text-xl text-[var(--color-slate)] active:bg-[var(--color-calm)]"
					onclick={() => reject(0)}
					aria-label={`Reject: ${candidates[0]}`}>✕</button
				>
			</div>

			{#if candidates.length > 1}
				<div class="alts mt-3">
					<p class="px-1 text-sm font-medium text-[var(--color-slate)]">Or did you mean…</p>
					<div class="mt-2 space-y-2">
						{#each candidates.slice(1) as c, i (i + 1)}
							<div
								class="flex items-stretch gap-2 overflow-hidden rounded-2xl border border-[var(--color-slate)]/15 bg-[var(--color-paper)] shadow-sm"
							>
								<button
									class="flex-1 px-5 py-4 text-left font-display text-xl leading-snug text-[var(--color-slate)] active:bg-[var(--color-accent)]/5"
									onclick={() => say(c)}
									aria-label={`Say: ${c}`}>{c}</button
								>
								<button
									class="flex w-14 shrink-0 items-center justify-center self-stretch border-l border-[var(--color-slate)]/15 text-xl text-[var(--color-slate)] active:bg-[var(--color-calm)]"
									onclick={() => reject(i + 1)}
									aria-label={`Reject: ${c}`}>✕</button
								>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<p class="mt-3 px-1 text-sm text-[var(--color-slate)]">
				Tap the one you mean — it speaks aloud.
			</p>
			{#if source === 'fallback'}
				<p class="mt-1 px-1 text-xs text-[var(--color-slate)]/70">
					Offline or no key, so this is a literal join, not full reconstruction.
				</p>
			{/if}
		{:else if spoken}
			<div class="rounded-2xl border border-[var(--color-go)]/30 bg-[var(--color-go)]/5 p-5">
				<p class="text-sm font-medium text-[var(--color-go-strong)]">
					Said aloud{spokenWithOwnVoice ? ' · in your voice' : ''}
				</p>
				<p class="mt-1 font-display text-2xl text-[var(--color-ink)]">{spoken}</p>
			</div>
		{/if}
	</div>

	<!-- The board -->
	<div class="mt-5 space-y-5">
		{#each board as group (group.title)}
			<section>
				<h2 class="mb-2 px-1 text-xs font-semibold tracking-wide text-[var(--color-slate)] uppercase">
					{group.title}
				</h2>
				<div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
					{#each group.words as word (word)}
						<button
							class="min-h-20 rounded-2xl border border-[var(--color-slate)]/15 bg-[var(--color-paper)] px-2 text-center text-lg font-medium text-[var(--color-ink)] shadow-sm transition active:scale-95 active:bg-[var(--color-accent)]/5 focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:outline-none"
							onclick={() => tap(word)}
						>
							{word}
						</button>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</div>

<style>
	/* The "reconstructing" signal: a single accent line sweeping once, on a loop,
	   while the model thinks. Meaningful motion, not a spinner. */
	.think {
		height: 3px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-accent) 18%, transparent);
		position: relative;
		overflow: hidden;
	}
	.think::after {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		width: 38%;
		border-radius: 999px;
		background: var(--color-accent);
		animation: sweep 1.05s cubic-bezier(0.45, 0, 0.55, 1) infinite;
	}
	@keyframes sweep {
		0% {
			transform: translateX(-110%);
		}
		100% {
			transform: translateX(360%);
		}
	}

	/* Alternatives rise in after the primary sentence has assembled. */
	.alts {
		animation: rise-soft 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
		animation-delay: 0.7s;
	}
	@keyframes rise-soft {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.think::after {
			animation: none;
			inset: 0;
			width: 100%;
			opacity: 0.5;
		}
		.alts {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
