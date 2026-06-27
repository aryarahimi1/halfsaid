import { json, type RequestHandler } from '@sveltejs/kit';
import { cloneVoice, hasElevenKey } from '$lib/server/elevenlabs';

// GET -> is voice cloning available (is a key configured)?
export const GET: RequestHandler = async () => json({ available: hasElevenKey() });

// POST multipart { file, name } -> clone an Instant Voice and return its id.
export const POST: RequestHandler = async ({ request }) => {
	if (!hasElevenKey()) return json({ ok: false, reason: 'no-key' });

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return json({ ok: false, reason: 'bad-request' }, { status: 400 });
	}

	// Consent must gate cloning at the boundary, not just in the client UI.
	if (form.get('consent') !== 'true') {
		return json({ ok: false, reason: 'no-consent' }, { status: 400 });
	}

	const file = form.get('file');
	const name = String(form.get('name') ?? 'My own voice')
		.replace(/[\r\n\t]+/g, ' ')
		.trim()
		.slice(0, 80);

	if (!(file instanceof File) || file.size === 0) {
		return json({ ok: false, reason: 'no-file' }, { status: 400 });
	}
	if (file.size > 15 * 1024 * 1024) {
		return json({ ok: false, reason: 'too-large' }, { status: 413 });
	}

	const result = await cloneVoice(name || 'My own voice', file);
	if (result.error) return json({ ok: false, reason: result.error });
	return json({ ok: true, voiceId: result.voiceId });
};
