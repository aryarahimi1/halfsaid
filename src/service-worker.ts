/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Makes Halfsaid installable and offline-capable. For an AAC tool that matters:
// a person needs to communicate even with no signal. The app shell, board,
// tiles, on-device profile and the browser voice all work offline; the cloud
// reconstruction and own-voice cloning upgrade the experience when online and
// fall back gracefully when not.

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `halfsaid-${version}`;
const ASSETS = [...build, ...files]; // app JS/CSS + everything in static/

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return; // never intercept the API POSTs
	const url = new URL(req.url);
	if (url.origin !== sw.location.origin) return; // only our own assets

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);

			// Built/static assets are content-hashed — serve them cache-first.
			if (ASSETS.includes(url.pathname)) {
				const hit = await cache.match(url.pathname);
				if (hit) return hit;
			}

			// Navigations + the rest: network-first (fresh when online), cache the
			// page shell, and fall back to cache (then the app shell) when offline.
			try {
				const res = await fetch(req);
				if (res.ok && req.mode === 'navigate') cache.put(req, res.clone());
				return res;
			} catch {
				const hit = await cache.match(req);
				if (hit) return hit;
				const shell = await cache.match('/');
				if (shell) return shell;
				return Response.error();
			}
		})()
	);
});
