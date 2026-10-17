<script lang="ts">
	import { isExempt, itemNet, itemVat, money, paymentLabel, totals, unitLabel } from '../invoice';
	import { qrSvg } from '../qr';
	import type { Company, Invoice } from '../types';
	import { inWords } from '../words';

	let { invoice, company }: { invoice: Invoice; company: Company } = $props();

	// Polish companies: Polish labels and only the elements art. 106e of the VAT act requires
	const pl = $derived(company.country === 'PL');
	const lang = $derived(pl ? 'pl' : 'en');
	const sum = $derived(totals(invoice));
	const exempt = $derived(invoice.items.some((item) => isExempt(item.vat)));
	// VAT amounts may be left out when nothing is taxed (art. 106e ust. 4 pkt 3)
	const showVat = $derived(!pl || invoice.items.some((item) => item.vat.value > 0));
	const fmt = (value: number) => `${money(value, lang)} ${invoice.currency}`;
	const testInvoice = $derived(!invoice.livemode || invoice.ksefEnv === 'demo' || invoice.ksefEnv === 'test');

	const t = $derived(
		pl
			? { invoice: 'Faktura', issued: 'Data wystawienia', sold: 'Data sprzedaży', place: 'Miejsce wystawienia', seller: 'Sprzedawca', buyer: 'Nabywca', no: 'Lp.', name: 'Nazwa towaru lub usługi', unit: 'J.m.', qty: 'Ilość', price: 'Cena netto', net: 'Wartość netto', rate: 'Stawka VAT', vat: 'Kwota VAT', gross: 'Wartość brutto', total: 'Razem', payment: 'Forma płatności', account: 'Numer rachunku', due: 'Termin płatności', toPay: 'Do zapłaty' }
			: { invoice: 'Invoice', issued: 'Issue date', sold: 'Sale date', place: 'Issued in', seller: 'Seller', buyer: 'Buyer and payer', no: 'No.', name: 'Product or service', unit: 'Unit', qty: 'Qty', price: 'Net price', net: 'Total net', rate: 'VAT', vat: 'VAT amount', gross: 'Total gross', total: 'Total', payment: 'Payment type', account: 'Bank account', due: 'Due date', toPay: 'Amount due' }
	);
</script>

<article class="paper mx-auto flex flex-col gap-7 bg-white text-[12px] leading-[1.5] text-black">
	<header class="flex items-start justify-between gap-6">
		<div class="flex items-center gap-4">
			{#if company.logo}<img src={company.logo} alt={company.name} class="h-16 w-16 object-contain" />{/if}
			<div>
				<h1 class="text-[22px] font-semibold tracking-tight">{t.invoice} {invoice.number}</h1>
				{#if testInvoice}<p class="text-[11px] font-semibold text-red-700">{pl ? 'FAKTURA TESTOWA — bez skutków prawnych' : 'TEST INVOICE — no legal effect'}</p>{/if}
			</div>
		</div>
		<dl class="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-right">
			{#if invoice.issuePlace}<dt class="text-neutral-600">{t.place}</dt><dd>{invoice.issuePlace}</dd>{/if}
			<dt class="text-neutral-600">{t.issued}</dt><dd class="font-mono">{invoice.issueDate}</dd>
			<!-- the sale date is required only when it differs from the issue date -->
			{#if !pl || invoice.saleDate !== invoice.issueDate}<dt class="text-neutral-600">{t.sold}</dt><dd class="font-mono">{invoice.saleDate}</dd>{/if}
		</dl>
	</header>

	<section class="grid grid-cols-2 gap-8">
		<div>
			<h2 class="mb-1 text-[10px] font-semibold tracking-[0.08em] text-neutral-600 uppercase">{t.seller}</h2>
			<p class="font-semibold">{company.name}</p>
			<p>{company.address}</p>
			{#if pl}<p>NIP {company.tin}</p>{:else}<p class="whitespace-pre-line">{company.info}</p>{/if}
		</div>
		<div>
			<h2 class="mb-1 text-[10px] font-semibold tracking-[0.08em] text-neutral-600 uppercase">{t.buyer}</h2>
			<p class="font-semibold">{invoice.client.name}</p>
			<p>{invoice.client.street}{invoice.client.street ? ', ' : ''}{invoice.client.post} {invoice.client.city}{invoice.client.country && invoice.client.country !== 'Poland' ? `, ${invoice.client.country}` : ''}</p>
			{#if invoice.client.tin}<p>{invoice.client.tinName || 'NIP'} {invoice.client.tin}</p>{/if}
		</div>
	</section>

	<table class="w-full border-collapse">
		<thead>
			<tr class="border-b border-black text-left text-[10px] tracking-[0.04em] text-neutral-600 uppercase">
				<th class="py-1.5 pr-2 font-medium">{t.no}</th>
				<th class="py-1.5 pr-2 font-medium">{t.name}</th>
				<th class="py-1.5 pr-2 font-medium">{t.unit}</th>
				<th class="py-1.5 pr-2 text-right font-medium">{t.qty}</th>
				<th class="py-1.5 pr-2 text-right font-medium">{t.price}</th>
				<th class="py-1.5 pr-2 text-right font-medium">{t.net}</th>
				<th class="py-1.5 pr-2 text-right font-medium">{t.rate}</th>
				{#if showVat}
					<th class="py-1.5 pr-2 text-right font-medium">{t.vat}</th>
					<th class="py-1.5 text-right font-medium">{t.gross}</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#each invoice.items as item, index (index)}
				<tr class="border-b border-neutral-200 align-top">
					<td class="py-1.5 pr-2">{index + 1}</td>
					<td class="py-1.5 pr-2">{item.name}</td>
					<td class="py-1.5 pr-2">{unitLabel(item.unit, pl)}</td>
					<td class="py-1.5 pr-2 text-right font-mono">{item.quantity}</td>
					<td class="py-1.5 pr-2 text-right font-mono">{money(item.priceNet, lang)}</td>
					<td class="py-1.5 pr-2 text-right font-mono">{money(itemNet(item), lang)}</td>
					<td class="py-1.5 pr-2 text-right">{item.vat.name}</td>
					{#if showVat}
						<td class="py-1.5 pr-2 text-right font-mono">{money(itemVat(item), lang)}</td>
						<td class="py-1.5 text-right font-mono">{money(itemNet(item) + itemVat(item), lang)}</td>
					{/if}
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<tr class="font-semibold">
				<td colspan="5" class="py-1.5 pr-2">{t.total}</td>
				<td class="py-1.5 pr-2 text-right font-mono">{money(sum.net, lang)}</td>
				<td class="py-1.5 pr-2 text-right">—</td>
				{#if showVat}
					<td class="py-1.5 pr-2 text-right font-mono">{money(sum.vat, lang)}</td>
					<td class="py-1.5 text-right font-mono">{money(sum.gross, lang)}</td>
				{/if}
			</tr>
		</tfoot>
	</table>

	{#if pl && exempt && company.vatExemptionBasis}
		<p>Podstawa zwolnienia z VAT: {company.vatExemptionBasis}</p>
	{/if}

	<section class="grid grid-cols-[3fr_2fr] gap-8">
		<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
			<dt class="text-neutral-600">{t.payment}</dt><dd class="text-right">{paymentLabel(invoice.paymentForm, pl)}</dd>
			{#if invoice.bankAccountNumber}<dt class="text-neutral-600">{t.account}</dt><dd class="text-right font-mono whitespace-nowrap">{invoice.bankAccountNumber}</dd>{/if}
			<dt class="text-neutral-600">{t.due}</dt><dd class="text-right font-mono">{invoice.deadlineDate}</dd>
			{#if invoice.paid}<dt class="text-neutral-600">{pl ? 'Zapłacono' : 'Paid'}</dt><dd class="text-right font-mono">{fmt(invoice.paid)}{invoice.paymentDate ? `, ${invoice.paymentDate}` : ''}</dd>{/if}
		</dl>
		<div class="flex flex-col items-end justify-center gap-1">
			<p class="text-[11px] tracking-[0.04em] text-neutral-600 uppercase">{t.toPay}</p>
			<p class="font-mono text-[20px] font-semibold">{fmt(sum.gross - (invoice.paid || 0))}</p>
			{#if !pl}<p class="text-right text-[11px] text-neutral-600">In words: {inWords(sum.gross)} and {Math.round((sum.gross % 1) * 100)}/100 {invoice.currency}</p>{/if}
		</div>
	</section>

	{#if invoice.publicNote}<p class="whitespace-pre-line text-neutral-800">{invoice.publicNote}</p>{/if}

	<!-- KSeF visualisation: verification QR code with the KSeF number under it -->
	{#if invoice.ksefNumber && invoice.ksefQrUrl}
		<div class="flex items-end gap-3">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div>{@html qrSvg(invoice.ksefQrUrl)}</div>
			<div class="pb-1 text-[10px]">
				<p>KSeF: <span class="font-mono">{invoice.ksefNumber}</span></p>
				{#if testInvoice}<p class="text-red-700">{invoice.ksefEnv === 'test' ? 'KSeF TEST' : 'KSeF DEMO'} — {pl ? 'bez skutków prawnych' : 'no legal effect'}</p>{/if}
			</div>
		</div>
	{/if}

	{#if !pl}
		<section class="mt-auto grid grid-cols-2 gap-16 pt-8 text-center text-[10px] text-neutral-600">
			<div>
				<div class="flex h-24 flex-col items-center justify-end border-b border-neutral-400 pb-1">
					{#if company.signature}<img src={company.signature} alt="" class="max-h-16" />{/if}
					<p class="text-[12px] text-black">{invoice.issuerName}</p>
				</div>
				<p class="mt-1">Signature of the person authorized to issue the invoice</p>
			</div>
			<div>
				<div class="flex h-24 items-end justify-center border-b border-neutral-400 pb-1"><p class="text-[12px] text-black">{invoice.receiverName}</p></div>
				<p class="mt-1">Signature of the person authorized to collect the invoice</p>
			</div>
		</section>
	{/if}
</article>

<style>
	.paper {
		width: 210mm;
		min-height: 297mm;
		padding: 16mm 15mm;
		box-sizing: border-box;
	}
	@media print {
		.paper {
			width: auto;
			min-height: 0;
			padding: 0;
			break-after: page;
		}
	}
</style>
