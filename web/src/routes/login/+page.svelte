<script lang="ts">
	import { goto } from '$app/navigation';
	import { data } from '#lib/state/data.svelte.js';
	import { session } from '#lib/state/session.svelte.js';
	import { errorMessage } from '#lib/state/toast.svelte.js';

	const CLIENT_ID: string =
		import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '244384199602-sqhor9mc08tkl3gkd71k9c46rq38msdd.apps.googleusercontent.com';

	let button: HTMLDivElement | undefined = $state();
	let busy = $state(false);
	let error = $state('');

	$effect(() => {
		if (session.loggedIn) void goto('/');
	});

	async function onCredential(response: { credential: string }) {
		busy = true;
		error = '';
		try {
			await data.login(response.credential);
			await goto('/');
		} catch (e) {
			error = errorMessage(e);
		} finally {
			busy = false;
		}
	}

	// the Google script loads async, wait for it before drawing the button
	$effect(() => {
		if (!button) return;
		const target = button;
		const timer = setInterval(() => {
			const google = (window as unknown as { google?: GoogleIdentity }).google;
			if (!google?.accounts?.id) return;
			clearInterval(timer);
			google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCredential, auto_select: true, use_fedcm_for_prompt: true });
			google.accounts.id.renderButton(target, { type: 'standard', shape: 'pill', theme: 'outline', size: 'large', text: 'signin_with' });
		}, 100);
		return () => clearInterval(timer);
	});

	// dev only: Google allows only the production origin, so a local app borrows the session of openinvoice.in
	let pasted = $state('');
	async function useToken(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		try {
			const raw = pasted.trim().replace(/^"|"$/g, '');
			const payload = JSON.parse(atob(raw.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
			session.login(raw, { id: payload.id, email: payload.email, full_name: payload.email, avatar: '', roles: payload.roles ?? [] });
			await data.loadAll();
			await goto('/');
		} catch (e) {
			session.logout();
			error = `That token did not work: ${errorMessage(e)}`;
		}
	}

	interface GoogleIdentity {
		accounts: {
			id: {
				initialize(options: Record<string, unknown>): void;
				renderButton(element: HTMLElement, options: Record<string, unknown>): void;
			};
		};
	}
</script>

<svelte:head><title>Log in · openinvoice</title></svelte:head>

<main class="flex min-h-dvh items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<p class="font-mono text-lg font-medium tracking-tight">open<span class="text-accent">invoice</span></p>
		<h1 class="mt-6 text-2xl font-semibold tracking-tight">Invoices your agents draft and you approve.</h1>
		<p class="mt-2 text-muted">Polish KSeF and international invoices. Keyboard first, MCP for AI agents.</p>
		<div class="mt-8 min-h-11" bind:this={button} aria-busy={busy}></div>
		{#if busy}<p class="mt-3 text-sm text-muted">Signing in…</p>{/if}
		{#if error}<p class="mt-3 text-sm text-bad" role="alert">{error}</p>{/if}
		{#if import.meta.env.DEV}
			<details class="mt-10 rounded-lg border border-line bg-panel p-4 text-[13px]">
				<summary class="cursor-pointer font-medium">Developer login</summary>
				<p class="mt-2 text-muted">
					Google signs in only on allowed origins. Open openinvoice.in, run
					<code class="rounded bg-sunken px-1 font-mono text-xs">JSON.parse(localStorage.userStore).token</code> in the console and paste the result.
				</p>
				<form class="mt-3 flex gap-2" onsubmit={useToken}>
					<label for="dev-token" class="sr-only">Session token</label>
					<input id="dev-token" bind:value={pasted} type="password" autocomplete="off" placeholder="eyJ…" class="field font-mono text-xs" />
					<button class="btn-primary" disabled={!pasted.trim()}>Use</button>
				</form>
			</details>
		{/if}
	</div>
</main>
