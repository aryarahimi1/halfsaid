import { json, type Handle } from '@sveltejs/kit';

// Best-effort, per-IP rate limiting for the metered, unauthenticated endpoints
// that spend the owner's ElevenLabs credits (/api/speak) and voice slots
// (/api/voice). There is no user auth, so this caps abuse at the boundary.
//
// Caveat: this is in-memory. On a single long-lived Node process it's effective;
// on serverless (per-instance, resets on cold start) it's only a soft floor —
// back it with a shared KV / platform firewall for real production traffic.

const speakHits = new Map<string, number[]>();
const voiceHits = new Map<string, number[]>();

function tooMany(
	ip: string,
	max: number,
	windowMs: number,
	store: Map<string, number[]>
): boolean {
	const now = Date.now();
	const recent = (store.get(ip) ?? []).filter((t) => now - t < windowMs);
	recent.push(now);
	store.set(ip, recent);
	return recent.length > max;
}

export const handle: Handle = async ({ event, resolve }) => {
	if (event.request.method === 'POST') {
		const { pathname } = event.url;
		const ip = event.getClientAddress();
		if (pathname === '/api/speak' && tooMany(ip, 30, 60_000, speakHits)) {
			return json({ ok: false, reason: 'rate-limited' }, { status: 429 });
		}
		// Cloning is expensive and consumes a durable voice slot — keep it tight.
		if (pathname === '/api/voice' && tooMany(ip, 4, 60 * 60_000, voiceHits)) {
			return json({ ok: false, reason: 'rate-limited' }, { status: 429 });
		}
	}
	return resolve(event);
};
