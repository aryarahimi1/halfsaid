import { env } from '$env/dynamic/public';

// Base URL of the Halfsaid API (the Fly backend that holds the keys).
// Resolution order:
//   1. PUBLIC_API_URL — set in .env (local: http://localhost:8080) and/or on
//      Vercel to override. Local dev sets it, so dev always wins here.
//   2. DEFAULT_API — the deployed Fly backend, baked in so production still
//      reaches a real API even if the Vercel env var is missing. Without this,
//      an unset var would fall back to same-origin (no API) and reconstruction
//      would silently degrade to the offline word-join.
const DEFAULT_API = 'https://halfsaid-api.fly.dev';
const configured = (env.PUBLIC_API_URL ?? '').replace(/\/$/, '');
export const API_BASE = configured || DEFAULT_API;
