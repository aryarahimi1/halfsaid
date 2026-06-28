# Halfsaid

**Say what you already mean.**

Two million people live with aphasia. They know exactly what they want to say,
the thoughts are fully intact, but the bridge from thought to words is broken.
The usual fix is a dedicated speech device that costs **$5,000 to $15,000**,
takes months of insurance fights, and still speaks 8 to 10 words a minute in a
flat, robotic stranger's voice.

Halfsaid runs free in a browser. You tap a few broken word-fragments,
`water · hot · cup`, and AI reconstructs the short sentence you already mean,
"Can I have a cup of hot water?", then speaks it aloud. For stroke survivors it
speaks in **their own voice**, rebuilt from an old recording. The same
thought-to-word gap is lived every day by minimally-verbal autistic people too.

> You stay the author. The AI proposes, you confirm; a wrong guess is rejected
> in one tap. You watch your own words become a whole sentence on screen, the
> ones you tapped standing as the pillars, the connective words filled in
> between them.

## What it does

- **Reconstruct** — tap a few fragments (or type, or speak telegraphically) and
  AI assembles 2 to 3 candidate sentences. The primary one builds word-by-word
  on screen: your words in bold ink, the AI's connective glue in lighter slate.
- **Personalize** — a low-cognitive-load setup (caregiver-friendly) records the
  people, places, and needs in your life, so reconstructions are grounded in who
  you actually are. People's names become tappable tiles.
- **Own voice** — clone a voice from a short clip and speak your sentences in it,
  not a robot. (ElevenLabs Instant Voice Clone.)
- **Partner mic** — let the app hear the question someone asked you, so your
  sentence answers it directly. (Web Speech API.)
- **Installable + offline** — a PWA you can add to your home screen; the board,
  tiles, profile, and device voice all work with no signal, because a person
  needs to communicate even when the wifi doesn't.

Built for the cognition it serves: huge tap targets, no timers, high contrast,
keyboard / switch reach, reduced-motion respected, and the profile is treated as
inert data that can never be obeyed as a prompt.

## Architecture

A split: the **frontend on Vercel** and a small **API on Fly** that holds the keys.

```
Browser (PWA)
   │  the UI: tile board, profile, own-voice, partner mic   [Vercel]
   │  SvelteKit (Svelte 5 runes) + Tailwind v4
   ▼
Halfsaid API  [Fly]   ← holds OpenRouter + ElevenLabs keys
   ├─ POST /api/reconstruct  → OpenRouter (fragments → sentence candidates)
   ├─ POST /api/speak        → ElevenLabs TTS (text → audio in a voice)
   └─ POST /api/voice        → ElevenLabs Instant Voice Clone (clip → voice id)
```

The browser only ever sees text and audio; the model keys never leave the Fly
service. Reconstruction degrades gracefully: with no key or no signal the board
falls back to a local join so it never goes dark.

## Run it locally

Two processes. Backend (holds the keys):

```sh
cd server
cp .env.example .env          # add OPENROUTER_API_KEY + ELEVENLABS_API_KEY
npm install
npm run dev                   # http://localhost:8080
```

Frontend:

```sh
cp .env.example .env          # PUBLIC_API_URL=http://localhost:8080
npm install
npm run dev -- --host
```

`OPENROUTER_MODEL` is optional (default `openai/gpt-4o-mini`; any OpenRouter slug
works). ElevenLabs voice cloning needs a paid plan.

## Tech

SvelteKit (Svelte 5 runes) · Tailwind v4 · TypeScript · Hono · OpenRouter ·
ElevenLabs · Web Speech API · Vercel · Fly.io
