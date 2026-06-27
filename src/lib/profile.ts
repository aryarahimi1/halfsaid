// Halfsaid — the person behind the words.
//
// The board (aac.ts) is the SAME small core vocabulary for everyone. What makes
// Halfsaid personal is the Profile: who this person is, who is around them, and
// how THEY actually communicate. Two very different people share one engine — a
// stroke/aphasia survivor and a minimally-verbal autistic person — so the model
// carries only fields that earn their place for BOTH: identity, the specific
// people in their life, daily rhythm, what they need and like, and the quirks
// of how they say yes/no and what their words mean.
//
// Two layers, on purpose:
//   • Profile  — the rich, on-device record. Edited by a caregiver. Never sent
//                wholesale to the model.
//   • toPhrasebook(profile) — a lean, flattened projection sent to the
//                reconstruction engine PURELY as disambiguation DATA. Treat it
//                as untrusted text, never instructions (reconstruct.ts already
//                frames the phrasebook "for disambiguation only").

import type { Phrasebook, TileGroup } from './aac';

/** Bumped only on a breaking change to the stored shape. Drives migration. */
export const PROFILE_SCHEMA_VERSION = 1;

export type UserClass = 'aphasia' | 'autistic' | 'other';
export type AgeBand = 'child' | 'teen' | 'adult';
export type TimeOfDay = 'morning' | 'midday' | 'evening' | 'night' | 'anytime';

/** Someone in the person's life. Name + relationship disambiguates references
 *  ("my daughter") and seeds a familiar name tile on the board. */
export interface Person {
	name: string; // "Sarah"
	relationship: string; // "daughter", "nurse", "support worker"
	alias?: string; // how the user actually refers to them, if different
}

/** A recurring event. Helps the model read "again / more / now" correctly. */
export interface Routine {
	label: string; // "morning medicine", "snack after school"
	when?: TimeOfDay;
}

/** How THIS person communicates — the most aphasia/autism-specific part of the
 *  model and the highest-value disambiguation signal: their words do not always
 *  mean the dictionary thing. */
export interface CommunicationStyle {
	/** Their word for yes, if not "yes" (e.g. "uh-huh", "okay", "good"). */
	yesWord?: string;
	/** Their word for no (e.g. "stop", "all done"). */
	noWord?: string;
	/** Idiosyncratic word meanings, as plain notes:
	 *  "'hot' usually means too much / overwhelmed", "'go' means I'm finished". */
	quirks?: string[];
}

/** Phase 3 forward slot. Inert today — no audio is stored on device. A cloned
 *  voice lives on ElevenLabs and is referenced here only by id + consent. */
export interface VoicePersona {
	kind: 'system' | 'cloned';
	label?: string; // "My own voice"
	elevenLabsVoiceId?: string; // set in Phase 3
	consentGiven?: boolean; // cloning a real person's voice requires consent
}

export interface Profile {
	id: string;
	createdAt: number;
	updatedAt: number;

	// Identity — whose "I" the sentences speak in.
	name: string;
	pronouns?: string; // free text: "she/her", "they/them"
	userClass?: UserClass; // tunes register + which onboarding hints to show
	ageBand?: AgeBand; // coarse register hint (a child speaks unlike an adult)

	// Their world.
	people: Person[];
	routines: Routine[];
	places: string[]; // "home", "the day program", "Lee Street"
	commonNeeds: string[]; // "water", "the bathroom", "to rest"
	likes: string[]; // favorites / special interests: "tea", "trains", "the garden"
	signals: string[]; // "it's too loud", "I need a break" — regulation / distress flags

	// How they communicate.
	communication: CommunicationStyle;

	// Board personalization (stays on device, never sent to the model).
	extraTiles: string[]; // caregiver-pinned words: a pet's name, a favorite food

	// Phase 3.
	voice?: VoicePersona;
}

/** What crosses the wire to the reconstruction engine. All disambiguation
 *  fields (likes, signals, notes, …) now live on the base Phrasebook contract in
 *  aac.ts, so this is just an alias kept for call-site readability. DATA, never
 *  instructions. */
export type ReconstructionPhrasebook = Phrasebook;

/** On-disk envelope. A single key holds all profiles + which one is active, so
 *  one profile today and several later use the same storage with no migration. */
export interface ProfileStore {
	schemaVersion: number;
	activeProfileId: string | null;
	profiles: Profile[];
	/** Did the person dismiss the first-run "set me up" nudge? Stops it nagging. */
	onboardingDismissed: boolean;
}

// ── construction ────────────────────────────────────────────────────────────

function uid(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
	return 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** A fresh, empty profile. Onboarding fills it in; every field is skippable. */
export function blankProfile(seed: Partial<Profile> = {}): Profile {
	const now = Date.now();
	return {
		id: uid(),
		createdAt: now,
		updatedAt: now,
		name: '',
		people: [],
		routines: [],
		places: [],
		commonNeeds: [],
		likes: [],
		signals: [],
		communication: {},
		extraTiles: [],
		...seed
	};
}

export function emptyStore(): ProfileStore {
	return {
		schemaVersion: PROFILE_SCHEMA_VERSION,
		activeProfileId: null,
		profiles: [],
		onboardingDismissed: false
	};
}

// ── projection to the model ─────────────────────────────────────────────────

const cap = <T>(xs: T[], n = 12): T[] => xs.slice(0, n);
const clean = (xs: (string | undefined)[]): string[] =>
	xs.map((s) => (s ?? '').trim()).filter(Boolean);

/** Project the rich Profile down to the lean, flattened phrasebook the model
 *  sees. People become "my daughter Sarah"; routines fold in their time; quirks
 *  and yes/no idiosyncrasies become plain notes. Disambiguation DATA only — the
 *  reconstruction engine renders this under a "for disambiguation only" header
 *  and is instructed it is a bridge, not an author. */
export function toPhrasebook(p: Profile | null): ReconstructionPhrasebook {
	if (!p) return {};

	// Name-first label: the bare name stays the tile/fragment, the relationship is
	// an inert parenthetical that labels the SAME referent — never a new person.
	const people = clean(
		p.people.map((person) => {
			const nm = (person.alias || person.name).trim();
			const rel = person.relationship.trim();
			if (nm && rel) return `${nm} (${rel})`;
			if (nm) return nm;
			return rel ? `my ${rel}` : '';
		})
	);

	const routines = clean(
		p.routines.map((r) => (r.when && r.when !== 'anytime' ? `${r.label} (${r.when})` : r.label))
	);

	const notes: string[] = [];
	const c = p.communication;
	if (c.yesWord?.trim()) notes.push(`their word for "yes" is "${c.yesWord.trim()}"`);
	if (c.noWord?.trim()) notes.push(`their word for "no" is "${c.noWord.trim()}"`);
	notes.push(...clean(c.quirks ?? []));

	const pb: ReconstructionPhrasebook = {};
	if (p.name.trim()) pb.name = p.name.trim();
	if (p.pronouns?.trim()) pb.pronouns = p.pronouns.trim();
	if (people.length) pb.people = cap(people);
	if (routines.length) pb.routines = cap(routines);

	const places = cap(clean(p.places));
	if (places.length) pb.places = places;
	const needs = cap(clean(p.commonNeeds));
	if (needs.length) pb.commonNeeds = needs;
	const likes = cap(clean(p.likes));
	if (likes.length) pb.likes = likes;
	const signals = cap(clean(p.signals));
	if (signals.length) pb.signals = signals;
	if (notes.length) pb.notes = cap(notes);

	return pb;
}

/** Personal tiles derived from the profile, appended after the core board. Kept
 *  SMALL on purpose — a few familiar taps, not a grid to hunt through. */
export function customTiles(p: Profile | null): TileGroup[] {
	if (!p) return [];
	const groups: TileGroup[] = [];

	const people = clean(p.people.map((x) => x.alias || x.name)).slice(0, 8);
	if (people.length) groups.push({ title: 'My people', words: people });

	const favorites = clean([...p.likes, ...p.extraTiles]).slice(0, 8);
	if (favorites.length) groups.push({ title: 'Favorites', words: favorites });

	const needs = clean([...p.commonNeeds, ...p.signals]).slice(0, 8);
	if (needs.length) groups.push({ title: 'My needs', words: needs });

	return groups;
}

// ── migration / hardening ───────────────────────────────────────────────────

function isProfile(x: unknown): x is Profile {
	return !!x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string';
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strArr = (v: unknown): string[] =>
	Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [];

const USER_CLASSES: readonly string[] = ['aphasia', 'autistic', 'other'];
const AGE_BANDS: readonly string[] = ['child', 'teen', 'adult'];
const TIMES: readonly string[] = ['morning', 'midday', 'evening', 'night', 'anytime'];

function normalizePerson(p: unknown): Person | null {
	if (!p || typeof p !== 'object') return null;
	const o = p as Record<string, unknown>;
	const person: Person = { name: str(o.name), relationship: str(o.relationship) };
	if (typeof o.alias === 'string') person.alias = o.alias;
	return person;
}

function normalizeRoutine(r: unknown): Routine | null {
	if (!r || typeof r !== 'object') return null;
	const o = r as Record<string, unknown>;
	const routine: Routine = { label: str(o.label) };
	if (typeof o.when === 'string' && TIMES.includes(o.when)) routine.when = o.when as TimeOfDay;
	return routine;
}

function normalizeCommunication(c: unknown): CommunicationStyle {
	if (!c || typeof c !== 'object') return {};
	const o = c as Record<string, unknown>;
	const out: CommunicationStyle = { quirks: strArr(o.quirks) };
	if (typeof o.yesWord === 'string') out.yesWord = o.yesWord;
	if (typeof o.noWord === 'string') out.noWord = o.noWord;
	return out;
}

/** Backfill AND coerce every field so a partial, corrupt, hand-edited, or
 *  foreign-written profile can never crash the UI — bad scalars and bad array
 *  elements are replaced, not trusted. Keeps `...x` so forward-only fields (e.g.
 *  `voice`) survive, then OVERRIDES every typed field after the spread. */
function normalizeProfile(x: Profile): Profile {
	const base = blankProfile();
	const o = x as unknown as Record<string, unknown>;
	return {
		...base,
		...x,
		id: typeof o.id === 'string' && o.id ? o.id : base.id,
		createdAt: typeof o.createdAt === 'number' ? o.createdAt : base.createdAt,
		updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : base.updatedAt,
		name: str(o.name),
		pronouns: typeof o.pronouns === 'string' ? o.pronouns : undefined,
		userClass: USER_CLASSES.includes(o.userClass as string)
			? (o.userClass as UserClass)
			: undefined,
		ageBand: AGE_BANDS.includes(o.ageBand as string) ? (o.ageBand as AgeBand) : undefined,
		people: Array.isArray(o.people)
			? o.people.map(normalizePerson).filter((p): p is Person => p !== null)
			: [],
		routines: Array.isArray(o.routines)
			? o.routines.map(normalizeRoutine).filter((r): r is Routine => r !== null)
			: [],
		places: strArr(o.places),
		commonNeeds: strArr(o.commonNeeds),
		likes: strArr(o.likes),
		signals: strArr(o.signals),
		extraTiles: strArr(o.extraTiles),
		communication: normalizeCommunication(o.communication)
	};
}

/** Defensive forward-migration. localStorage can be empty, corrupted, or written
 *  by an older build — always return a valid store, never throw. Future breaking
 *  changes add cases here keyed off the envelope's `schemaVersion`. */
export function migrate(raw: unknown): ProfileStore {
	if (!raw || typeof raw !== 'object') return emptyStore();
	const r = raw as Record<string, unknown>;

	const profiles = (Array.isArray(r.profiles) ? r.profiles : [])
		.filter(isProfile)
		.map(normalizeProfile);

	let activeProfileId = typeof r.activeProfileId === 'string' ? r.activeProfileId : null;
	if (activeProfileId && !profiles.some((p) => p.id === activeProfileId)) activeProfileId = null;
	if (!activeProfileId && profiles.length) activeProfileId = profiles[0].id;

	return {
		schemaVersion: PROFILE_SCHEMA_VERSION,
		activeProfileId,
		profiles,
		onboardingDismissed: typeof r.onboardingDismissed === 'boolean' ? r.onboardingDismissed : false
	};
}
