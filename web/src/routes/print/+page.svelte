<script lang="ts">
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import { data } from '#lib/state/data.svelte.js';
	import { errorMessage } from '#lib/state/toast.svelte.js';
	import InvoicePaper from '#lib/ui/InvoicePaper.svelte';

	const ids = (page.url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
	let error = $state('');

	const invoices = $derived(ids.map((id) => data.invoice(id)).filter((inv) => inv !== undefined));

	// "invoice_0003_10_2026_nordlys_studio_acme" is what "Save as PDF" suggests
	const slug = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
	const title = $derived(
		invoices.length === 1
			? `invoice_${slug(invoices[0].number)}_${slug(data.company.name).slice(0, 24)}_${slug(invoices[0].client.name).slice(0, 24)}`
			: `invoices_${invoices.length}`
	);

	// the layout loads the data; print once it is there
	let printed = false;
	$effect(() => {
		if (!data.loaded || printed) return;
		printed = true;
		(async () => {
			try {
				await tick();
				// fonts and the logo must be there before the print dialog snapshots the page
				await document.fonts.ready;
				await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((resolve) => (img.onload = img.onerror = resolve)))));
				if (invoices.length) window.print();
			} catch (e) {
				error = errorMessage(e);
			}
		})();
	});
</script>

<svelte:head><title>{title}</title></svelte:head>
<svelte:window onafterprint={() => window.close()} />

<div class="print-root min-h-dvh bg-sunken py-8 print:min-h-0 print:bg-white print:py-0">
	{#if error}
		<p class="text-center text-bad">{error}</p>
	{:else if !data.loaded}
		<p class="text-center text-muted">Preparing…</p>
	{:else if !invoices.length}
		<p class="text-center text-muted">Nothing to print: the invoices are not in the selected company and mode.</p>
	{:else}
		<div class="flex flex-col items-center gap-8 print:block">
			<!-- a break before every invoice but the first; a break after the last one printed an empty page -->
			{#each invoices as invoice (invoice.id)}
				<div class="shadow-lg print:shadow-none print:[&:not(:first-child)]:break-before-page"><InvoicePaper {invoice} company={data.company} /></div>
			{/each}
		</div>
	{/if}
</div>

<style>
	@page {
		size: A4;
		margin: 14mm 13mm;
	}
</style>
