<script lang="ts">
	import { goto } from '$app/navigation';
	import { money, outstanding, status, totals } from '../invoice';
	import { data } from '../state/data.svelte';
	import type { Invoice } from '../types';
	import { copyNumber, duplicate, printInvoices } from './actions';
	import Kbd from './Kbd.svelte';
	import StatusPill from './StatusPill.svelte';

	let { invoice, onsend, ondismiss, onpaid }: { invoice: Invoice; onsend: () => void; ondismiss: () => void; onpaid: () => void } = $props();

	const lang = $derived(data.company.country === 'PL' ? 'pl' : 'en');
	const sum = $derived(totals(invoice));
	const current = $derived(status(invoice, data.usesKsef));
	const canSend = $derived(data.usesKsef && !invoice.ksefNumber);

	// what happened to the invoice, from what the API stores
	const history = $derived(
		[
			invoice.createdByAgent && { when: null, what: `Drafted by ${invoice.createdByAgent} via MCP` },
			invoice.ksefSendRequestedAt && {
				when: invoice.ksefSendRequestedAt,
				what: `${invoice.ksefSendRequestedBy ?? 'An agent'} asks to send it to KSeF${invoice.ksefSendRequestNote ? `: “${invoice.ksefSendRequestNote}”` : ''}`
			},
			invoice.ksefError && !invoice.ksefNumber && { when: null, what: `KSeF rejected it: ${invoice.ksefError}` },
			invoice.ksefNumber && { when: invoice.ksefSentAt, what: `Accepted by KSeF${invoice.ksefEnv === 'prod' ? '' : ` ${invoice.ksefEnv?.toUpperCase()}`} · ${invoice.ksefNumber}` },
			invoice.paid > 0 && { when: invoice.paymentDate, what: `Paid ${money(invoice.paid, lang)} ${invoice.currency}` },
			invoice.withholdingTax > 0 && { when: null, what: `Withholding tax ${money(invoice.withholdingTax, lang)} ${invoice.currency}, kept by the client for its tax office` }
		].filter(Boolean) as { when: string | null; what: string }[]
	);

	const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '');
</script>

<div class="flex flex-col gap-4">
	<div>
		<p class="font-mono text-xs text-muted">{invoice.number} · {invoice.livemode ? 'live' : 'test'}</p>
		<h2 class="mt-1 text-[17px] leading-snug font-semibold">{invoice.client.name}</h2>
		<p class="text-xs text-muted">
			{[invoice.client.tin && `${invoice.client.tinName || 'NIP'} ${invoice.client.tin}`, [invoice.client.street, invoice.client.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
		</p>
		<div class="mt-2"><StatusPill status={current} {invoice} /></div>
	</div>

	<dl class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
		<dt class="text-muted">Net</dt><dd class="text-right font-mono text-xs leading-5">{money(sum.net, lang)}</dd>
		<dt class="text-muted">VAT</dt><dd class="text-right font-mono text-xs leading-5">{money(sum.vat, lang)}</dd>
		<dt class="font-semibold">Gross</dt><dd class="text-right font-mono font-medium">{money(sum.gross, lang)} {invoice.currency}</dd>
		<dt class="text-muted">Issued</dt><dd class="text-right">{invoice.issueDate}</dd>
		<dt class="text-muted">Due</dt><dd class="text-right">{invoice.deadlineDate}</dd>
		{#if invoice.paid > 0 || invoice.withholdingTax > 0}
			<dt class="text-muted">Paid</dt><dd class="text-right font-mono text-xs leading-5">{money(invoice.paid, lang)}</dd>
			{#if invoice.withholdingTax > 0}<dt class="text-muted">Withholding tax</dt><dd class="text-right font-mono text-xs leading-5">{money(invoice.withholdingTax, lang)}</dd>{/if}
			{#if outstanding(invoice) > 0}<dt class="text-muted">Outstanding</dt><dd class="text-right font-mono text-xs leading-5 text-bad">{money(outstanding(invoice), lang)}</dd>{/if}
		{/if}
	</dl>

	{#if invoice.items.length}
		<div>
			<h3 class="label-caps mb-1.5">Items</h3>
			<ul class="flex flex-col gap-1 text-[13px]">
				{#each invoice.items as item, index (index)}
					<li class="flex justify-between gap-3"><span class="min-w-0 truncate">{item.name}</span><span class="shrink-0 font-mono text-xs leading-5 text-muted">{item.quantity} × {money(item.priceNet, lang)}</span></li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if history.length}
		<div>
			<h3 class="label-caps mb-1.5">History</h3>
			<ol class="flex flex-col gap-1.5 text-xs">
				{#each history as event, index (index)}
					<li class="flex gap-2">{#if event.when}<span class="shrink-0 font-mono text-faint">{time(event.when)}</span>{/if}<span class="break-words">{event.what}</span></li>
				{/each}
			</ol>
		</div>
	{/if}

	{#if invoice.privateNote}
		<div><h3 class="label-caps mb-1">Private note</h3><p class="text-[13px] whitespace-pre-line text-muted">{invoice.privateNote}</p></div>
	{/if}

	<div class="grid grid-cols-2 gap-1.5">
		{#if canSend}
			<button class="btn-primary col-span-2" disabled={!data.ksefConnected} title={data.ksefConnected ? '' : 'Connect KSeF on the Company page'} onclick={onsend}>
				{invoice.ksefSendRequestedAt ? 'Approve & send to KSeF' : invoice.livemode ? 'Send to KSeF' : 'Send to KSeF DEMO'} <Kbd keys="a" tone="inverse" />
			</button>
			{#if invoice.ksefSendRequestedAt}<button class="btn col-span-2" onclick={ondismiss}>Dismiss the request <Kbd keys="x" /></button>{/if}
		{/if}
		<button class="btn" onclick={() => goto(`/invoices/${invoice.id}`)}>{invoice.ksefNumber ? 'Open' : 'Edit'} <Kbd keys="e" /></button>
		<button class="btn" onclick={() => printInvoices([invoice.id])}>PDF <Kbd keys="p" /></button>
		<button class="btn" onclick={() => duplicate(invoice)}>Duplicate <Kbd keys="D" /></button>
		<button class="btn" onclick={onpaid}>{current === 'paid' ? 'Unpaid' : 'Paid'} <Kbd keys="m" /></button>
		<button class="btn col-span-2" onclick={() => copyNumber(invoice)}>Copy number <Kbd keys="yy" /></button>
	</div>
</div>
