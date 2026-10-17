<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { draftInvoice, exchange, gross, money, status } from '#lib/invoice.js';
	import { score, sortInvoices } from '#lib/search.js';
	import { data } from '#lib/state/data.svelte.js';
	import { keys } from '#lib/state/keys.svelte.js';
	import { session } from '#lib/state/session.svelte.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import { ui } from '#lib/state/ui.svelte.js';
	import type { Client } from '#lib/types.js';
	import { editClient, newClient } from '#lib/ui/clients.js';
	import Confirm from '#lib/ui/Confirm.svelte';
	import Kbd from '#lib/ui/Kbd.svelte';
	import StatusPill from '#lib/ui/StatusPill.svelte';

	let query = $state('');
	let selectedId = $state<string | null>(page.url.searchParams.get('id'));
	let search: HTMLInputElement | undefined = $state();
	let list: HTMLUListElement | undefined = $state();
	let deleting = $state<Client | null>(null);

	const lang = $derived(data.company.country === 'PL' ? 'pl' : 'en');
	const base = $derived(data.company.country === 'PL' ? 'PLN' : 'EUR');

	const stats = $derived.by(() => {
		const result = new Map<string, { count: number; total: number; unpaid: number; last: string }>();
		for (const inv of data.invoices) {
			const entry = result.get(inv.clientId) ?? { count: 0, total: 0, unpaid: 0, last: '' };
			const value = exchange(gross(inv), inv.currency, base, data.rate);
			entry.count++;
			entry.total += value;
			if (['unpaid', 'overdue', 'partial'].includes(status(inv, data.usesKsef))) entry.unpaid += value - exchange(inv.paid, inv.currency, base, data.rate);
			if (inv.issueDate > entry.last) entry.last = inv.issueDate;
			result.set(inv.clientId, entry);
		}
		return result;
	});

	const shown = $derived(
		query.trim()
			? data.clients
					.map((c) => ({ c, s: score(`${c.name} ${c.tin} ${c.city}`, query) }))
					.filter(({ s }) => s > 0)
					.sort((a, b) => b.s - a.s)
					.map(({ c }) => c)
			: [...data.clients].sort((a, b) => (stats.get(b.id)?.last ?? '').localeCompare(stats.get(a.id)?.last ?? '') || a.name.localeCompare(b.name))
	);
	const index = $derived(Math.max(0, shown.findIndex((c) => c.id === selectedId)));
	const selected = $derived(shown[index] ?? null);
	const invoices = $derived(selected ? sortInvoices(data.invoices.filter((inv) => inv.clientId === selected.id)) : []);

	$effect(() => {
		ui.context = shown.length ? `clients ${index + 1}/${shown.length}` : 'no clients';
		ui.hints = 'j/k move · e edit · c new client · n invoice for this client · dd delete · / search';
		return () => {
			ui.context = '';
			ui.hints = '';
		};
	});

	$effect(() => {
		list?.querySelector(`[data-id="${selected?.id}"]`)?.scrollIntoView({ block: 'nearest' });
	});

	const moveTo = (next: number) => {
		if (shown.length) selectedId = shown[Math.min(shown.length - 1, Math.max(0, next))].id;
	};

	function invoiceFor(client: Client) {
		const draft = draftInvoice(data.company, data.invoices, session.user?.full_name ?? '', session.testMode);
		draft.client = client;
		draft.clientId = client.id;
		ui.draft = draft;
		void goto('/invoices/new');
	}

	function askDelete(client: Client | null) {
		if (!client) return;
		if (stats.get(client.id)?.count) toasts.show('The client has invoices', 'Clients with invoices stay, the invoices need them.', 'warn');
		else deleting = client;
	}

	async function remove() {
		if (!deleting) return;
		const client = deleting;
		try {
			await data.deleteClient(client.id);
			toasts.ok('Client deleted', client.name);
		} catch (error) {
			toasts.error('Could not delete', error);
		} finally {
			deleting = null;
		}
	}

	$effect(() =>
		keys.use({
			j: () => moveTo(index + 1),
			k: () => moveTo(index - 1),
			arrowdown: () => moveTo(index + 1),
			arrowup: () => moveTo(index - 1),
			gg: () => moveTo(0),
			G: () => moveTo(shown.length - 1),
			e: () => selected && editClient(selected),
			enter: () => selected && editClient(selected),
			n: () => selected && invoiceFor(selected),
			dd: () => askDelete(selected),
			'/': () => search?.focus(),
			escape: () => search?.blur()
		})
	);
</script>

<svelte:head><title>Clients · openinvoice</title></svelte:head>

<div class="flex flex-1 flex-wrap items-stretch">
	<section class="flex min-w-0 flex-[999_1_420px] flex-col pb-6">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-4 pb-3">
			<h1 class="text-lg font-semibold">Clients</h1>
			<label class="flex h-8 min-w-0 flex-[1_1_220px] items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 text-[13px] focus-within:border-accent">
				<span class="font-mono text-accent" aria-hidden="true">/</span>
				<span class="sr-only">Search clients</span>
				<input bind:this={search} bind:value={query} placeholder="name, NIP or city" class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint" autocomplete="off"
					onkeydown={(event) => event.key === 'Enter' && search?.blur()} />
			</label>
			<button class="btn" onclick={() => newClient()}>New client <Kbd keys="c" /></button>
		</div>

		<ul bind:this={list} class="mx-5 overflow-hidden rounded-lg border border-line bg-panel">
			{#each shown as client (client.id)}
				{@const current = client.id === selected?.id}
				{@const stat = stats.get(client.id)}
				<li data-id={client.id} class="border-t border-line-soft first:border-t-0">
					<button
						class={['flex w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2.5 text-left', current ? 'bg-accent-soft shadow-[inset_3px_0_0_var(--accent)]' : 'hover:bg-sunken']}
						onclick={() => (selectedId = client.id)}
						ondblclick={() => editClient(client)}
					>
						<span class="min-w-0 flex-[1_1_240px] truncate font-medium">{client.name}</span>
						<span class="font-mono text-xs text-muted">{client.tin}</span>
						<span class="w-28 text-right text-xs text-muted">{stat ? `${stat.count} ${stat.count === 1 ? 'invoice' : 'invoices'}` : 'no invoices'}</span>
					</button>
				</li>
			{:else}
				<li class="px-3 py-10 text-center text-muted">
					{query ? 'No client matches.' : 'No clients yet.'} Press <Kbd keys="c" /> to add one by NIP.
				</li>
			{/each}
		</ul>
	</section>

	{#if selected}
		{@const stat = stats.get(selected.id)}
		<aside aria-label="Selected client" class="flex flex-[1_1_320px] flex-col gap-4 border-l border-line bg-panel px-5 py-4 max-lg:border-t max-lg:border-l-0 lg:max-w-[420px]">
			<div>
				<h2 class="text-[17px] leading-snug font-semibold">{selected.name}</h2>
				<p class="mt-1 text-xs text-muted">{selected.tinName || 'NIP'} <span class="font-mono">{selected.tin || '—'}</span></p>
				<p class="text-xs text-muted">{[selected.street, [selected.post, selected.city].filter(Boolean).join(' '), selected.country].filter(Boolean).join(', ')}</p>
			</div>
			<dl class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
				<dt class="text-muted">Invoiced</dt><dd class="text-right font-mono text-xs leading-5">{money(stat?.total ?? 0, lang)} {base}</dd>
				<dt class="text-muted">Unpaid</dt><dd class={['text-right font-mono text-xs leading-5', (stat?.unpaid ?? 0) > 0 && 'text-bad']}>{money(stat?.unpaid ?? 0, lang)} {base}</dd>
				<dt class="text-muted">Last invoice</dt><dd class="text-right">{stat?.last || '—'}</dd>
			</dl>
			<div class="grid grid-cols-2 gap-1.5">
				<button class="btn-primary col-span-2" onclick={() => invoiceFor(selected)}>New invoice for this client <Kbd keys="n" tone="inverse" /></button>
				<button class="btn" onclick={() => editClient(selected)}>Edit <Kbd keys="e" /></button>
				<button class="btn" onclick={() => goto(`/?q=${encodeURIComponent(`client:${selected.tin || selected.name.split(' ')[0].toLowerCase()}`)}`)}>All invoices</button>
			</div>
			{#if invoices.length}
				<div>
					<h3 class="label-caps mb-1.5">Invoices</h3>
					<ul class="flex flex-col">
						{#each invoices.slice(0, 12) as inv (inv.id)}
							<li>
								<a href="/invoices/{inv.id}" class="flex items-center gap-2 rounded px-1.5 py-1.5 text-[13px] hover:bg-sunken">
									<span class="font-mono text-xs">{inv.number}</span>
									<span class="ml-auto font-mono text-xs text-muted">{money(gross(inv), lang)} {inv.currency}</span>
									<StatusPill status={status(inv, data.usesKsef)} invoice={inv} />
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</aside>
	{/if}
</div>

{#if deleting}
	<Confirm title="Delete {deleting.name}?" confirmLabel="Delete" danger onconfirm={remove} oncancel={() => (deleting = null)}>
		<p>The client has no invoices, nothing else changes.</p>
	</Confirm>
{/if}
