import { env } from '$env/dynamic/public';

// Base URL of the Halfsaid API (the Fly backend that holds the keys). Set
// PUBLIC_API_URL in .env (local: http://localhost:8080) and in Vercel
// (production: https://<your-fly-app>.fly.dev). Empty falls back to same-origin,
// which has no API — so reconstruction degrades to the offline word-join.
export const API_BASE = (env.PUBLIC_API_URL ?? '').replace(/\/$/, '');
