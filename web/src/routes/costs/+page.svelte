<script lang="ts">
	import { CATEGORY_LABEL, STATUS_LABEL } from '#lib/books.js';
	import { money } from '#lib/invoice.js';
	import { data } from '#lib/state/data.svelte.js';
	import { keys } from '#lib/state/keys.svelte.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import { ui } from '#lib/state/ui.svelte.js';
	import type { Cost, CostCategory } from '#lib/types.js';
	import Kbd from '#lib/ui/Kbd.svelte';

	let year = $state('all');
	let query = $state('');
	let onlyReview = $state(false);
	let selectedId = $state<string | null>(null);
	let search: HTMLInputElement | undefined = $state();
	let tbody: HTMLTableSectionElement | undefined = $state();
	let loading = $state(true);

	$effect(() => {
		data.loadBooks().catch((error) => toasts.error('Could not load the books', error)).finally(() => (loading = false));
	});

	const years = $derived([...new Set(data.costs.map((c) => c.issueDate.slice(0, 4)))].sort().reverse());
	const shown = $derived(
		data.costs.filter((c) => {
			if (year !== 'all' && !c.issueDate.startsWith(year)) return false;
			if (onlyReview && c.status !== 'review') return false;
			const text = `${c.supplierName} ${c.supplierTin} ${c.number} ${c.category} ${c.note} ${c.gross.toFixed(2)}`.toLowerCase();
			return query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => text.includes(w));
		})
	);
	const index = $derived(Math.max(0, shown.findIndex((c) => c.id === selectedId)));
	const selected = $derived(shown[index] ?? null);
	// per currency: foreign costs are converted with the NBP rate once that lands
	const totals = $derived(
		Object.entries(
			shown.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.currency]: (acc[c.currency] ?? 0) + c.gross }), {})
		).sort()
	);
	const paidBy = $derived(selected ? data.transactions.filter((t) => t.costId === selected.id) : []);

	$effect(() => {
		ui.context = shown.length ? `costs ${index + 1}/${shown.length}` : 'costs';
		ui.hints = 'j/k move · y confirm · r review · h/l year · v only to review · / search';
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

	async function update(cost: Cost | null, change: Parameters<typeof data.updateCost>[1]) {
		if (!cost) return;
		try {
			await data.updateCost(cost.id, change);
		} catch (error) {
			toasts.error('Could not save', error);
		}
	}

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
			y: () => update(selected, { status: 'confirmed' }),
			r: () => update(selected, { status: 'review' }),
			h: () => shiftYear(-1),
			l: () => shiftYear(1),
			v: () => (onlyReview = !onlyReview),
			'/': () => search?.focus(),
			escape: () => search?.blur()
		})
	);

	const fmt = (value: number) => money(value, 'pl');
</script>

<svelte:head><title>Costs · openinvoice</title></svelte:head>

<div class="flex flex-1 flex-wrap items-stretch">
	<section class="flex min-w-0 flex-[999_1_560px] flex-col pb-6">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-4 pb-3">
			<h1 class="text-lg font-semibold">Costs</h1>
			<label class="sr-only" for="cost-year">Year</label>
			<select id="cost-year" bind:value={year} class="field h-8 w-28">
				<option value="all">All years</option>
				{#each years as y (y)}<option>{y}</option>{/each}
			</select>
			<label class="flex items-center gap-1.5 text-xs text-muted"><input type="checkbox" bind:checked={onlyReview} /> only to review <Kbd keys="v" /></label>
			<label class="flex h-8 min-w-0 flex-[1_1_200px] items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 text-[13px] focus-within:border-accent">
				<span class="font-mono text-accent" aria-hidden="true">/</span>
				<span class="sr-only">Search costs</span>
				<input bind:this={search} bind:value={query} placeholder="supplier, number, category" class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint" autocomplete="off" onkeydown={(e) => e.key === 'Enter' && search?.blur()} />
			</label>
			<p class="text-xs text-muted">
				{shown.length} ·
				{#each totals as [currency, sum], i (currency)}{i ? ' · ' : ''}<span class="font-mono text-ink">{fmt(sum)}</span> {currency}{/each}
			</p>
		</div>

		<div class="mx-5 overflow-x-auto rounded-lg border border-line bg-panel">
			<table class="w-full min-w-[760px] border-collapse text-[13px]">
				<thead>
					<tr class="text-left text-xs text-muted">
						<th class="w-24 border-b border-line px-3 py-2 font-medium">Issued</th>
						<th class="border-b border-line px-3 py-2 font-medium">Supplier</th>
						<th class="border-b border-line px-3 py-2 font-medium">Category</th>
						<th class="border-b border-line px-3 py-2 text-right font-medium">Net</th>
						<th class="border-b border-line px-3 py-2 text-right font-medium">Gross</th>
					</tr>
				</thead>
				<tbody bind:this={tbody}>
					{#each shown as c (c.id)}
						{@const current = c.id === selected?.id}
						<tr data-id={c.id} class={['cursor-pointer border-t border-line-soft', current ? 'bg-accent-soft' : 'hover:bg-sunken']} onclick={() => (selectedId = c.id)}>
							<td class={['px-3 py-2 font-mono text-xs whitespace-nowrap', current && 'shadow-[inset_3px_0_0_var(--accent)]']}>{c.issueDate}</td>
							<td class="max-w-[300px] px-3 py-2">
								<p class="truncate">{c.supplierName}</p>
								<p class="truncate font-mono text-xs text-muted">{c.number}</p>
							</td>
							<td class="px-3 py-2 text-xs">
								{CATEGORY_LABEL[c.category]}{c.reverseCharge ? ' · import of services' : ''}
								{#if c.status !== 'confirmed'}<span class={['ml-1', c.status === 'review' ? 'text-warn' : 'text-faint']} title={STATUS_LABEL[c.status]}>●</span>{/if}
							</td>
							<td class="px-3 py-2 text-right font-mono text-xs whitespace-nowrap">{fmt(c.net)}</td>
							<td class="px-3 py-2 text-right font-mono text-xs whitespace-nowrap">{fmt(c.gross)} {c.currency}</td>
						</tr>
					{:else}
						<tr><td colspan="5" class="px-3 py-10 text-center text-muted">{loading ? 'Loading…' : 'No cost documents yet. The agent loads them through MCP.'}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#if selected}
		<aside aria-label="Selected cost" class="flex flex-[1_1_320px] flex-col gap-4 border-l border-line bg-panel px-5 py-4 max-lg:border-t max-lg:border-l-0 lg:max-w-[400px]">
			<div>
				<p class="font-mono text-xs text-muted">{selected.issueDate}{selected.number ? ` · ${selected.number}` : ''}</p>
				<h2 class="mt-1 text-[17px] leading-snug font-semibold">{selected.supplierName}</h2>
				<p class="text-xs text-muted">{[selected.supplierTin, selected.supplierCountry].filter(Boolean).join(' · ')}</p>
			</div>
			<dl class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
				<dt class="text-muted">Net</dt><dd class="text-right font-mono text-xs leading-5">{fmt(selected.net)}</dd>
				<dt class="text-muted">VAT</dt><dd class="text-right font-mono text-xs leading-5">{fmt(selected.vat)}</dd>
				<dt class="font-semibold">Gross</dt><dd class="text-right font-mono font-medium">{fmt(selected.gross)} {selected.currency}</dd>
			</dl>
			<div>
				<label for="cost-category" class="label-caps mb-1.5 block">Category</label>
				<select id="cost-category" class="field" value={selected.category} onchange={(e) => update(selected, { category: e.currentTarget.value as CostCategory })}>
					{#each Object.entries(CATEGORY_LABEL) as [value, label] (value)}<option {value}>{label}</option>{/each}
				</select>
				<label class="mt-2 flex items-center gap-2 text-[13px]">
					<input type="checkbox" checked={selected.reverseCharge} onchange={(e) => update(selected, { reverseCharge: e.currentTarget.checked })} />
					Bought from abroad (import of services)
				</label>
			</div>
			<div>
				<h3 class="label-caps mb-1.5">Paid</h3>
				{#each paidBy as t (t.id)}
					<p class="text-[13px]"><a href="/bank?tab=all" class="font-mono">{t.date}</a> · <span class="font-mono">{fmt(t.amount)}</span> {t.currency}</p>
				{:else}
					<p class="text-xs text-muted">No bank operation linked yet.</p>
				{/each}
			</div>
			{#if selected.file}
				<div>
					<h3 class="label-caps mb-1">Original</h3>
					<p class="font-mono text-xs break-all text-muted">{selected.file}</p>
				</div>
			{/if}
			{#if selected.note}<p class="text-[13px] text-muted">{selected.note}</p>{/if}
			<div class="grid grid-cols-2 gap-1.5">
				<button class="btn-primary" onclick={() => update(selected, { status: 'confirmed' })}>Confirm <Kbd keys="y" tone="inverse" /></button>
				<button class="btn" onclick={() => update(selected, { status: 'review' })}>To review <Kbd keys="r" /></button>
			</div>
			<p class="text-xs text-muted">{STATUS_LABEL[selected.status]}</p>
		</aside>
	{/if}
</div>
