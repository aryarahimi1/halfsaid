import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { reconstruct, type ReconstructInput } from '$lib/server/reconstruct';

export const POST: RequestHandler = async ({ request }) => {
	let body: ReconstructInput;
	try {
		body = await request.json();
	} catch {
		return json({ candidates: [], source: 'fallback', error: 'bad request' }, { status: 400 });
	}

	if (!Array.isArray(body.fragments)) {
		return json({ candidates: [], source: 'fallback', error: 'fragments required' }, { status: 400 });
	}

	const result = await reconstruct(
		{
			fragments: body.fragments.map((f) => String(f)).slice(0, 12),
			partnerContext: body.partnerContext ? String(body.partnerContext).slice(0, 300) : undefined,
			phrasebook: body.phrasebook
		},
		env.OPENROUTER_API_KEY
	);

	return json(result);
};
