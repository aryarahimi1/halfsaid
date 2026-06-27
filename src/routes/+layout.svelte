<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { profileStore } from '$lib/profile.svelte';

	let { children } = $props();

	// Load the on-device profile once, app-wide (idempotent, browser-only).
	onMount(() => profileStore.load());
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Halfsaid — say what you already mean</title>
	<meta name="theme-color" content="#0e7c86" />
</svelte:head>

{@render children()}
