<script lang="ts">
	// Renders a reconstructed sentence as the product thesis made visible: the
	// words that came from the person's own tapped fragments are the load-bearing
	// pillars (ink, heavier); the connective words the AI added are the mortar
	// between them (slate, lighter). Each word rises in, staggered, so you watch
	// the gaps between someone's broken words get filled.

	let { text, fragments = [] }: { text: string; fragments?: string[] } = $props();

	const core = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');

	const fragWords = $derived(
		new Set(
			fragments
				.flatMap((f) => f.split(/\s+/))
				.map(core)
				.filter((w) => w.length > 0)
		)
	);

	function isYours(token: string): boolean {
		const c = core(token);
		if (!c) return false;
		if (fragWords.has(c)) return true;
		// loose stem match so "water" covers "watered", "cup" covers "cups"
		for (const f of fragWords) {
			if (c.length >= 3 && f.length >= 3 && (c.startsWith(f) || f.startsWith(c))) return true;
		}
		return false;
	}

	type Part = { text: string; space: boolean; yours: boolean; i: number };
	const parts = $derived.by<Part[]>(() => {
		let w = 0;
		return text.split(/(\s+)/).map((t) => {
			if (/^\s+$/.test(t)) return { text: t, space: true, yours: false, i: -1 };
			const part: Part = { text: t, space: false, yours: isYours(t), i: w };
			w++;
			return part;
		});
	});
</script>

<span class="assembled">
	{#each parts as p, idx (idx)}{#if p.space}{p.text}{:else}<span
				class="word {p.yours ? 'yours' : 'glue'}"
				style="--i: {p.i}">{p.text}</span
			>{/if}{/each}
</span>

<style>
	.assembled {
		display: inline;
	}
	.word {
		display: inline-block;
		opacity: 0;
		transform: translateY(0.45em);
		animation: rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
		animation-delay: calc(var(--i) * 62ms);
	}
	.yours {
		color: var(--color-ink);
		font-weight: 600;
	}
	.glue {
		color: var(--color-slate);
		font-weight: 400;
	}
	@media (prefers-reduced-motion: reduce) {
		.word {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
	@keyframes rise {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
