import { json, type RequestHandler } from '@sveltejs/kit';
import { tts, hasElevenKey } from '$lib/server/elevenlabs';

// POST { text, voiceId } -> audio/mpeg. If no key or synthesis fails, returns a
// small JSON { ok:false } (200) so the client cleanly falls back to the browser voice.
export const POST: RequestHandler = async ({ request }) => {
	if (!hasElevenKey()) return json({ ok: false, reason: 'no-key' });

	let body: { text?: unknown; voiceId?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ ok: false, reason: 'bad-request' }, { status: 400 });
	}

	const text = String(body.text ?? '').slice(0, 1000);
	const voiceId = String(body.voiceId ?? '');
	if (!text || !voiceId) return json({ ok: false, reason: 'missing' }, { status: 400 });

	const audio = await tts(text, voiceId);
	if (!audio) return json({ ok: false, reason: 'tts-failed' });

	return new Response(audio, {
		headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' }
	});
};
