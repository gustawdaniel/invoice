<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import { ago, initials, shortName } from '../format';
	import { data } from '../state/data.svelte';
	import { keys } from '../state/keys.svelte';
	import { session } from '../state/session.svelte';
	import { toasts } from '../state/toast.svelte';
	import { ui } from '../state/ui.svelte';
	import { newClient } from './clients';
	import Kbd from './Kbd.svelte';
	import { theme } from '../state/theme.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let { children }: { children: Snippet } = $props();
	let menuOpen = $state(false);

	const nav = [
		{ href: '/inbox', label: 'Inbox', keys: 'gi' },
		{ href: '/', label: 'Invoices', keys: 'gv' },
		{ href: '/clients', label: 'Clients', keys: 'gc' },
		{ href: '/books', label: 'Books', keys: 'gb' },
		{ href: '/bank', label: 'Bank', keys: 'gt' },
		{ href: '/costs', label: 'Costs', keys: 'gk' },
		{ href: '/agents', label: 'Agents', keys: 'ga' },
		{ href: '/company', label: 'Company', keys: 'gs' }
	];
	const saved = ['is:unpaid', 'is:overdue', 'by:agent', 'is:draft', `month:${new Date().toISOString().slice(0, 7)}`];

	const active = (href: string) =>
		href === '/' ? page.url.pathname === '/' || page.url.pathname.startsWith('/invoices') : page.url.pathname.startsWith(href);

	const lastAgentCall = $derived(
		data.keys.map((key) => key.lastUsedAt).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null
	);

	async function toggleTest() {
		try {
			await data.setTestMode(!session.testMode);
			toasts.show(session.testMode ? 'Test mode' : 'Live mode', session.testMode ? 'Test invoices only, sent to KSeF DEMO without legal effect.' : 'Real invoices.', session.testMode ? 'warn' : 'info');
		} catch (error) {
			toasts.error('Could not switch the mode', error);
		}
	}

	async function logout() {
		await data.logout();
		await goto('/login');
	}

	$effect(() =>
		keys.use({
			'mod-k': () => ui.openPalette(),
			':': () => ui.openPalette(),
			'/': () => ui.openPalette(),
			'?': () => (ui.keymapOpen = true),
			gi: () => goto('/inbox'),
			gv: () => goto('/'),
			gc: () => goto('/clients'),
			gb: () => goto('/books'),
			ga: () => goto('/agents'),
			gs: () => goto('/company'),
			gt: () => goto('/bank'),
			gk: () => goto('/costs'),
			gC: () => ui.openPalette('switch '),
			n: () => goto('/invoices/new'),
			c: () => newClient(),
			t: toggleTest,
			T: () => theme.cycle(),
			'ctrl-o': () => history.back()
		})
	);
</script>

<div class="flex min-h-dvh flex-col">
	<header class="no-print flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-panel px-4 py-2">
		<a href="/" class="font-mono text-sm font-medium tracking-tight">open<span class="text-accent">invoice</span></a>

		<button class="btn max-w-[min(320px,60vw)]" onclick={() => ui.openPalette('switch ')} title="{data.company.name} — switch company (gC)">
			<span class="flex h-[18px] w-[22px] shrink-0 items-center justify-center rounded bg-ink text-[10px] font-semibold text-bg">{data.company.country}</span>
			<span class="truncate">{shortName(data.company.name) || '…'}</span>
			{#if data.usesKsef}
				<span class={['shrink-0 text-[11px] font-medium', data.ksefConnected ? 'text-ok' : 'text-warn']}>
					● {session.testMode ? 'KSeF DEMO' : 'KSeF'}{data.ksefConnected ? '' : ' off'}
				</span>
			{/if}
		</button>

		<button
			class="flex h-8 min-w-0 flex-[1_1_260px] cursor-pointer items-center gap-2.5 rounded-md border border-line bg-sunken px-2.5 text-left text-[13px] text-muted hover:border-accent-line sm:max-w-[560px]"
			onclick={() => ui.openPalette()}
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
			<span class="flex-1 truncate">Search invoices, clients, or type a command…</span>
			<kbd class="rounded border border-line bg-panel px-1.5 py-0.5">⌘K</kbd>
		</button>

		<div class="ml-auto flex items-center gap-2">
			<div role="group" aria-label="Mode" class="flex overflow-hidden rounded-md border border-line text-xs">
				<button class={['px-2.5 py-1.5', !session.testMode ? 'bg-ink text-bg' : 'bg-panel text-muted hover:bg-sunken']} aria-pressed={!session.testMode} onclick={() => session.testMode && toggleTest()}>Live</button>
				<button class={['px-2.5 py-1.5', session.testMode ? 'bg-test text-on-test' : 'bg-panel text-muted hover:bg-sunken']} aria-pressed={session.testMode} onclick={() => !session.testMode && toggleTest()}>Test <Kbd keys="t" tone={session.testMode ? 'inverse' : 'muted'} /></button>
			</div>
			<ThemeToggle />
			<div class="relative">
				<button class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-sunken text-xs font-semibold" aria-label="Account" aria-expanded={menuOpen} onclick={() => (menuOpen = !menuOpen)}>
					{#if session.user?.avatar}<img src={session.user.avatar} alt="" class="h-full w-full object-cover" referrerpolicy="no-referrer" />{:else}{initials(session.user?.full_name ?? '')}{/if}
				</button>
				{#if menuOpen}
					<button class="fixed inset-0 z-30 cursor-default" aria-label="Close menu" tabindex="-1" onclick={() => (menuOpen = false)}></button>
					<div class="absolute right-0 z-40 mt-2 w-60 rounded-lg border border-line bg-panel py-1 shadow-lg">
						<p class="truncate px-3 py-2 text-xs text-muted">{session.user?.email}</p>
						{#if session.isAdmin}<a href="/admin" class="block px-3 py-1.5 text-sm hover:bg-sunken" onclick={() => (menuOpen = false)}>Admin</a>{/if}
						<button class="block w-full px-3 py-1.5 text-left text-sm hover:bg-sunken" onclick={() => { menuOpen = false; ui.keymapOpen = true; }}>Keyboard shortcuts</button>
						<button class="block w-full px-3 py-1.5 text-left text-sm hover:bg-sunken" onclick={logout}>Log out</button>
					</div>
				{/if}
			</div>
		</div>
	</header>

	{#if session.testMode}
		<div class="no-print bg-test px-4 py-1 text-center text-xs font-medium text-on-test">TEST MODE — test invoices only, sent to KSeF DEMO without legal effect</div>
	{/if}

	<div class="flex flex-1 flex-wrap items-stretch">
		<nav aria-label="Main" class="no-print flex flex-[1_1_180px] flex-col gap-0.5 border-r border-line px-2.5 py-3.5 text-[13px] max-md:flex-[1_1_100%] max-md:flex-row max-md:flex-wrap max-md:border-r-0 max-md:border-b max-md:py-2 md:max-w-[210px]">
			{#each nav as item (item.href)}
				{@const count = item.href === '/inbox' ? data.waiting.length : item.href === '/bank' ? data.bankToReview : 0}
				<a
					href={item.href}
					class={['flex items-center gap-2 rounded-md px-2 py-1.5', active(item.href) ? 'bg-accent-soft font-medium text-accent-ink' : 'text-ink hover:bg-sunken']}
					aria-current={active(item.href) ? 'page' : undefined}
				>
					{item.label}
					{#if count}
						<span class="ml-auto rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent">{count}</span>
					{/if}
					<span class={['font-mono text-[11px] text-faint max-md:hidden', count ? '' : 'ml-auto']}>{item.keys}</span>
				</a>
			{/each}
			<p class="label-caps mx-2 mt-5 mb-1.5 max-md:hidden">Saved searches</p>
			{#each saved as query (query)}
				<a href="/?q={encodeURIComponent(query)}" class="rounded-md px-2 py-1 font-mono text-xs text-muted hover:bg-sunken max-md:hidden">{query}</a>
			{/each}
		</nav>

		<main class="flex min-w-0 flex-[999_1_560px] flex-col">
			{@render children()}
		</main>
	</div>

	<footer class="no-print sticky bottom-0 flex h-7 items-center gap-3.5 overflow-hidden border-t border-line bg-panel pr-3 font-mono text-[11px] whitespace-nowrap text-muted">
		<span class={['flex h-full items-center px-2.5 font-medium', keys.mode === 'INSERT' ? 'bg-accent text-on-accent' : 'bg-ink text-bg']}>{keys.mode}</span>
		{#if keys.pending}<span class="text-accent">{keys.pending}…</span>{/if}
		{#if ui.context}<span>{ui.context}</span>{/if}
		<span class="truncate max-sm:hidden">{ui.hints || ': command · / search · ? keys'}</span>
		<a href="/agents" class={['ml-auto max-md:hidden', lastAgentCall ? 'text-ok' : 'text-muted']}>
			● MCP · {data.keys.length} {data.keys.length === 1 ? 'key' : 'keys'}{lastAgentCall ? ` · last call ${ago(lastAgentCall)}` : ''}
		</a>
	</footer>
</div>
