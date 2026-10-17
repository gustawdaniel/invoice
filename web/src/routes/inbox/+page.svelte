<script lang="ts">
	import { goto } from '$app/navigation';
	import { daysOverdue, gross, money, status } from '#lib/invoice.js';
	import { sortInvoices } from '#lib/search.js';
	import { data } from '#lib/state/data.svelte.js';
	import { keys } from '#lib/state/keys.svelte.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import { ui } from '#lib/state/ui.svelte.js';
	import type { Invoice } from '#lib/types.js';
	import { markPaid } from '#lib/ui/actions.js';
	import InvoiceSide from '#lib/ui/InvoiceSide.svelte';
	import Kbd from '#lib/ui/Kbd.svelte';
	import KsefSend from '#lib/ui/KsefSend.svelte';

	type Kind = 'request' | 'rejected' | 'agent-draft' | 'overdue' | 'draft';
	interface Entry {
		kind: Kind;
		invoice: Invoice;
		text: string;
	}

	const lang = $derived(data.company.country === 'PL' ? 'pl' : 'en');
	const title: Record<Kind, string> = {
		request: 'Agents ask to send to KSeF',
		rejected: 'Rejected by KSeF',
		'agent-draft': 'Drafted by agents',
		overdue: 'Overdue',
		draft: 'Your drafts not in KSeF'
	};

	// one list of everything that waits for a human, most urgent first
	const entries = $derived.by<Entry[]>(() => {
		const result: Entry[] = [];
		for (const invoice of sortInvoices(data.invoices)) {
			const current = status(invoice, data.usesKsef);
			const amount = `${money(gross(invoice), lang)} ${invoice.currency}`;
			if (current === 'approval') result.push({ kind: 'request', invoice, text: `${invoice.ksefSendRequestedBy ?? 'An agent'}: ${invoice.ksefSendRequestNote || `send ${invoice.number}`} — ${amount}` });
			else if (current === 'error') result.push({ kind: 'rejected', invoice, text: invoice.ksefError ?? 'rejected' });
			else if (current === 'draft' && invoice.createdByAgent) result.push({ kind: 'agent-draft', invoice, text: `${invoice.createdByAgent} drafted it — ${amount}` });
			else if (current === 'overdue') result.push({ kind: 'overdue', invoice, text: `${daysOverdue(invoice)} days after ${invoice.deadlineDate} — ${amount}` });
			else if (current === 'draft') result.push({ kind: 'draft', invoice, text: `issued ${invoice.issueDate} — ${amount}` });
		}
		const order: Kind[] = ['request', 'rejected', 'agent-draft', 'overdue', 'draft'];
		return result.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
	});

	let selectedId = $state<string | null>(null);
	let sending = $state<Invoice | null>(null);
	const index = $derived(Math.max(0, entries.findIndex((e) => e.invoice.id === selectedId)));
	const selected = $derived(entries[index] ?? null);

	$effect(() => {
		ui.context = entries.length ? `inbox ${index + 1}/${entries.length}` : 'inbox zero';
		ui.hints = 'j/k move · a approve & send · x dismiss · m paid · enter open';
		return () => {
			ui.context = '';
			ui.hints = '';
		};
	});

	const moveTo = (next: number) => {
		if (entries.length) selectedId = entries[Math.min(entries.length - 1, Math.max(0, next))].invoice.id;
	};

	function send(invoice: Invoice | undefined) {
		if (!invoice || invoice.ksefNumber || !data.usesKsef) return;
		if (!data.ksefConnected) toasts.show('KSeF is not connected', 'Connect it on the Company page (gs).', 'warn');
		else sending = invoice;
	}

	async function dismiss(invoice: Invoice | undefined) {
		if (!invoice?.ksefSendRequestedAt) return;
		try {
			await data.dismissKsefRequest(invoice.id);
			toasts.ok('Request dismissed', invoice.number);
		} catch (error) {
			toasts.error('Could not dismiss', error);
		}
	}

	$effect(() =>
		keys.use({
			j: () => moveTo(index + 1),
			k: () => moveTo(index - 1),
			arrowdown: () => moveTo(index + 1),
			arrowup: () => moveTo(index - 1),
			gg: () => moveTo(0),
			G: () => moveTo(entries.length - 1),
			enter: () => selected && goto(`/invoices/${selected.invoice.id}`),
			e: () => selected && goto(`/invoices/${selected.invoice.id}`),
			a: () => send(selected?.invoice),
			x: () => dismiss(selected?.invoice),
			m: () => selected && markPaid(selected.invoice, gross(selected.invoice))
		})
	);
</script>

<svelte:head><title>Inbox · openinvoice</title></svelte:head>

<div class="flex flex-1 flex-wrap items-stretch">
	<section class="flex min-w-0 flex-[999_1_520px] flex-col px-5 pt-4 pb-6">
		<h1 class="text-lg font-semibold">Inbox</h1>
		<p class="mt-0.5 mb-4 text-[13px] text-muted">What waits for you. Agents draft through MCP, you decide what gets sent.</p>

		{#if data.bankToReview || data.costsToReview || data.filingsMissing}
			<div class="mb-4 flex flex-wrap gap-2">
				{#if data.filingsMissing}
					<a href="/taxes" class="flex flex-1 items-center justify-between gap-3 rounded-lg border border-bad/40 bg-bad-soft px-4 py-3 text-[13px]">
						<span><strong class="font-semibold">{data.filingsMissing}</strong> overdue returns and filings</span><Kbd keys="gx" />
					</a>
				{/if}
				{#if data.bankToReview}
					<a href="/bank" class="flex flex-1 items-center justify-between gap-3 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-[13px]">
						<span><strong class="font-semibold">{data.bankToReview}</strong> bank operations the agent could not classify</span><Kbd keys="gt" />
					</a>
				{/if}
				{#if data.costsToReview}
					<a href="/costs" class="flex flex-1 items-center justify-between gap-3 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-[13px]">
						<span><strong class="font-semibold">{data.costsToReview}</strong> cost documents to check</span><Kbd keys="gk" />
					</a>
				{/if}
			</div>
		{/if}

		{#if !entries.length}
			<div class="rounded-lg border border-line bg-panel px-6 py-12 text-center">
				<p class="font-medium">Nothing waits for you</p>
				<p class="mt-1 text-[13px] text-muted">No agent requests, no rejected or overdue invoices.</p>
			</div>
		{:else}
			<ul class="overflow-hidden rounded-lg border border-line bg-panel">
				{#each entries as entry, i (entry.invoice.id)}
					{@const current = entry.invoice.id === selected?.invoice.id}
					{#if i === 0 || entries[i - 1].kind !== entry.kind}
						<li class={['label-caps bg-bg px-3 pt-3 pb-1.5', i > 0 && 'border-t border-line']}>{title[entry.kind]}</li>
					{/if}
					<li class="border-t border-line-soft">
						<button
							class={['flex w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2.5 text-left text-[13px]', current ? 'bg-accent-soft shadow-[inset_3px_0_0_var(--accent)]' : 'hover:bg-sunken']}
							onclick={() => (selectedId = entry.invoice.id)}
							ondblclick={() => goto(`/invoices/${entry.invoice.id}`)}
						>
							<span class="font-mono text-xs">{entry.invoice.number}</span>
							<span class="min-w-0 flex-[1_1_200px] truncate font-medium">{entry.invoice.client.name}</span>
							<span class={['w-full truncate text-xs', entry.kind === 'rejected' || entry.kind === 'overdue' ? 'text-bad' : 'text-muted']}>{entry.text}</span>
						</button>
					</li>
				{/each}
			</ul>
			<p class="mt-3 text-xs text-muted"><Kbd keys="a" /> approve &amp; send · <Kbd keys="x" /> dismiss · <Kbd keys="m" /> mark paid · <Kbd keys="enter" /> open</p>
		{/if}
	</section>

	{#if selected}
		<aside aria-label="Selected invoice" class="flex-[1_1_300px] border-l border-line bg-panel px-5 py-4 max-lg:border-t max-lg:border-l-0 lg:max-w-[380px]">
			<InvoiceSide
				invoice={selected.invoice}
				onsend={() => send(selected.invoice)}
				ondismiss={() => dismiss(selected.invoice)}
				onpaid={() => markPaid(selected.invoice, gross(selected.invoice))}
			/>
		</aside>
	{/if}
</div>

{#if sending}<KsefSend invoice={sending} onclose={() => (sending = null)} />{/if}
