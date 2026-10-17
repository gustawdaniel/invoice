<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';
	import { data } from '#lib/state/data.svelte.js';
	import { keys } from '#lib/state/keys.svelte.js';
	import { session } from '#lib/state/session.svelte.js';
	import { errorMessage, toasts } from '#lib/state/toast.svelte.js';
	import { ui } from '#lib/state/ui.svelte.js';
	import ClientDialog from '#lib/ui/ClientDialog.svelte';
	import Keymap from '#lib/ui/Keymap.svelte';
	import Landing from '#lib/ui/Landing.svelte';
	import Palette from '#lib/ui/Palette.svelte';
	import Shell from '#lib/ui/Shell.svelte';
	import Toasts from '#lib/ui/Toasts.svelte';

	let { children }: LayoutProps = $props();

	// the login and print pages have no chrome
	const bare = $derived(page.url.pathname.startsWith('/login') || page.url.pathname.startsWith('/print'));
	let loadError = $state('');

	// visitors see the landing page on /, every other page needs a session
	const landing = $derived(!session.loggedIn && page.url.pathname === '/');

	$effect(() => {
		if (!session.loggedIn && !landing && !page.url.pathname.startsWith('/login')) void goto('/login');
	});

	$effect(() => {
		if (session.loggedIn && !data.loaded && !data.loading && !loadError) {
			data.loadAll().catch((error: unknown) => (loadError = errorMessage(error)));
			data.loadKeys().catch(() => {});
		}
	});

	// errors nobody handled show up instead of dying in the console
	function onunhandledrejection(event: PromiseRejectionEvent) {
		toasts.error('Something went wrong', event.reason);
	}
</script>

<svelte:window
	onkeydown={keys.handle}
	onfocusin={keys.track}
	onfocusout={() => setTimeout(keys.track)}
	{onunhandledrejection}
	ononline={() => toasts.ok('Back online')}
	onoffline={() => toasts.show('You are offline', 'Nothing is saved until the connection is back.', 'warn')}
/>

{#if landing}
	<Landing />
{:else if bare}
	{@render children()}
{:else if session.loggedIn}
	<Shell>
		{#if loadError}
			<div class="m-6 rounded-lg border border-bad/40 bg-bad-soft p-4">
				<p class="font-medium text-bad">Could not load your data</p>
				<p class="mt-1 text-sm text-muted">{loadError}</p>
				<button class="btn mt-3" onclick={() => (loadError = '')}>Try again</button>
			</div>
		{:else if !data.loaded}
			<div class="flex flex-1 items-center justify-center p-10 text-muted" aria-busy="true">Loading…</div>
		{:else}
			{@render children()}
		{/if}
	</Shell>
	{#if ui.paletteOpen}<Palette />{/if}
	{#if ui.keymapOpen}<Keymap />{/if}
	{#if ui.client}<ClientDialog />{/if}
{/if}

<Toasts />
