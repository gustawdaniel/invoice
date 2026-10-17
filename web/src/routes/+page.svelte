<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { exchange, gross, money, status } from '#lib/invoice.js';
	import { filterInvoices, sortInvoices } from '#lib/search.js';
	import { data } from '#lib/state/data.svelte.js';
	import { keys } from '#lib/state/keys.svelte.js';
	import { session } from '#lib/state/session.svelte.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import { ui } from '#lib/state/ui.svelte.js';
	import type { Invoice } from '#lib/types.js';
	import { copyNumber, duplicate, markPaid, printInvoices } from '#lib/ui/actions.js';
	import Confirm from '#lib/ui/Confirm.svelte';
	import InvoiceSide from '#lib/ui/InvoiceSide.svelte';
	import Kbd from '#lib/ui/Kbd.svelte';
	import KsefSend from '#lib/ui/KsefSend.svelte';
	import StatusPill from '#lib/ui/StatusPill.svelte';

	let query = $state(page.url.searchParams.get('q') ?? '');
	let selectedId = $state<string | null>(null);
	let search: HTMLInputElement | undefined = $state();
	let tbody: HTMLTableSectionElement | undefined = $state();
	let sending = $state<Invoice | null>(null);
	let deleting = $state<Invoice | null>(null);

	// a saved search link changes ?q= while the page stays mounted
	$effect(() => {
		query = page.url.searchParams.get('q') ?? '';
	});

	const lang = $derived(data.company.country === 'PL' ? 'pl' : 'en');
	const baseCurrency = $derived(data.company.country === 'PL' ? 'PLN' : 'EUR');
	const shown = $derived(sortInvoices(filterInvoices(data.invoices, query, data.usesKsef)));
	const index = $derived(Math.max(0, shown.findIndex((inv) => inv.id === selectedId)));
	const selected = $derived(shown[index] ?? null);
	const sumGross = $derived(shown.reduce((sum, inv) => sum + exchange(gross(inv), inv.currency, baseCurrency, data.rate), 0));

	$effect(() => {
		ui.context = shown.length ? `invoices ${index + 1}/${shown.length}` : 'no invoices';
		ui.hints = 'j/k move · enter open · a send · p pdf · D duplicate · m paid · / search';
		return () => {
			ui.context = '';
			ui.hints = '';
		};
	});

	$effect(() => {
		tbody?.querySelector(`[data-id="${selected?.id}"]`)?.scrollIntoView({ block: 'nearest' });
	});

	function moveTo(next: number) {
		if (!shown.length) return;
		selectedId = shown[Math.min(shown.length - 1, Math.max(0, next))].id;
	}

	function syncUrl() {
		const url = new URL(page.url.href);
		if (query) url.searchParams.set('q', query);
		else url.searchParams.delete('q');
		// shallow: the URL keeps the query for reloads and links, the page is not reloaded
		void goto(url, { shallow: true, replace: true, state: {} });
	}

	function send(inv: Invoice | null) {
		if (!inv || inv.ksefNumber || inv.outsideKsef || !data.usesKsef) return;
		if (!data.ksefConnected) {
			toasts.show('KSeF is not connected', 'Connect it on the Company page (gs).', 'warn');
			return;
		}
		sending = inv;
	}

	async function dismiss(inv: Invoice | null) {
		if (!inv?.ksefSendRequestedAt) return;
		try {
			await data.dismissKsefRequest(inv.id);
			toasts.ok('Request dismissed', `${inv.number} stays a draft`);
		} catch (error) {
			toasts.error('Could not dismiss', error);
		}
	}

	function askDelete(inv: Invoice | null) {
		if (!inv) return;
		if (inv.ksefNumber) toasts.show('Invoices in KSeF cannot be deleted', 'Issue a correction instead.', 'warn');
		else if (inv.outsideKsef) toasts.show('Issued invoices stay', 'This one was issued in the past; correct it with a correction invoice.', 'warn');
		else deleting = inv;
	}

	async function remove() {
		if (!deleting) return;
		const inv = deleting;
		try {
			await data.deleteInvoice(inv.id);
			toasts.ok('Deleted', inv.number);
		} catch (error) {
			toasts.error('Could not delete', error);
		} finally {
			deleting = null;
		}
	}

	const half = () => Math.max(5, Math.floor(window.innerHeight / 2 / 38));

	$effect(() =>
		keys.use({
			j: () => moveTo(index + 1),
			k: () => moveTo(index - 1),
			arrowdown: () => moveTo(index + 1),
			arrowup: () => moveTo(index - 1),
			gg: () => moveTo(0),
			G: () => moveTo(shown.length - 1),
			'ctrl-d': () => moveTo(index + half()),
			'ctrl-u': () => moveTo(index - half()),
			enter: () => selected && goto(`/invoices/${selected.id}`),
			e: () => selected && goto(`/invoices/${selected.id}`),
			p: () => selected && printInvoices([selected.id]),
			D: () => selected && duplicate(selected),
			m: () => selected && markPaid(selected, gross(selected)),
			yy: () => selected && copyNumber(selected),
			a: () => send(selected),
			x: () => dismiss(selected),
			dd: () => askDelete(selected),
			'/': () => search?.focus(),
			// esc in the search field goes back to the list
			escape: () => search?.blur()
		})
	);
</script>

<svelte:head><title>Invoices · openinvoice</title></svelte:head>

<div class="flex flex-1 flex-wrap items-stretch">
	<section class="flex min-w-0 flex-[999_1_560px] flex-col pb-6">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-4 pb-3">
			<h1 class="text-lg font-semibold">Invoices</h1>
			<label class="flex h-8 min-w-0 flex-[1_1_260px] items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 font-mono text-xs focus-within:border-accent">
				<span class="text-accent" aria-hidden="true">/</span>
				<span class="sr-only">Search invoices</span>
				<input
					bind:this={search}
					bind:value={query}
					oninput={syncUrl}
					onkeydown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							search?.blur();
						}
					}}
					placeholder="is:unpaid client:acme month:2026-10 >1000"
					class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
					autocomplete="off"
					spellcheck="false"
				/>
				{#if query}<button class="text-faint hover:text-ink" aria-label="Clear search" onclick={() => { query = ''; syncUrl(); }}>×</button>{/if}
			</label>
			<p class="text-xs text-muted">
				{shown.length} · <strong class="font-mono font-medium text-ink">{money(sumGross, lang)} {baseCurrency}</strong> gross
			</p>
		</div>

		{#if data.waiting.length}
			<section aria-label="Waiting for you" class="mx-5 mb-3 overflow-hidden rounded-lg border border-accent-line bg-accent-soft">
				<h2 class="px-3 py-2 text-xs font-semibold text-accent-ink">Waiting for you · {data.waiting.length}</h2>
				{#each data.waiting as inv (inv.id)}
					<div class="flex flex-wrap items-center gap-2.5 border-t border-accent-line/60 px-3 py-2 text-[13px]">
						<span class="rounded bg-ink px-1.5 py-px font-mono text-[11px] text-bg">{inv.ksefSendRequestedBy ?? 'agent'}</span>
						<button class="min-w-0 flex-[1_1_280px] text-left" onclick={() => (selectedId = inv.id)}>
							asks to send <strong class="font-semibold">{inv.number}</strong> to {inv.livemode ? 'KSeF' : 'KSeF DEMO'} — {inv.client.name}, <span class="font-mono text-xs whitespace-nowrap">{money(gross(inv), lang)} {inv.currency}</span>
						</button>
						<button class="btn-primary h-7 text-xs" onclick={() => send(inv)}>Approve <Kbd keys="a" tone="inverse" /></button>
						<button class="btn h-7 text-xs" onclick={() => dismiss(inv)}>Dismiss <Kbd keys="x" /></button>
					</div>
				{/each}
			</section>
		{/if}

		<div class="mx-5 overflow-x-auto rounded-lg border border-line bg-panel">
			<table class="w-full min-w-[720px] border-collapse text-[13px]">
				<thead>
					<tr class="text-left text-xs text-muted">
						<th class="border-b border-line px-3 py-2 font-medium">Number</th>
						<th class="border-b border-line px-3 py-2 font-medium">Client</th>
						<th class="border-b border-line px-3 py-2 font-medium">Issued</th>
						<th class="border-b border-line px-3 py-2 text-right font-medium">Gross</th>
						<th class="border-b border-line px-3 py-2 font-medium">Status</th>
						<th class="border-b border-line px-3 py-2 font-medium">By</th>
					</tr>
				</thead>
				<tbody bind:this={tbody}>
					{#each shown as inv (inv.id)}
						{@const current = inv.id === selected?.id}
						<tr
							data-id={inv.id}
							class={['cursor-pointer border-t border-line-soft first:border-t-0', current ? 'bg-accent-soft' : 'hover:bg-sunken']}
							aria-selected={current}
							onclick={() => (selectedId = inv.id)}
							ondblclick={() => goto(`/invoices/${inv.id}`)}
						>
							<td class={['px-3 py-2 font-mono text-xs whitespace-nowrap', current && 'shadow-[inset_3px_0_0_var(--accent)]']}>{inv.number}</td>
							<td class="max-w-[320px] px-3 py-2">
								<p class="truncate font-medium">{inv.client.name}</p>
								<p class="truncate text-xs text-muted">{inv.items[0]?.name ?? ''}</p>
							</td>
							<td class="px-3 py-2 whitespace-nowrap text-muted">{inv.issueDate}</td>
							<td class="px-3 py-2 text-right font-mono text-xs whitespace-nowrap">{money(gross(inv), lang)} {inv.currency}</td>
							<td class="px-3 py-2"><StatusPill status={status(inv, data.usesKsef)} invoice={inv} /></td>
							<td class="px-3 py-2 font-mono text-xs text-muted">{inv.createdByAgent ?? 'you'}</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="px-3 py-10 text-center text-muted">
								{#if query}
									Nothing matches <span class="font-mono">{query}</span>.
								{:else}
									No invoices{session.testMode ? ' in test mode' : ''} yet. Press <Kbd keys="n" /> for a new one, or let an agent draft it through MCP.
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#if selected}
		<aside aria-label="Selected invoice" class="flex-[1_1_300px] border-l border-line bg-panel px-5 py-4 max-lg:border-t max-lg:border-l-0 lg:max-w-[380px]">
			<InvoiceSide
				invoice={selected}
				onsend={() => send(selected)}
				ondismiss={() => dismiss(selected)}
				onpaid={() => selected && markPaid(selected, gross(selected))}
			/>
		</aside>
	{/if}
</div>

{#if sending}<KsefSend invoice={sending} onclose={() => (sending = null)} />{/if}
{#if deleting}
	<Confirm title="Delete {deleting.number}?" confirmLabel="Delete" danger onconfirm={remove} oncancel={() => (deleting = null)}>
		<p>{deleting.client.name}. The draft is gone for good.</p>
	</Confirm>
{/if}
