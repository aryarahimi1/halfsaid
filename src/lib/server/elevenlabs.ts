// Own-voice — the emotional centerpiece. ElevenLabs turns a chosen voice (or a
// voice cloned from an old clip, from before the stroke) into the sound of the
// sentence. Entirely key-optional: with no ELEVENLABS_API_KEY the app falls back
// to the browser's built-in voice, the same way the Claude path degrades.

import { env } from '$env/dynamic/private';

const BASE = 'https://api.elevenlabs.io/v1';
// Flash model — ElevenLabs' lowest-latency model (~75ms) and their recommended
// choice over the now-deprecated Turbo line; the right tradeoff for a
// tap-to-speak AAC board.
const TTS_MODEL = 'eleven_flash_v2_5';

export function hasElevenKey(): boolean {
	return !!env.ELEVENLABS_API_KEY;
}

/** Synthesize `text` in the given ElevenLabs voice. Returns the audio bytes, or
 *  null on any failure (no key, bad voice, API error) so the caller can fall back. */
export async function tts(text: string, voiceId: string): Promise<ArrayBuffer | null> {
	const key = env.ELEVENLABS_API_KEY;
	if (!key) return null;
	try {
		const res = await fetch(`${BASE}/text-to-speech/${encodeURIComponent(voiceId)}`, {
			method: 'POST',
			headers: {
				'xi-api-key': key,
				'content-type': 'application/json',
				accept: 'audio/mpeg'
			},
			body: JSON.stringify({
				text,
				model_id: TTS_MODEL,
				voice_settings: { stability: 0.5, similarity_boost: 0.75 }
			})
		});
		if (!res.ok) {
			console.error(`[elevenlabs] tts failed ${res.status}`);
			return null;
		}
		return await res.arrayBuffer();
	} catch (e) {
		console.error('[elevenlabs] tts error', e);
		return null;
	}
}

export interface CloneResult {
	voiceId?: string;
	// Coarse code only — never upstream/exception text (don't leak internals to
	// an unauthenticated client). 'no-key' stays distinct so the UI can special-case it.
	error?: 'no-key' | 'clone-failed';
}

/** Instant Voice Clone from one short audio sample. Note: ElevenLabs requires a
 *  paid plan for voice cloning, so this can legitimately fail with a clear error
 *  even when a key is present — the UI surfaces that and keeps the browser voice. */
export async function cloneVoice(name: string, file: File): Promise<CloneResult> {
	const key = env.ELEVENLABS_API_KEY;
	if (!key) return { error: 'no-key' };
	try {
		const form = new FormData();
		form.append('name', name);
		form.append('files', file, file.name || 'sample.mp3');
		// Clean up the sample so an old home-video clip clones better.
		form.append('remove_background_noise', 'true');

		// Do NOT set Content-Type — fetch sets the multipart boundary itself.
		const res = await fetch(`${BASE}/voices/add`, {
			method: 'POST',
			headers: { 'xi-api-key': key },
			body: form
		});
		if (!res.ok) {
			const detail = await res.text().catch(() => '');
			console.error(`[elevenlabs] clone failed ${res.status}: ${detail.slice(0, 200)}`);
			return { error: 'clone-failed' };
		}
		const data = (await res.json()) as { voice_id?: string };
		return data.voice_id ? { voiceId: data.voice_id } : { error: 'clone-failed' };
	} catch (e) {
		console.error('[elevenlabs] clone error', e);
		return { error: 'clone-failed' };
	}
}
