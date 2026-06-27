// Partner mic — hear the question. The "Someone asked…" field can be filled by
// listening to the conversation partner instead of typing, so reconstruction
// answers what was actually said. Uses the browser Web Speech API; where it's
// unsupported (e.g. Firefox), the typed field is the fallback. The Web Speech
// types aren't in the standard DOM lib, so we declare a minimal shape.

import { browser } from '$app/environment';

interface SRAlternative {
	transcript: string;
}
interface SRResult {
	isFinal: boolean;
	0: SRAlternative;
}
interface SRResultList {
	length: number;
	[index: number]: SRResult;
}
interface SREvent {
	resultIndex: number;
	results: SRResultList;
}
interface SRErrorEvent {
	error: string; // 'not-allowed' | 'audio-capture' | 'no-speech' | 'aborted' | 'network' | …
}
interface SRInstance {
	lang: string;
	interimResults: boolean;
	continuous: boolean;
	maxAlternatives: number;
	onresult: ((e: SREvent) => void) | null;
	onstart: (() => void) | null;
	onend: (() => void) | null;
	onerror: ((e: SRErrorEvent) => void) | null;
	start(): void;
	stop(): void;
}
type SRConstructor = new () => SRInstance;

function getCtor(): SRConstructor | null {
	if (!browser) return null;
	const w = window as unknown as {
		SpeechRecognition?: SRConstructor;
		webkitSpeechRecognition?: SRConstructor;
	};
	return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function listenSupported(): boolean {
	return getCtor() !== null;
}

export interface Listener {
	start(): void;
	stop(): void;
}

export interface ListenHandlers {
	onText: (text: string, final: boolean) => void;
	onStart?: () => void;
	onEnd?: () => void;
	onError?: (code: string) => void;
}

/** Build a one-shot listener. Returns null where speech recognition is
 *  unavailable; the caller keeps the typed field. */
export function createListener(handlers: ListenHandlers): Listener | null {
	const Ctor = getCtor();
	if (!Ctor) return null;
	const rec = new Ctor();
	rec.lang = 'en-US';
	rec.interimResults = true;
	rec.continuous = false;
	rec.maxAlternatives = 1;
	rec.onresult = (e) => {
		let interim = '';
		let final = '';
		for (let i = e.resultIndex; i < e.results.length; i++) {
			const r = e.results[i];
			const t = r[0]?.transcript ?? '';
			if (r.isFinal) final += t;
			else interim += t;
		}
		handlers.onText((final || interim).trim(), !!final);
	};
	rec.onstart = () => handlers.onStart?.();
	rec.onend = () => handlers.onEnd?.();
	rec.onerror = (e) => handlers.onError?.(e.error);
	return {
		start() {
			try {
				rec.start();
			} catch {
				// already started — ignore
			}
		},
		stop() {
			try {
				rec.stop();
			} catch {
				// not started — ignore
			}
		}
	};
}
