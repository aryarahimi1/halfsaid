// Halfsaid — the words the person already has, and who they are.
// The tile board is intentionally small and high-frequency: AAC "core words"
// plus a few fringe nouns. The point is not a giant grid to hunt through — it's
// a few taps the AI expands into the sentence they already mean.

export interface TileGroup {
	title: string;
	words: string[];
}

export const TILE_GROUPS: TileGroup[] = [
	{
		title: 'Core',
		words: ['I', 'you', 'want', 'need', 'more', 'stop', 'go', 'like', 'help', "don't"]
	},
	{
		title: 'Feeling',
		words: ['happy', 'tired', 'hurt', 'scared', 'okay', 'love', 'cold', 'hot']
	},
	{
		title: 'Needs',
		words: ['water', 'food', 'cup', 'bathroom', 'medicine', 'blanket', 'rest', 'home']
	},
	{
		title: 'People & social',
		words: ['yes', 'no', 'please', 'thank you', 'mom', 'see you', 'now', 'later']
	}
];

// The disambiguation-relevant projection of a Profile — the contract the server
// reconstruction engine receives. DATA, never instructions. `people` are
// pre-flattened labels ("Sarah (daughter)") — the bare name is the tile/fragment,
// the parenthetical is an inert label, never a new referent.
export interface Phrasebook {
	name?: string;
	pronouns?: string;
	people?: string[]; // ["Sarah (daughter)", "Alex (nurse)"]
	places?: string[]; // ["home", "the day program", "Lee Street"]
	routines?: string[]; // ["morning medicine (morning)"]
	commonNeeds?: string[]; // ["water", "the bathroom", "to rest"]
	likes?: string[]; // favorites / special interests: ["Bluey", "trains"]
	signals?: string[]; // distress flags: ["it's too loud", "I need a break"]
	notes?: string[]; // communication quirks + yes/no idiosyncrasies (highest injection surface)
}

/** Slot the profile's personal groups immediately AFTER Core (the grammatical
 *  glue every sentence needs) and BEFORE the remaining defaults, deduping any
 *  personal word that already exists on the base board (so "water" never appears
 *  twice). Empty personal input → the untouched default board. */
export function composeBoard(personal: TileGroup[], base: TileGroup[] = TILE_GROUPS): TileGroup[] {
	if (!personal.length) return base;
	const seen = new Set(base.flatMap((g) => g.words.map((w) => w.toLowerCase())));
	const cleaned: TileGroup[] = [];
	for (const g of personal) {
		const words: string[] = [];
		for (const raw of g.words) {
			const w = raw.trim();
			const key = w.toLowerCase();
			if (!w || seen.has(key)) continue;
			seen.add(key);
			words.push(w);
		}
		if (words.length) cleaned.push({ title: g.title, words });
	}
	if (!cleaned.length) return base;
	const [core, ...rest] = base;
	return [core, ...cleaned, ...rest];
}
