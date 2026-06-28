// Client-side speaking. One entry point — speak() — that uses the person's
// cloned ElevenLabs voice when they have one, and otherwise the browser's
// built-in voice. Every path degrades gracefully: a failed/credential-less
// cloned-voice request silently falls back to the device voice.
//
// Returns true only when the person's OWN (cloned) voice actually spoke, so the
// UI never claims "in your voice" for a silent fallback to the device voice.

import { browser } from '$app/environment';
import type { VoicePersona } from './profile';
import { API_BASE } from './api';

let cachedVoice: SpeechSynthesisVoice | null = null;

// A single reused <audio> element for cloned playback. Reusing one element lets
// us (a) "unlock" it inside the tap on iOS — playback must originate from a user
// gesture, but our cloned audio only arrives after an async fetch, so we prime
// the element with a hair of silence synchronously in the gesture, then swap in
// the real clip; and (b) interrupt an in-flight clip so taps don't overlap.
let clonedAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;
let silentSrc: string | null = null;

function pickBrowserVoice(): SpeechSynthesisVoice | null {
	if (!browser || !('speechSynthesis' in window)) return null;
	const voices = window.speechSynthesis.getVoices();
	return (
		voices.find((v) => v.lang.startsWith('en') && /natural|premium|enhanced/i.test(v.name)) ??
		voices.find((v) => v.lang.startsWith('en')) ??
		voices[0] ??
		null
	);
}

/** Call once on mount so a voice is ready (voices load async in some browsers). */
export function initBrowserVoice(): void {
	if (!browser || !('speechSynthesis' in window)) return;
	cachedVoice = pickBrowserVoice();
	window.speechSynthesis.onvoiceschanged = () => {
		cachedVoice = pickBrowserVoice();
	};
}

function revokeActive(): void {
	if (activeUrl) {
		URL.revokeObjectURL(activeUrl);
		activeUrl = null;
	}
}

function stopCloned(): void {
	clonedAudio?.pause();
	revokeActive();
}

// A tiny valid silent WAV, built deterministically — used only to bless the
// reused audio element during a user gesture (no external asset to ship).
function silentWavDataUri(): string {
	const samples = 8; // ~1ms at 8kHz
	const buf = new ArrayBuffer(44 + samples);
	const view = new DataView(buf);
	const w = (off: number, s: string) => {
		for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
	};
	w(0, 'RIFF');
	view.setUint32(4, 36 + samples, true);
	w(8, 'WAVE');
	w(12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true); // PCM
	view.setUint16(22, 1, true); // mono
	view.setUint32(24, 8000, true); // sample rate
	view.setUint32(28, 8000, true); // byte rate
	view.setUint16(32, 1, true); // block align
	view.setUint16(34, 8, true); // bits per sample
	w(36, 'data');
	view.setUint32(40, samples, true);
	for (let i = 0; i < samples; i++) view.setUint8(44 + i, 128); // 128 = silence (unsigned 8-bit)
	let bin = '';
	const bytes = new Uint8Array(buf);
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return 'data:audio/wav;base64,' + btoa(bin);
}

function ensureClonedAudio(): HTMLAudioElement {
	if (!clonedAudio) {
		clonedAudio = new Audio();
		// Free the object URL on every natural terminal state.
		clonedAudio.addEventListener('ended', revokeActive);
		clonedAudio.addEventListener('error', revokeActive);
	}
	return clonedAudio;
}

function speakBrowser(text: string): void {
	if (!browser || !('speechSynthesis' in window)) return;
	stopCloned(); // a cloned clip and the browser voice must not overlap
	window.speechSynthesis.cancel();
	const u = new SpeechSynthesisUtterance(text);
	const voice = cachedVoice ?? pickBrowserVoice();
	if (voice) u.voice = voice;
	u.rate = 0.96;
	u.pitch = 1;
	window.speechSynthesis.speak(u);
}

async function speakCloned(text: string, voiceId: string): Promise<boolean> {
	if (!browser) return false;
	const audio = ensureClonedAudio();

	// Unlock the element WITHIN the user gesture — this runs before the first
	// await, so iOS Safari grants the later play() on the swapped-in real clip.
	if (!silentSrc) silentSrc = silentWavDataUri();
	audio.muted = true;
	audio.src = silentSrc;
	void audio.play().catch(() => {});

	try {
		const res = await fetch(`${API_BASE}/api/speak`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text, voiceId })
		});
		if (!res.ok) return false;
		const type = res.headers.get('content-type') ?? '';
		if (!type.includes('audio')) return false; // server signalled fallback via JSON
		const blob = await res.blob();

		// Interrupt anything in flight (prior clip + any browser TTS), free its URL,
		// then play the real audio in the now-unlocked element.
		if ('speechSynthesis' in window) window.speechSynthesis.cancel();
		audio.pause();
		revokeActive();
		const url = URL.createObjectURL(blob);
		activeUrl = url;
		audio.muted = false;
		audio.src = url;
		await audio.play();
		return true;
	} catch {
		revokeActive(); // play() rejected (e.g. autoplay) or fetch failed — no leak
		return false;
	}
}

/** Speak `text`, in the person's own voice when set, else the device voice.
 *  Returns true only if the cloned (own) voice actually played. */
export async function speak(text: string, voice?: VoicePersona | null): Promise<boolean> {
	if (voice?.kind === 'cloned' && voice.elevenLabsVoiceId) {
		const ok = await speakCloned(text, voice.elevenLabsVoiceId);
		if (ok) return true;
	}
	speakBrowser(text);
	return false;
}
