# Halfsaid — Design System

## Color strategy

Restrained canvas, committed accent. A calm tinted-neutral field with a single
deep teal that carries the whole identity. The accent stays quiet across the
board and earns real presence only in THE moment (the sentence assembling). All
neutrals are tinted toward the teal hue; never pure black or white.

OKLCH (hue ~205):

| Role | OKLCH | hex (current token) |
|---|---|---|
| ink (primary text) | oklch(0.27 0.03 220) | #11242f |
| slate (secondary) | oklch(0.45 0.03 220) | #41606f |
| calm (canvas) | oklch(0.97 0.006 210) | #f4f7f8 |
| paper (surface) | oklch(0.99 0.003 210) | #ffffff (faintly tinted, never #fff) |
| accent (teal) | oklch(0.52 0.09 200) | #0e7c86 |
| accent-strong | oklch(0.43 0.09 200) | #0a5d65 |
| go (confirm) | oklch(0.62 0.13 160) | #1f9d6b |

## Typography

- **Display: Georgia / serif.** Warm and human, deliberately NOT a tech sans.
  Carries the wordmark, the reconstructed sentence, and screen titles. This serif
  is the primary anti-slop signal: a reconstructed sentence set in a real serif
  reads as *speech*, not as machine output.
- **UI / labels: system sans.** Tiles, buttons, helper text. Neutral, legible.
- Hierarchy by scale + weight (steps >= 1.25). The reconstructed SENTENCE is the
  largest, most important type on the screen at all times.
- Body / helper line length <= 70ch.

## Elevation

Flat: paper on calm. One soft single-layer shadow on the few raised surfaces
(say-bar, candidate cards). No glassmorphism, no heavy drop shadows, no nested
cards.

## Motion

- Ease-out exponential (quart / quint). No bounce, no elastic, no spring.
- Motion is meaningful only: a sentence assembling, a candidate confirming. No
  decorative motion anywhere.
- prefers-reduced-motion: collapse to instant. The assembly becomes an immediate
  reveal, never withheld, never a barrier to speaking.

## Components

- **Word tile:** large (min ~80px), rounded-2xl, paper, big legible sans label,
  generous gap, grouped (Core / Feeling / Needs / People + personal groups).
- **Say-bar:** sticky; tapped fragments as chips + the Build action.
- **Candidate card:** the reconstructed sentence in large display serif;
  whole card is tap-to-speak; one-tap reject (x) preserves authorship.
- Targets >= 44px everywhere. Visible focus rings. No timers, ever.
