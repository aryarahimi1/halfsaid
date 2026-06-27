<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { profileStore } from '$lib/profile.svelte';
	import { speak, initBrowserVoice } from '$lib/voice';

	let available = $state(false); // is voice cloning configured (ElevenLabs key present)?
	let file = $state<File | null>(null);
	let consent = $state(false);
	let status = $state<'idle' | 'cloning' | 'error' | 'done'>('idle');
	let errorMsg = $state('');
	let sampling = $state(false);

	const voice = $derived(profileStore.active?.voice ?? null);
	const isCloned = $derived(voice?.kind === 'cloned');
	// A clone exists even if currently using the device voice — lets them toggle back.
	const savedVoiceId = $derived(voice?.elevenLabsVoiceId ?? null);
	const canClone = $derived(available && !!file && consent && status !== 'cloning');

	onMount(async () => {
		profileStore.load();
		profileStore.ensureProfile();
		initBrowserVoice();
		try {
			const res = await fetch('/api/voice');
			const data = await res.json();
			available = !!data.available;
		} catch {
			available = false;
		}
	});

	function onFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		file = input.files?.[0] ?? null;
		status = 'idle';
		errorMsg = '';
	}

	// Keep the cloned voice id + consent when switching to the device voice, so the
	// person can toggle back without paying for another clone (a new ElevenLabs slot).
	function useDefault() {
		profileStore.updateActive((p) => {
			p.voice = p.voice
				? { ...p.voice, kind: 'system', label: 'Default voice' }
				: { kind: 'system', label: 'Default voice' };
		});
		status = 'idle';
	}

	function reactivateOwnVoice() {
		profileStore.updateActive((p) => {
			if (p.voice?.elevenLabsVoiceId) {
				p.voice = { ...p.voice, kind: 'cloned', label: 'My own voice' };
			}
		});
	}

	async function submitClone() {
		if (!canClone || !file) return;
		status = 'cloning';
		errorMsg = '';
		try {
			const form = new FormData();
			form.append('file', file);
			form.append('name', (profileStore.active?.name?.trim() || 'My') + ' — own voice');
			form.append('consent', String(consent));
			const res = await fetch('/api/voice', { method: 'POST', body: form });
			const data = await res.json();
			if (data.ok && data.voiceId) {
				profileStore.updateActive((p) => {
					p.voice = {
						kind: 'cloned',
						label: 'My own voice',
						elevenLabsVoiceId: data.voiceId,
						consentGiven: consent
					};
				});
				status = 'done';
			} else {
				status = 'error';
				errorMsg =
					data.reason === 'no-key'
						? 'Voice cloning is not turned on yet.'
						: 'That clip could not be used. Try a clear 30–60 second recording.';
			}
		} catch {
			status = 'error';
			errorMsg = 'Something went wrong. Your device voice still works.';
		}
	}

	async function sample() {
		if (sampling) return; // debounce: ignore taps during the network round-trip
		sampling = true;
		try {
			await speak('This is my voice. I can say what I mean.', profileStore.active?.voice);
		} finally {
			sampling = false;
		}
	}
</script>

<div class="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pt-4 pb-10">
	<div class="flex items-center justify-end">
		<button
			type="button"
			class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-lg text-[var(--color-slate)] active:scale-95"
			onclick={() => goto('/')}
			aria-label="Close">✕</button
		>
	</div>

	<h1 class="font-display text-2xl leading-tight font-bold text-[var(--color-ink)]">Your voice</h1>
	<p class="mt-2 text-[var(--color-slate)]">
		Choose how your sentences sound. You can use the device voice, or — for someone who has lost
		their speech — speak again in their own voice, rebuilt from an old recording.
	</p>

	<!-- Current voice -->
	<div
		class="mt-5 flex items-center justify-between rounded-2xl border border-[var(--color-slate)]/15 bg-[var(--color-paper)] px-4 py-4 shadow-sm"
	>
		<div>
			<p class="text-sm font-medium text-[var(--color-slate)]">Speaking with</p>
			<p class="text-lg text-[var(--color-ink)]">
				{isCloned ? 'Your own voice' : 'The device voice'}
			</p>
		</div>
		<button
			type="button"
			class="min-h-11 rounded-xl border border-[var(--color-slate)]/25 px-4 text-[var(--color-slate)] active:scale-95 disabled:opacity-50"
			onclick={sample}
			disabled={sampling}
			aria-busy={sampling}>{sampling ? 'Playing…' : 'Hear a sample'}</button
		>
	</div>

	<p class="sr-only" aria-live="polite">{sampling ? 'Playing a sample of your voice.' : ''}</p>

	<!-- Option: default -->
	<button
		type="button"
		class="mt-3 w-full rounded-2xl border px-4 py-4 text-left active:scale-[0.99] {!isCloned
			? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/5'
			: 'border-[var(--color-slate)]/15 bg-[var(--color-paper)]'}"
		onclick={useDefault}
	>
		<span class="block text-lg font-medium text-[var(--color-ink)]">Use the device voice</span>
		<span class="block text-sm text-[var(--color-slate)]">Always available. Nothing to set up.</span>
	</button>

	{#if savedVoiceId && !isCloned}
		<button
			type="button"
			class="mt-3 w-full rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-paper)] px-4 py-4 text-left active:scale-[0.99]"
			onclick={reactivateOwnVoice}
		>
			<span class="block text-lg font-medium text-[var(--color-ink)]">Use my own voice</span>
			<span class="block text-sm text-[var(--color-slate)]"
				>Switch back to the voice you restored — no need to redo it.</span
			>
		</button>
	{/if}

	<!-- Option: own voice -->
	<div class="mt-3 rounded-2xl border border-[var(--color-slate)]/15 bg-[var(--color-paper)] p-4">
		<p class="text-lg font-medium text-[var(--color-ink)]">Speak in your own voice</p>
		<p class="mt-1 text-sm text-[var(--color-slate)]">
			Upload a short, clear recording — even an old home video's audio works. We rebuild the voice
			so your sentences sound like you.
		</p>

		{#if !available}
			<p class="mt-3 rounded-xl bg-[var(--color-calm)] px-3 py-2 text-sm text-[var(--color-slate)]">
				Voice cloning isn't turned on in this build yet — the device voice works now. (Add an
				ElevenLabs key to enable it.)
			</p>
		{:else}
			<label class="mt-4 block">
				<span class="mb-1 block text-sm font-medium text-[var(--color-slate)]"
					>A 30–60 second audio clip</span
				>
				<input
					type="file"
					accept="audio/*"
					class="block w-full text-[var(--color-ink)] file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-[var(--color-calm)] file:px-4 file:text-[var(--color-ink)]"
					onchange={onFile}
				/>
			</label>

			<label class="mt-4 flex items-start gap-3">
				<input type="checkbox" class="mt-1 h-5 w-5" bind:checked={consent} />
				<span class="text-sm text-[var(--color-slate)]">
					I have the right to use this voice, and I consent to recreating it. (Cloning someone's
					voice without their permission is not allowed.)
				</span>
			</label>

			<button
				type="button"
				class="mt-4 min-h-14 w-full rounded-xl bg-[var(--color-accent)] px-4 py-3 text-lg font-semibold text-white active:scale-[0.98] disabled:opacity-40"
				onclick={submitClone}
				disabled={!canClone}
			>
				{status === 'cloning' ? 'Rebuilding your voice…' : 'Restore my voice'}
			</button>

			{#if (!file || !consent) && status !== 'cloning'}
				<p role="status" class="mt-2 text-sm text-[var(--color-slate)]">
					Add a clip and check the box to continue.
				</p>
			{/if}

			{#if status === 'done'}
				<p
					class="mt-3 rounded-xl bg-[var(--color-go)]/10 px-3 py-2 text-sm text-[var(--color-go-strong)]"
				>
					Done — your sentences now speak in your own voice. Tap “Hear a sample”.
				</p>
			{:else if status === 'error'}
				<p class="mt-3 rounded-xl bg-[var(--color-calm)] px-3 py-2 text-sm text-[var(--color-slate)]">
					{errorMsg}
				</p>
			{/if}
		{/if}
	</div>

	<button
		type="button"
		class="mt-6 min-h-14 w-full rounded-xl bg-[var(--color-accent)] px-4 py-3 text-lg font-semibold text-white active:scale-[0.98]"
		onclick={() => goto('/')}>Done</button
	>
</div>
