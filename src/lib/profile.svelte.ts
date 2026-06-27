// Halfsaid — the active-profile store. Client-only, on-device, SSR-safe.
//
// Storage choice: localStorage, deliberately. The whole dataset is one (later a
// few) small JSON documents — kilobytes, no blobs, no queries. Phase 3 voice is
// an ElevenLabs voice *id*, not audio, so nothing large ever lands here.
// localStorage's synchronous get/set is a feature: we read once on mount with no
// async flash and write the whole envelope on change. IndexedDB's async API,
// transactions and cursors would buy us nothing at this size — we would only
// reach for it if we stored audio or large datasets.
//
// SSR safety: this module is imported during SSR too, so it touches NO browser
// API at import time. State initializes to empty defaults (matching the
// server-rendered markup); the browser calls load() from onMount, the only place
// localStorage is read. The first client render therefore equals the SSR render
// (no hydration mismatch), then personal data fills in reactively after mount.
//
// Runes idioms used here:
//   • A factory returns an object of GETTERS, not the raw `$state` bindings — a
//     re-exported `let x = $state()` loses reactivity across the import boundary,
//     getters re-read it on every access and stay live.
//   • Persistence is explicit (every mutator ends in persist()) rather than a
//     module-level `$effect` — top-level `$effect` has no owner outside a
//     component and would not run. Explicit save is also more predictable.

import { browser } from '$app/environment';
import {
	blankProfile,
	customTiles,
	migrate,
	toPhrasebook,
	PROFILE_SCHEMA_VERSION,
	type Profile,
	type ProfileStore,
	type ReconstructionPhrasebook
} from './profile';
import type { TileGroup } from './aac';

const KEY = 'halfsaid:profiles';

function createProfileStore() {
	let profiles = $state<Profile[]>([]);
	let activeId = $state<string | null>(null);
	let loaded = $state(false);
	let dismissed = $state(false);

	const active = $derived<Profile | null>(profiles.find((p) => p.id === activeId) ?? null);
	const phrasebook = $derived<ReconstructionPhrasebook>(toPhrasebook(active));
	const tiles = $derived<TileGroup[]>(customTiles(active));

	// "Has the person actually told us anything yet?" — drives whether the board
	// personalizes and whether the first-run nudge shows. Tied to the SAME
	// projection that is sent to the model (plus board-only extraTiles) so the
	// predicate can never disagree with the payload: anything that would reach the
	// model (name, pronouns, people, routines, places, needs, likes, signals,
	// communication notes) counts as set-up; an entirely blank profile does not.
	const exists = $derived<boolean>(
		Object.keys(phrasebook).length > 0 || (active?.extraTiles.length ?? 0) > 0
	);

	function persist() {
		if (!browser) return;
		const data: ProfileStore = {
			schemaVersion: PROFILE_SCHEMA_VERSION,
			activeProfileId: activeId,
			// snapshot() unwraps the reactive proxy to a plain, JSON-clean object.
			profiles: $state.snapshot(profiles) as Profile[],
			onboardingDismissed: dismissed
		};
		try {
			localStorage.setItem(KEY, JSON.stringify(data));
		} catch {
			// Private mode / quota exceeded — degrade to in-memory, never crash the board.
		}
	}

	/** Read + migrate persisted state. Call once from onMount (browser-only).
	 *  Idempotent and self-guarding, so it is safe to call from anywhere. */
	function load() {
		if (!browser || loaded) return;
		let parsed: unknown = null;
		try {
			const raw = localStorage.getItem(KEY);
			parsed = raw ? JSON.parse(raw) : null;
		} catch {
			parsed = null;
		}
		const store = migrate(parsed);
		profiles = store.profiles;
		activeId = store.activeProfileId;
		dismissed = store.onboardingDismissed;
		loaded = true;
	}

	/** Mutate the active profile in place (it is a deep-reactive proxy, so nested
	 *  pushes/edits trigger updates), stamp updatedAt, then persist. */
	function updateActive(mutate: (p: Profile) => void) {
		const p = profiles.find((x) => x.id === activeId);
		if (!p) return;
		mutate(p);
		p.updatedAt = Date.now();
		persist();
	}

	/** Replace the active profile wholesale — powers the onboarding draft autosave
	 *  (the wizard edits a cloned draft, then writes it back here). */
	function saveActive(next: Profile) {
		const i = profiles.findIndex((x) => x.id === next.id);
		if (i === -1) return;
		const updated = { ...next, updatedAt: Date.now() };
		profiles = profiles.map((p, idx) => (idx === i ? updated : p));
		persist();
	}

	/** The person tapped "Maybe later" on the first-run nudge — stop showing it. */
	function dismissOnboarding() {
		dismissed = true;
		persist();
	}

	function createProfile(seed: Partial<Profile> = {}): string {
		const p = blankProfile(seed);
		profiles = [...profiles, p];
		activeId = p.id;
		persist();
		return p.id;
	}

	function setActive(id: string) {
		if (!profiles.some((p) => p.id === id)) return;
		activeId = id;
		persist();
	}

	function remove(id: string) {
		profiles = profiles.filter((p) => p.id !== id);
		if (activeId === id) activeId = profiles[0]?.id ?? null;
		persist();
	}

	/** First-run convenience: guarantee there is an active profile to edit. */
	function ensureProfile(): string {
		return active ? active.id : createProfile();
	}

	/** Wipe everything — handy for re-running a demo from a clean slate. */
	function reset() {
		profiles = [];
		activeId = null;
		dismissed = false;
		if (browser) {
			try {
				localStorage.removeItem(KEY);
			} catch {
				// ignore
			}
		}
	}

	return {
		// reactive reads (getters keep them live across the import boundary)
		get profiles() {
			return profiles;
		},
		get active() {
			return active;
		},
		get activeId() {
			return activeId;
		},
		get loaded() {
			return loaded;
		},
		/** Has the person told us anything yet? Gates personalization + the nudge. */
		get exists() {
			return exists;
		},
		/** Did they dismiss the first-run nudge? */
		get dismissed() {
			return dismissed;
		},
		/** The disambiguation-only projection to POST to /api/reconstruct. */
		get phrasebook(): ReconstructionPhrasebook {
			return phrasebook;
		},
		/** Personal tile groups to append after the core board. */
		get tiles(): TileGroup[] {
			return tiles;
		},
		// actions
		load,
		createProfile,
		updateActive,
		saveActive,
		setActive,
		remove,
		ensureProfile,
		dismissOnboarding,
		reset
	};
}

/** Singleton app store. Import and use directly; call `.load()` once on mount. */
export const profileStore = createProfileStore();
export type ProfileStoreApi = ReturnType<typeof createProfileStore>;
