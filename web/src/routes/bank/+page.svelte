<script lang="ts">
	import { page } from '$app/state';
	import { KIND_KEYS, KIND_LABEL, OTHER_KINDS, STATUS_LABEL, costCandidates, filterTransactions, invoiceCandidates } from '#lib/books.js';
	import { gross, money } from '#lib/invoice.js';
	import { data } from '#lib/state/data.svelte.js';
	import { keys } from '#lib/state/keys.svelte.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import { ui } from '#lib/state/ui.svelte.js';
	import type { BankTransaction, TransactionKind } from '#lib/types.js';
	import Kbd from '#lib/ui/Kbd.svelte';

	let tab = $state<'review' | 'all'>(page.url.searchParams.get('tab') === 'all' ? 'all' : 'review');
	let year = $state('all');
	let query = $state('');
	let selectedId = $state<string | null>(page.url.searchParams.get('id'));
	let search: HTMLInputElement | undefined = $state();
	let tbody: HTMLTableSectionElement | undefined = $state();
	let note = $state('');
	let loading = $state(true);

	$effect(() => {
		data.loadBooks().catch((error) => toasts.error('Could not load the books', error)).finally(() => (loading = false));
	});

	const years = $derived([...new Set(data.transactions.map((t) => t.date.slice(0, 4)))].sort().reverse());
	const reviewCount = $derived(data.transactions.filter((t) => t.status === 'review').length);
	const shown = $derived(
		filterTransactions(
			data.transactions.filter((t) => (tab === 'review' ? t.status === 'review' : true) && (year === 'all' || t.date.startsWith(year))),
			query
		)
	);
	const index = $derived(Math.max(0, shown.findIndex((t) => t.id === selectedId)));
	const selected = $derived(shown[index] ?? null);
	const sums = $derived(
		shown.reduce((acc, t) => ({ in: acc.in + Math.max(0, t.amount), out: acc.out + Math.min(0, t.amount) }), { in: 0, out: 0 })
	);
	const linkedInvoice = $derived(selected?.invoiceId ? data.invoice(selected.invoiceId) : undefined);
	const linkedCosts = $derived(selected ? data.costs.filter((c) => selected.costIds.includes(c.id)) : []);

	$effect(() => {
		note = selected?.note ?? '';
	});

	$effect(() => {
		ui.context = shown.length ? `bank ${index + 1}/${shown.length}` : 'bank';
		ui.hints = '1-9 0 set kind · y confirm · r back to review · v review/all · h/l year · / search';
		return () => {
			ui.context = '';
			ui.hints = '';
		};
	});

	$effect(() => {
		tbody?.querySelector(`[data-id="${selected?.id}"]`)?.scrollIntoView({ block: 'nearest' });
	});

	const moveTo = (next: number) => {
		if (shown.length) selectedId = shown[Math.min(shown.length - 1, Math.max(0, next))].id;
	};

	// in the review queue a decided row leaves the list; the cursor then stands on the next one
	async function decide(t: BankTransaction | null, change: Parameters<typeof data.classify>[1]) {
		if (!t) return;
		const at = index;
		try {
			await data.classify(t.id, { note, ...change });
			if (tab === 'review') selectedId = shown[Math.min(at, shown.length - 1)]?.id ?? null;
		} catch (error) {
			toasts.error('Could not save', error);
		}
	}

	const setKind = (kind: TransactionKind) => decide(selected, { kind, status: 'confirmed' });

	function shiftYear(delta: number) {
		const list = ['all', ...years];
		year = list[Math.min(list.length - 1, Math.max(0, list.indexOf(year) - delta))];
	}

	$effect(() =>
		keys.use({
			j: () => moveTo(index + 1),
			k: () => moveTo(index - 1),
			arrowdown: () => moveTo(index + 1),
			arrowup: () => moveTo(index - 1),
			gg: () => moveTo(0),
			G: () => moveTo(shown.length - 1),
			y: () => selected && decide(selected, { status: 'confirmed' }),
			r: () => selected && decide(selected, { status: 'review' }),
			h: () => shiftYear(-1),
			l: () => shiftYear(1),
			v: () => (tab = tab === 'review' ? 'all' : 'review'),
			'/': () => search?.focus(),
			escape: () => search?.blur(),
			...Object.fromEntries(KIND_KEYS.map(([key, kind]) => [key, () => setKind(kind)]))
		})
	);

	const fmt = (value: number) => money(value, 'pl');
</script>

<svelte:head><title>Bank · openinvoice</title></svelte:head>

<div class="flex flex-1 flex-wrap items-stretch">
	<section class="flex min-w-0 flex-[999_1_560px] flex-col pb-6">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-4 pb-3">
			<h1 class="text-lg font-semibold">Bank</h1>
			<div role="tablist" aria-label="Which operations" class="flex overflow-hidden rounded-md border border-line text-xs">
				<button role="tab" aria-selected={tab === 'review'} class={['px-2.5 py-1.5', tab === 'review' ? 'bg-ink text-bg' : 'bg-panel text-muted']} onclick={() => (tab = 'review')}>
					To review · {reviewCount}
				</button>
				<button role="tab" aria-selected={tab === 'all'} class={['px-2.5 py-1.5', tab === 'all' ? 'bg-ink text-bg' : 'bg-panel text-muted']} onclick={() => (tab = 'all')}>
					All · {data.transactions.length}
				</button>
			</div>
			<label class="sr-only" for="bank-year">Year</label>
			<select id="bank-year" bind:value={year} class="field h-8 w-28">
				<option value="all">All years</option>
				{#each years as y (y)}<option>{y}</option>{/each}
			</select>
			<label class="flex h-8 min-w-0 flex-[1_1_200px] items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 text-[13px] focus-within:border-accent">
				<span class="font-mono text-accent" aria-hidden="true">/</span>
				<span class="sr-only">Search operations</span>
				<input bind:this={search} bind:value={query} placeholder="text, amount, kind" class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint" autocomplete="off" onkeydown={(e) => e.key === 'Enter' && search?.blur()} />
			</label>
			<p class="text-xs text-muted">
				in <span class="font-mono text-ink">{fmt(sums.in)}</span> · out <span class="font-mono text-ink">{fmt(sums.out)}</span> PLN
			</p>
		</div>

		<div class="mx-5 overflow-x-auto rounded-lg border border-line bg-panel">
			<table class="w-full min-w-[720px] border-collapse text-[13px]">
				<thead>
					<tr class="text-left text-xs text-muted">
						<th class="w-24 border-b border-line px-3 py-2 font-medium">Date</th>
						<th class="border-b border-line px-3 py-2 font-medium">Description</th>
						<th class="w-32 border-b border-line px-3 py-2 text-right font-medium">Amount</th>
						<th class="w-52 border-b border-line px-3 py-2 font-medium">Booked as</th>
					</tr>
				</thead>
				<tbody bind:this={tbody}>
					{#each shown as t (t.id)}
						{@const current = t.id === selected?.id}
						<tr data-id={t.id} class={['cursor-pointer border-t border-line-soft align-top', current ? 'bg-accent-soft' : 'hover:bg-sunken']} onclick={() => (selectedId = t.id)}>
							<td class={['px-3 py-2 font-mono text-xs whitespace-nowrap', current && 'shadow-[inset_3px_0_0_var(--accent)]']}>{t.date}</td>
							<td class="max-w-[420px] px-3 py-2"><p class="line-clamp-2 break-words">{t.description}</p></td>
							<td class={['px-3 py-2 text-right font-mono text-xs whitespace-nowrap', t.amount > 0 && 'text-ok']}>{t.amount > 0 ? '+' : ''}{fmt(t.amount)}</td>
							<td class="px-3 py-2 text-xs">
								<span class={t.kind === 'unclassified' ? 'text-faint' : ''}>{KIND_LABEL[t.kind]}</span>
								{#if t.status !== 'confirmed'}<span class={['ml-1', t.status === 'review' ? 'text-warn' : 'text-faint']} title={STATUS_LABEL[t.status]}>●</span>{/if}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="4" class="px-3 py-10 text-center text-muted">
								{#if loading}Loading…{:else if tab === 'review'}Nothing waits for you here.{:else}No bank operations yet. The agent loads them through MCP.{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#if selected}
		<aside aria-label="Selected operation" class="flex flex-[1_1_320px] flex-col gap-4 border-l border-line bg-panel px-5 py-4 max-lg:border-t max-lg:border-l-0 lg:max-w-[420px]">
			<div>
				<p class="font-mono text-xs text-muted">{selected.date} · {selected.bank} · {selected.account}</p>
				<p class={['mt-1 font-mono text-xl font-semibold', selected.amount > 0 && 'text-ok']}>{selected.amount > 0 ? '+' : ''}{fmt(selected.amount)} {selected.currency}</p>
				<p class="mt-2 text-[13px] break-words">{selected.description}</p>
				<p class="mt-1 text-xs text-muted">Bank's category: {selected.bankCategory || '—'} · {STATUS_LABEL[selected.status]}</p>
			</div>

			<div>
				<h2 class="label-caps mb-2">What was it?</h2>
				<div class="grid grid-cols-2 gap-1.5">
					{#each KIND_KEYS as [key, kind] (kind)}
						<button class={['btn h-auto justify-between py-1.5 text-left text-xs', selected.kind === kind && 'border-accent bg-accent-soft text-accent-ink']} onclick={() => setKind(kind)}>
							<span>{KIND_LABEL[kind]}</span><Kbd keys={key} />
						</button>
					{/each}
				</div>
				<label class="mt-2 block text-xs text-muted" for="other-kind">Other</label>
				<select id="other-kind" class="field mt-1" value={OTHER_KINDS.includes(selected.kind) ? selected.kind : ''} onchange={(e) => e.currentTarget.value && setKind(e.currentTarget.value as TransactionKind)}>
					<option value="">—</option>
					{#each OTHER_KINDS as kind (kind)}<option value={kind}>{KIND_LABEL[kind]}</option>{/each}
				</select>
			</div>

			{#if selected.amount > 0}
				{@const candidates = invoiceCandidates(selected, data.invoices)}
				<div>
					<h2 class="label-caps mb-1.5">Invoice</h2>
					{#if linkedInvoice}
						<p class="text-[13px]"><a href="/invoices/{linkedInvoice.id}" class="font-mono text-accent">{linkedInvoice.number}</a> · {linkedInvoice.client.name}</p>
					{/if}
					{#each candidates.filter((c) => c.id !== selected.invoiceId) as inv (inv.id)}
						<button class="btn mt-1 h-auto w-full justify-between py-1.5 text-left text-xs" onclick={() => decide(selected, { kind: 'sale_payment', invoiceId: inv.id, status: 'confirmed' })}>
							<span class="truncate"><span class="font-mono">{inv.number}</span> · {inv.client.name}</span><span class="font-mono">{fmt(gross(inv))}</span>
						</button>
					{:else}
						{#if !linkedInvoice}<p class="text-xs text-muted">No invoice with this amount.</p>{/if}
					{/each}
				</div>
			{:else}
				{@const candidates = costCandidates(selected, data.costs)}
				<div>
					<h2 class="label-caps mb-1.5">Cost document</h2>
					{#each linkedCosts as cost (cost.id)}
						<p class="flex items-center justify-between gap-2 text-[13px]">
							<a href="/costs?id={cost.id}" class="truncate hover:text-accent">{cost.supplierName} · <span class="font-mono">{cost.number}</span></a>
							<button class="text-xs text-muted hover:text-bad" title="Unlink this document" onclick={() => decide(selected, { costIds: selected.costIds.filter((id) => id !== cost.id), status: 'confirmed' })}>unlink</button>
						</p>
					{/each}
					{#each candidates.filter((c) => !selected.costIds.includes(c.id)) as cost (cost.id)}
						<button class="btn mt-1 h-auto w-full justify-between py-1.5 text-left text-xs" onclick={() => decide(selected, { kind: 'cost_payment', costIds: [...selected.costIds, cost.id], status: 'confirmed' })}>
							<span class="truncate">{cost.supplierName} · {cost.issueDate}</span><span class="font-mono">{fmt(cost.gross)}</span>
						</button>
					{:else}
						{#if !linkedCosts.length}<p class="text-xs text-muted">No cost document with this amount yet.</p>{/if}
					{/each}
				</div>
			{/if}

			<div>
				<label for="tx-note" class="label-caps mb-1.5 block">Note</label>
				<textarea id="tx-note" rows="2" bind:value={note} class="field" placeholder="Why, for the books"></textarea>
			</div>

			<div class="grid grid-cols-2 gap-1.5">
				<button class="btn-primary" onclick={() => decide(selected, { status: 'confirmed' })}>Confirm <Kbd keys="y" tone="inverse" /></button>
				<button class="btn" onclick={() => decide(selected, { status: 'review' })}>Back to review <Kbd keys="r" /></button>
			</div>
		</aside>
	{/if}
</div>
