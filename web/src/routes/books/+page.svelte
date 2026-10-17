<script lang="ts">
	import dayjs from 'dayjs';
	import { exchange, gross, money, status, totals } from '#lib/invoice.js';
	import { sortInvoices } from '#lib/search.js';
	import { data } from '#lib/state/data.svelte.js';
	import { keys } from '#lib/state/keys.svelte.js';
	import { ui } from '#lib/state/ui.svelte.js';
	import type { ExchangeRate, Invoice } from '#lib/types.js';
	import { printInvoices } from '#lib/ui/actions.js';
	import Kbd from '#lib/ui/Kbd.svelte';
	import MonthChart, { type MonthBar } from '#lib/ui/MonthChart.svelte';
	import StatusPill from '#lib/ui/StatusPill.svelte';

	const lang = $derived(data.company.country === 'PL' ? 'pl' : 'en');
	const base = $derived(data.company.country === 'PL' ? 'PLN' : 'EUR');
	const toBase = (value: number, inv: Invoice) => exchange(value, inv.currency, base, data.rate);

	let month = $state(dayjs().format('YYYY-MM'));
	// issued: by issue date (sales); paid: by payment date (cash, what the old Bookkeeping page showed)
	let view = $state<'issued' | 'paid'>('issued');
	let rates = $state<ExchangeRate[]>([]);

	$effect(() => {
		data.rates().then((list) => (rates = list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10))).catch(() => {});
	});

	// every month from the first invoice to now (at least a year), the chart scrolls back through them
	const bars = $derived.by<MonthBar[]>(() => {
		const now = dayjs().startOf('month');
		const first = data.invoices.reduce((min, inv) => (inv.issueDate < min ? inv.issueDate : min), now.format('YYYY-MM-DD'));
		const count = Math.max(12, now.diff(dayjs(first).startOf('month'), 'month') + 1);
		const totals = new Map<string, { paid: number; waiting: number }>();
		for (const inv of data.invoices) {
			const key = inv.issueDate.slice(0, 7);
			const total = toBase(gross(inv), inv);
			const received = Math.min(total, toBase(inv.paid, inv));
			const entry = totals.get(key) ?? { paid: 0, waiting: 0 };
			entry.paid += received;
			entry.waiting += total - received;
			totals.set(key, entry);
		}
		return Array.from({ length: count }, (_, i) => {
			const m = now.subtract(count - 1 - i, 'month');
			const key = m.format('YYYY-MM');
			return { month: key, label: m.format('MMM'), ...(totals.get(key) ?? { paid: 0, waiting: 0 }) };
		});
	});

	const rows = $derived(
		sortInvoices(
			data.invoices.filter((inv) => (view === 'issued' ? inv.issueDate.startsWith(month) : inv.paymentDate?.startsWith(month)))
		)
	);
	const sums = $derived(
		rows.reduce(
			(acc, inv) => {
				const t = totals(inv);
				return { net: acc.net + toBase(t.net, inv), vat: acc.vat + toBase(t.vat, inv), gross: acc.gross + toBase(t.gross, inv), paid: acc.paid + toBase(inv.paid, inv) };
			},
			{ net: 0, vat: 0, gross: 0, paid: 0 }
		)
	);

	const shift = (delta: number) => (month = dayjs(`${month}-01`).add(delta, 'month').format('YYYY-MM'));

	$effect(() => {
		ui.context = `books ${month}`;
		ui.hints = 'h/l month · v issued/paid · P print the month';
		return () => {
			ui.context = '';
			ui.hints = '';
		};
	});

	$effect(() =>
		keys.use({
			h: () => shift(-1),
			l: () => shift(1),
			arrowleft: () => shift(-1),
			arrowright: () => shift(1),
			v: () => (view = view === 'issued' ? 'paid' : 'issued'),
			P: () => printInvoices(rows.map((inv) => inv.id))
		})
	);
</script>

<svelte:head><title>Books · openinvoice</title></svelte:head>

<div class="flex flex-col gap-5 px-5 pt-4 pb-8">
	<div>
		<h1 class="text-lg font-semibold">Books</h1>
		<p class="mt-0.5 text-[13px] text-muted">Sales and payments per month, converted to {base} with the latest ECB rate{data.rate ? ` (${data.rate.date})` : ''}.</p>
	</div>

	<section class="rounded-lg border border-line bg-panel p-4">
		<MonthChart {bars} currency={base} {lang} selected={month} onselect={(m) => (month = m)} />
	</section>

	<section class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-2">
			<button class="btn h-8 w-8 px-0" aria-label="Previous month" onclick={() => shift(-1)}>‹</button>
			<h2 class="min-w-36 text-center font-semibold">{dayjs(`${month}-01`).format('MMMM YYYY')}</h2>
			<button class="btn h-8 w-8 px-0" aria-label="Next month" onclick={() => shift(1)}>›</button>
			<span class="text-xs text-muted"><Kbd keys="h" /> <Kbd keys="l" /></span>
			<div role="group" aria-label="View" class="ml-3 flex overflow-hidden rounded-md border border-line text-xs">
				<button class={['px-2.5 py-1.5', view === 'issued' ? 'bg-ink text-bg' : 'bg-panel text-muted']} aria-pressed={view === 'issued'} onclick={() => (view = 'issued')}>Issued</button>
				<button class={['px-2.5 py-1.5', view === 'paid' ? 'bg-ink text-bg' : 'bg-panel text-muted']} aria-pressed={view === 'paid'} onclick={() => (view = 'paid')}>Paid</button>
			</div>
			<button class="btn ml-auto" disabled={!rows.length} onclick={() => printInvoices(rows.map((inv) => inv.id))}>Print all {rows.length} <Kbd keys="P" /></button>
		</div>

		<div class="overflow-x-auto rounded-lg border border-line bg-panel">
			<table class="w-full min-w-[760px] border-collapse text-[13px]">
				<thead>
					<tr class="text-left text-xs text-muted">
						<th class="border-b border-line px-3 py-2 font-medium">Number</th>
						<th class="border-b border-line px-3 py-2 font-medium">Client</th>
						<th class="border-b border-line px-3 py-2 font-medium">Issued</th>
						<th class="border-b border-line px-3 py-2 font-medium">Paid on</th>
						<th class="border-b border-line px-3 py-2 text-right font-medium">Net</th>
						<th class="border-b border-line px-3 py-2 text-right font-medium">VAT</th>
						<th class="border-b border-line px-3 py-2 text-right font-medium">Gross</th>
						<th class="border-b border-line px-3 py-2 font-medium">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as inv (inv.id)}
						{@const t = totals(inv)}
						<tr class="border-t border-line-soft hover:bg-sunken">
							<td class="px-3 py-2 font-mono text-xs"><a href="/invoices/{inv.id}" class="hover:text-accent">{inv.number}</a></td>
							<td class="max-w-[280px] truncate px-3 py-2">{inv.client.name}</td>
							<td class="px-3 py-2 text-muted">{inv.issueDate}</td>
							<td class="px-3 py-2 text-muted">{inv.paymentDate ?? '—'}</td>
							<td class="px-3 py-2 text-right font-mono text-xs">{money(t.net, lang)}</td>
							<td class="px-3 py-2 text-right font-mono text-xs">{money(t.vat, lang)}</td>
							<td class="px-3 py-2 text-right font-mono text-xs whitespace-nowrap">{money(t.gross, lang)} {inv.currency}</td>
							<td class="px-3 py-2"><StatusPill status={status(inv, data.usesKsef)} invoice={inv} /></td>
						</tr>
					{:else}
						<tr><td colspan="8" class="px-3 py-8 text-center text-muted">No invoices {view === 'issued' ? 'issued' : 'paid'} in this month.</td></tr>
					{/each}
				</tbody>
				{#if rows.length}
					<tfoot>
						<tr class="border-t border-line font-medium">
							<td colspan="4" class="px-3 py-2">{rows.length} {rows.length === 1 ? 'invoice' : 'invoices'} · in {base}{view === 'paid' ? ` · received ${money(sums.paid, lang)}` : ''}</td>
							<td class="px-3 py-2 text-right font-mono text-xs">{money(sums.net, lang)}</td>
							<td class="px-3 py-2 text-right font-mono text-xs">{money(sums.vat, lang)}</td>
							<td class="px-3 py-2 text-right font-mono text-xs">{money(sums.gross, lang)}</td>
							<td></td>
						</tr>
					</tfoot>
				{/if}
			</table>
		</div>
	</section>

	{#if rates.length}
		<section>
			<h2 class="label-caps mb-2">Exchange rates (1 EUR)</h2>
			<div class="overflow-x-auto rounded-lg border border-line bg-panel">
				<table class="w-full min-w-[420px] border-collapse font-mono text-xs">
					<thead><tr class="text-left text-muted"><th class="px-3 py-2 font-medium">Date</th><th class="px-3 py-2 text-right font-medium">PLN</th><th class="px-3 py-2 text-right font-medium">USD</th><th class="px-3 py-2 text-right font-medium">GBP</th></tr></thead>
					<tbody>
						{#each rates as rate (rate.date)}
							<tr class="border-t border-line-soft"><td class="px-3 py-1.5">{rate.date}</td><td class="px-3 py-1.5 text-right">{rate.PLN.toFixed(4)}</td><td class="px-3 py-1.5 text-right">{rate.USD.toFixed(4)}</td><td class="px-3 py-1.5 text-right">{rate.GBP.toFixed(4)}</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</div>
