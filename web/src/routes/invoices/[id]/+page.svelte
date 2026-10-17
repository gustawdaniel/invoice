<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import dayjs from 'dayjs';
	import {
		CURRENCIES,
		PAYMENT_FORMS,
		UNITS,
		VATS,
		deadlineFor,
		draftInvoice,
		itemNet,
		itemVat,
		money,
		newItem,
		nextNumber,
		status,
		totals
	} from '#lib/invoice.js';
	import { data } from '#lib/state/data.svelte.js';
	import { keys } from '#lib/state/keys.svelte.js';
	import { session } from '#lib/state/session.svelte.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import { ui } from '#lib/state/ui.svelte.js';
	import type { Client, Invoice, PaymentKey } from '#lib/types.js';
	import { printInvoices } from '#lib/ui/actions.js';
	import ClientPicker from '#lib/ui/ClientPicker.svelte';
	import InvoicePaper from '#lib/ui/InvoicePaper.svelte';
	import Kbd from '#lib/ui/Kbd.svelte';
	import KsefSend from '#lib/ui/KsefSend.svelte';
	import StatusPill from '#lib/ui/StatusPill.svelte';

	const clone = (invoice: Invoice): Invoice => JSON.parse(JSON.stringify(invoice));

	function initial(): Invoice | null {
		if (page.params.id !== 'new') {
			const found = data.invoice(page.params.id ?? '');
			return found ? clone(found) : null;
		}
		const draft = ui.draft ?? draftInvoice(data.company, data.invoices, session.user?.full_name ?? '', session.testMode);
		ui.draft = null;
		return draft;
	}

	const start = initial();
	let invoice = $state<Invoice | null>(start);
	let saved = $state(start ? JSON.stringify(start) : '');
	let saving = $state(false);
	let sending = $state<Invoice | null>(null);
	let numberTouched = $state(false);
	let dueText = $state(start?.deadlineDate ?? '');
	let previewWidth = $state(0);
	let leaveAnyway = false;

	// another invoice opened from the palette while this page stays mounted
	$effect(() => {
		const id = page.params.id;
		if (invoice && (id === 'new' ? invoice.id === '' : invoice.id === id)) return;
		invoice = initial();
		saved = invoice ? JSON.stringify(invoice) : '';
		dueText = invoice?.deadlineDate ?? '';
		numberTouched = false;
	});

	const dirty = $derived(invoice !== null && JSON.stringify(invoice) !== saved);
	const locked = $derived(Boolean(invoice?.ksefNumber));
	const lang = $derived(data.company.country === 'PL' ? 'pl' : 'en');
	const sum = $derived(invoice ? totals(invoice) : { net: 0, vat: 0, gross: 0 });
	// the paper is 210 mm wide (≈794 px), scaled down to the column
	const zoom = $derived(previewWidth ? Math.min(1, previewWidth / 794) : 0.6);

	$effect(() => {
		ui.context = invoice ? `${invoice.number}${dirty ? ' [+]' : ''}` : '';
		ui.hints = locked ? 'in KSeF: only payment can change · p pdf · ctrl-o back' : '⌘S save · ⌘↵ send to KSeF · o add item · esc leave field · ctrl-o back';
		return () => {
			ui.context = '';
			ui.hints = '';
		};
	});

	beforeNavigate((navigation) => {
		if (!dirty || leaveAnyway || navigation.type === 'leave') return;
		navigation.cancel();
		leaveAnyway = true;
		toasts.show('Unsaved changes', '⌘S saves them. Leave again to discard.', 'warn');
		setTimeout(() => (leaveAnyway = false), 4000);
	});

	function pickClient(client: Client) {
		if (!invoice) return;
		invoice.client = client;
		invoice.clientId = client.id;
	}

	function onIssueDate() {
		if (!invoice) return;
		if (!invoice.id && !numberTouched) invoice.number = nextNumber(data.invoices, invoice.issueDate);
		if (invoice.saleDate < invoice.issueDate || !invoice.saleDate) invoice.saleDate = invoice.issueDate;
		setDeadline(deadlineFor(invoice.issueDate, invoice.paymentForm));
	}

	function onPayment(key: PaymentKey) {
		if (!invoice) return;
		invoice.paymentForm = key;
		setDeadline(deadlineFor(invoice.issueDate, key));
	}

	function setDeadline(date: string) {
		if (!invoice) return;
		invoice.deadlineDate = date;
		dueText = date;
	}

	// "+14d" or "+2w" relative to the issue date, or a plain date
	function onDue() {
		if (!invoice) return;
		const relative = dueText.trim().match(/^\+?(\d+)\s*([dw]?)$/i);
		if (relative) {
			const days = Number(relative[1]) * (relative[2].toLowerCase() === 'w' ? 7 : 1);
			setDeadline(dayjs(invoice.issueDate).add(days, 'day').format('YYYY-MM-DD'));
		} else if (dayjs(dueText).isValid()) setDeadline(dayjs(dueText).format('YYYY-MM-DD'));
		else dueText = invoice.deadlineDate;
	}

	function addItem() {
		if (!invoice || locked) return;
		invoice.items.push(newItem(data.company, invoice.items.at(-1)));
		// focus the new row's name
		setTimeout(() => document.querySelector<HTMLInputElement>(`#item-name-${invoice!.items.length - 1}`)?.focus());
	}

	function problems(inv: Invoice): string[] {
		const result: string[] = [];
		if (!inv.clientId) result.push('pick the buyer');
		if (!inv.number.trim()) result.push('give it a number');
		if (!inv.items.length) result.push('add at least one item');
		if (inv.items.some((item) => !item.name.trim())) result.push('name every item');
		if (data.invoices.some((other) => other.id !== inv.id && other.number === inv.number)) result.push(`number ${inv.number} is already used`);
		return result;
	}

	async function save(): Promise<Invoice | null> {
		if (!invoice || saving) return null;
		const issues = problems(invoice);
		if (issues.length) {
			toasts.show('Not saved yet', `To save: ${issues.join(', ')}.`, 'warn');
			return null;
		}
		saving = true;
		try {
			const wasNew = !invoice.id;
			const result = await data.saveInvoice(invoice);
			invoice = clone(result);
			saved = JSON.stringify(invoice);
			toasts.ok(wasNew ? 'Invoice created' : 'Saved', result.number);
			if (wasNew) await goto(`/invoices/${result.id}`, { replace: true });
			return result;
		} catch (error) {
			toasts.error('Could not save', error);
			return null;
		} finally {
			saving = false;
		}
	}

	async function send() {
		if (!invoice || locked || !data.usesKsef) return;
		if (!data.ksefConnected) {
			toasts.show('KSeF is not connected', 'Connect it on the Company page (gs).', 'warn');
			return;
		}
		const current = dirty || !invoice.id ? await save() : invoice;
		if (current) sending = current;
	}

	function print() {
		if (!invoice?.id) toasts.show('Save first', 'The PDF is made from the saved invoice.', 'warn');
		else if (dirty) toasts.show('Save first', 'The PDF would not have your latest changes.', 'warn');
		else printInvoices([invoice.id]);
	}

	$effect(() =>
		keys.use({
			'mod-s': () => save(),
			'mod-enter': () => send(),
			o: addItem,
			p: print,
			i: () => document.querySelector<HTMLInputElement>('#client-picker')?.focus()
		})
	);
</script>

<svelte:head><title>{invoice?.number ?? 'Invoice'} · openinvoice</title></svelte:head>

{#if !invoice}
	<div class="p-10 text-center text-muted">
		<p>This invoice is not in {session.testMode ? 'test' : 'live'} mode of {data.company.name}.</p>
		<a href="/" class="btn mt-4">Back to invoices</a>
	</div>
{:else}
	<div class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-panel px-5 py-2.5">
		<nav aria-label="Breadcrumb" class="text-[13px] text-muted">
			<a href="/" class="hover:text-ink">Invoices</a> /
			<span class="font-mono text-ink">{invoice.number || 'new'}</span>
		</nav>
		{#if invoice.id}<StatusPill status={status(invoice, data.usesKsef)} {invoice} />{:else}<span class="rounded-full bg-sunken px-2 py-0.5 text-xs text-muted">New · {invoice.livemode ? 'live' : 'test'}</span>{/if}
		{#if dirty}<span class="text-xs text-warn">unsaved</span>{/if}
		{#if invoice.createdByAgent}<span class="text-xs text-muted">drafted by <span class="font-mono">{invoice.createdByAgent}</span></span>{/if}
		<div class="ml-auto flex flex-wrap gap-1.5">
			<button class="btn" onclick={print}>PDF <Kbd keys="p" /></button>
			<button class="btn" disabled={saving || (!dirty && Boolean(invoice.id))} onclick={save}>{saving ? 'Saving…' : 'Save'} <Kbd keys="⌘S" /></button>
			{#if data.usesKsef && !locked}
				<button class="btn-primary" disabled={!data.ksefConnected} title={data.ksefConnected ? '' : 'Connect KSeF on the Company page'} onclick={send}>
					{invoice.livemode ? 'Send to KSeF' : 'Send to KSeF DEMO'} <Kbd keys="⌘↵" tone="inverse" />
				</button>
			{/if}
		</div>
	</div>

	{#if locked}
		<p class="border-b border-ok/30 bg-ok-soft px-5 py-2 text-[13px] text-ok">
			In KSeF as <span class="font-mono">{invoice.ksefNumber}</span>. It cannot be changed any more; only the payment and the private note can.
		</p>
	{:else if invoice.ksefError}
		<p class="border-b border-bad/30 bg-bad-soft px-5 py-2 text-[13px] text-bad">KSeF rejected the last attempt: {invoice.ksefError}</p>
	{/if}

	<div class="flex flex-1 flex-wrap gap-6 p-5">
		<form class="flex min-w-0 flex-[999_1_520px] flex-col gap-4" onsubmit={(event) => { event.preventDefault(); void save(); }}>
			<fieldset disabled={locked} class="rounded-lg border border-line bg-panel p-4">
				<legend class="px-1 text-xs font-semibold text-muted">Buyer</legend>
				<ClientPicker client={invoice.client} onpick={pickClient} disabled={locked} />
				{#if invoice.client.name}
					<p class="mt-1.5 text-xs text-muted">
						{[invoice.client.tin && `${invoice.client.tinName || 'NIP'} ${invoice.client.tin}`, [invoice.client.street, invoice.client.post, invoice.client.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
					</p>
				{/if}
			</fieldset>

			<fieldset disabled={locked} class="grid grid-cols-4 gap-3 rounded-lg border border-line bg-panel p-4 max-sm:grid-cols-2">
				<legend class="px-1 text-xs font-semibold text-muted">Number, dates &amp; payment</legend>
				<div>
					<label for="f-number" class="mb-1 block text-xs text-muted">Number</label>
					<input id="f-number" bind:value={invoice.number} oninput={() => (numberTouched = true)} class="field font-mono text-xs" />
				</div>
				<div>
					<label for="f-issue" class="mb-1 block text-xs text-muted">Issued</label>
					<input id="f-issue" type="date" bind:value={invoice.issueDate} onchange={onIssueDate} class="field font-mono text-xs" />
				</div>
				<div>
					<label for="f-sale" class="mb-1 block text-xs text-muted">Sale</label>
					<input id="f-sale" type="date" bind:value={invoice.saleDate} class="field font-mono text-xs" />
				</div>
				<div>
					<label for="f-due" class="mb-1 block text-xs text-muted">Due <span class="text-faint">(+14d)</span></label>
					<input id="f-due" bind:value={dueText} onchange={onDue} class="field font-mono text-xs" />
				</div>
				<div class="col-span-2">
					<label for="f-payment" class="mb-1 block text-xs text-muted">Payment</label>
					<select id="f-payment" value={invoice.paymentForm} onchange={(event) => onPayment(event.currentTarget.value as PaymentKey)} class="field">
						{#each PAYMENT_FORMS as form (form.key)}<option value={form.key}>{form.en}</option>{/each}
					</select>
				</div>
				<div>
					<label for="f-currency" class="mb-1 block text-xs text-muted">Currency</label>
					<select id="f-currency" bind:value={invoice.currency} class="field">
						{#each CURRENCIES as currency (currency)}<option>{currency}</option>{/each}
					</select>
				</div>
				<div>
					<label for="f-place" class="mb-1 block text-xs text-muted">Place of issue</label>
					<input id="f-place" bind:value={invoice.issuePlace} class="field" />
				</div>
			</fieldset>

			<fieldset disabled={locked} class="rounded-lg border border-line bg-panel p-4">
				<legend class="px-1 text-xs font-semibold text-muted">Items</legend>
				<div class="overflow-x-auto">
					<table class="w-full min-w-[620px] border-collapse text-[13px]">
						<thead>
							<tr class="text-left text-xs text-muted">
								<th class="px-1 pb-1 font-medium">Name</th>
								<th class="w-20 px-1 pb-1 text-right font-medium">Qty</th>
								<th class="w-28 px-1 pb-1 font-medium">Unit</th>
								<th class="w-32 px-1 pb-1 text-right font-medium">Net price</th>
								<th class="w-24 px-1 pb-1 font-medium">VAT</th>
								<th class="w-28 px-1 pb-1 text-right font-medium">Gross</th>
								<th class="w-8"></th>
							</tr>
						</thead>
						<tbody>
							{#each invoice.items as item, index (index)}
								<tr>
									<td class="p-1"><input id="item-name-{index}" aria-label="Item name" bind:value={item.name} class="field" /></td>
									<td class="p-1"><input aria-label="Quantity" type="number" step="any" min="0" bind:value={item.quantity} class="field text-right font-mono text-xs" /></td>
									<td class="p-1">
										<select aria-label="Unit" bind:value={item.unit} class="field">
											{#each UNITS as unit (unit)}<option>{unit}</option>{/each}
										</select>
									</td>
									<td class="p-1"><input aria-label="Net price" type="number" step="0.01" bind:value={item.priceNet} class="field text-right font-mono text-xs" /></td>
									<td class="p-1">
										<select
											aria-label="VAT rate"
											value={item.vat.name}
											onchange={(event) => (item.vat = VATS.find((vat) => vat.name === event.currentTarget.value) ?? item.vat)}
											class="field"
										>
											{#each VATS as vat (vat.name)}<option>{vat.name}</option>{/each}
										</select>
									</td>
									<td class="p-1 text-right font-mono text-xs">{money(itemNet(item) + itemVat(item), lang)}</td>
									<td class="p-1 text-center">
										<button type="button" class="rounded px-1.5 text-faint hover:bg-bad-soft hover:text-bad" aria-label="Remove item {index + 1}" onclick={() => invoice?.items.splice(index, 1)}>×</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="mt-2 flex flex-wrap items-center gap-3">
					<button type="button" class="btn" onclick={addItem}>+ Item <Kbd keys="o" /></button>
					<p class="ml-auto text-right text-xs text-muted">
						net <span class="font-mono">{money(sum.net, lang)}</span> · VAT <span class="font-mono">{money(sum.vat, lang)}</span> ·
						<span class="text-sm text-ink">total <strong class="font-mono font-medium">{money(sum.gross, lang)} {invoice.currency}</strong></span>
					</p>
				</div>
			</fieldset>

			<fieldset disabled={locked} class="grid grid-cols-2 gap-3 rounded-lg border border-line bg-panel p-4 max-sm:grid-cols-1">
				<legend class="px-1 text-xs font-semibold text-muted">Seller details <span class="font-normal text-faint">— prefilled from company defaults</span></legend>
				<div>
					<label for="f-account" class="mb-1 block text-xs text-muted">Bank account</label>
					<input id="f-account" bind:value={invoice.bankAccountNumber} class="field font-mono text-xs" />
				</div>
				<div>
					<label for="f-issuer" class="mb-1 block text-xs text-muted">Issuer</label>
					<input id="f-issuer" bind:value={invoice.issuerName} class="field" />
				</div>
				<div class="col-span-2 max-sm:col-span-1">
					<label for="f-note" class="mb-1 block text-xs text-muted">Public note <span class="text-faint">(printed)</span></label>
					<textarea id="f-note" rows="2" bind:value={invoice.publicNote} class="field"></textarea>
				</div>
			</fieldset>

			<fieldset class="grid grid-cols-3 gap-3 rounded-lg border border-line bg-panel p-4 max-sm:grid-cols-1">
				<legend class="px-1 text-xs font-semibold text-muted">Payment received &amp; private note</legend>
				<div>
					<label for="f-paid" class="mb-1 block text-xs text-muted">Paid ({invoice.currency})</label>
					<input id="f-paid" type="number" step="0.01" min="0" bind:value={invoice.paid} class="field text-right font-mono text-xs" />
				</div>
				<div>
					<label for="f-paid-on" class="mb-1 block text-xs text-muted">Paid on</label>
					<input id="f-paid-on" type="date" value={invoice.paymentDate ?? ''} onchange={(event) => invoice && (invoice.paymentDate = event.currentTarget.value || null)} class="field font-mono text-xs" />
				</div>
				<div class="flex items-end">
					<button type="button" class="btn w-full" onclick={() => { if (invoice) { invoice.paid = sum.gross; invoice.paymentDate = dayjs().format('YYYY-MM-DD'); } }}>Paid in full today</button>
				</div>
				<div class="col-span-3 max-sm:col-span-1">
					<label for="f-private" class="mb-1 block text-xs text-muted">Private note <span class="text-faint">(only in the app)</span></label>
					<textarea id="f-private" rows="2" bind:value={invoice.privateNote} class="field"></textarea>
				</div>
			</fieldset>
		</form>

		<aside aria-label="Print preview" class="flex min-w-0 flex-[1_1_380px] flex-col gap-2 xl:max-w-[560px]">
			<div class="flex justify-between text-xs text-muted"><span>Preview · A4 · {lang.toUpperCase()}</span><span>live</span></div>
			<div bind:clientWidth={previewWidth} class="overflow-hidden rounded border border-line shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
				<div style:zoom={zoom}><InvoicePaper {invoice} company={data.company} /></div>
			</div>
		</aside>
	</div>
{/if}

{#if sending}<KsefSend invoice={sending} onclose={() => { sending = null; const fresh = invoice && data.invoice(invoice.id); if (fresh) { invoice = clone(fresh); saved = JSON.stringify(invoice); } }} />{/if}
