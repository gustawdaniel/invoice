<script lang="ts">
	import dayjs from 'dayjs';
	import { apiDownload } from '#lib/state/api.js';
	import { money } from '#lib/invoice.js';
	import { data } from '#lib/state/data.svelte.js';
	import { keys } from '#lib/state/keys.svelte.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import { ui } from '#lib/state/ui.svelte.js';
	import type { Filing, FilingStatus } from '#lib/types.js';
	import Kbd from '#lib/ui/Kbd.svelte';

	const STATUS: Record<FilingStatus, { label: string; tone: string; order: number }> = {
		missing: { label: 'Overdue', tone: 'bg-bad-soft text-bad', order: 0 },
		check: { label: 'To check', tone: 'bg-warn-soft text-warn', order: 1 },
		todo: { label: 'To do', tone: 'bg-sunken text-ink', order: 2 },
		filed: { label: 'Filed', tone: 'bg-accent-soft text-accent-ink', order: 3 },
		accepted: { label: 'Accepted', tone: 'bg-ok-soft text-ok', order: 4 },
		not_required: { label: 'Not required', tone: 'bg-sunken text-faint', order: 5 }
	};
	const KEYS: [string, FilingStatus][] = [['1', 'missing'], ['2', 'check'], ['3', 'todo'], ['4', 'filed'], ['5', 'accepted'], ['6', 'not_required']];

	let selectedId = $state<string | null>(null);
	let showDone = $state(false);
	let reference = $state('');
	let filedAt = $state('');
	let note = $state('');
	let loading = $state(true);

	$effect(() => {
		data.loadBooks().catch((error) => toasts.error('Could not load', error)).finally(() => (loading = false));
		data.loadDocuments().catch((error) => toasts.error('Could not load documents', error));
	});

	async function download(id: string, name: string) {
		try {
			const blob = await apiDownload(`/documents/${id}/file`);
			const objectUrl = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = objectUrl;
			anchor.download = name;
			anchor.click();
			URL.revokeObjectURL(objectUrl);
		} catch (error) {
			toasts.error('Could not download the document', error);
		}
	}

	const shown = $derived(
		[...data.filings]
			.filter((f) => showDone || !['accepted', 'not_required'].includes(f.status))
			.sort((a, b) => STATUS[a.status].order - STATUS[b.status].order || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.externalId.localeCompare(b.externalId))
	);
	const index = $derived(Math.max(0, shown.findIndex((f) => f.id === selectedId)));
	const selected = $derived(shown[index] ?? null);
	const today = dayjs().format('YYYY-MM-DD');
	// the documents that prove the filing (the file sent, the UPO)
	const proofs = $derived((selected?.documentIds ?? []).map((id) => data.documents.find((d) => d.id === id)).filter((d) => d !== undefined));

	$effect(() => {
		reference = selected?.reference ?? '';
		filedAt = selected?.filedAt ?? '';
		note = selected?.note ?? '';
	});

	$effect(() => {
		ui.context = shown.length ? `taxes ${index + 1}/${shown.length}` : 'taxes';
		ui.hints = '1 overdue · 2 check · 3 to do · 4 filed · 5 accepted · 6 not required · v show done';
		return () => {
			ui.context = '';
			ui.hints = '';
		};
	});

	const moveTo = (next: number) => {
		if (shown.length) selectedId = shown[Math.min(shown.length - 1, Math.max(0, next))].id;
	};

	async function update(f: Filing | null, change: Parameters<typeof data.updateFiling>[1]) {
		if (!f) return;
		try {
			await data.updateFiling(f.id, change);
		} catch (error) {
			toasts.error('Could not save', error);
		}
	}

	const setStatus = (status: FilingStatus) =>
		update(selected, { status, ...(status === 'filed' && !selected?.filedAt ? { filedAt: today } : {}) });

	$effect(() =>
		keys.use({
			j: () => moveTo(index + 1),
			k: () => moveTo(index - 1),
			arrowdown: () => moveTo(index + 1),
			arrowup: () => moveTo(index - 1),
			gg: () => moveTo(0),
			G: () => moveTo(shown.length - 1),
			v: () => (showDone = !showDone),
			...Object.fromEntries(KEYS.map(([key, status]) => [key, () => setStatus(status)]))
		})
	);

	const period = (f: Filing) => (f.period.length === 7 ? dayjs(`${f.period}-01`).format('MM.YYYY') : f.period || '—');
</script>

<svelte:head><title>Taxes · openinvoice</title></svelte:head>

<div class="flex flex-1 flex-wrap items-stretch">
	<section class="flex min-w-0 flex-[999_1_560px] flex-col pb-6">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-4 pb-3">
			<h1 class="text-lg font-semibold">Taxes and filings</h1>
			<label class="flex items-center gap-1.5 text-xs text-muted"><input type="checkbox" bind:checked={showDone} /> show accepted <Kbd keys="v" /></label>
			<p class="ml-auto text-xs text-muted">{data.filingsMissing} overdue · {data.filings.filter((f) => f.status === 'check').length} to check</p>
		</div>
		<div class="mx-5 overflow-x-auto rounded-lg border border-line bg-panel">
			<table class="w-full min-w-[640px] border-collapse text-[13px]">
				<thead>
					<tr class="text-left text-xs text-muted">
						<th class="border-b border-line px-3 py-2 font-medium">What</th>
						<th class="border-b border-line px-3 py-2 font-medium">Period</th>
						<th class="border-b border-line px-3 py-2 font-medium">To</th>
						<th class="border-b border-line px-3 py-2 font-medium">Due</th>
						<th class="border-b border-line px-3 py-2 font-medium">State</th>
					</tr>
				</thead>
				<tbody>
					{#each shown as f (f.id)}
						{@const current = f.id === selected?.id}
						<tr class={['cursor-pointer border-t border-line-soft', current ? 'bg-accent-soft' : 'hover:bg-sunken']} onclick={() => (selectedId = f.id)}>
							<td class={['px-3 py-2 font-medium', current && 'shadow-[inset_3px_0_0_var(--accent)]']}>{f.kind}</td>
							<td class="px-3 py-2 font-mono text-xs">{period(f)}</td>
							<td class="px-3 py-2 text-xs text-muted">{f.authority}</td>
							<td class={['px-3 py-2 font-mono text-xs', f.dueDate && f.dueDate < today && ['missing', 'todo', 'check'].includes(f.status) && 'text-bad']}>{f.dueDate ?? '—'}</td>
							<td class="px-3 py-2"><span class={['rounded-full px-2 py-0.5 text-xs', STATUS[f.status].tone]}>{STATUS[f.status].label}</span></td>
						</tr>
					{:else}
						<tr><td colspan="5" class="px-3 py-10 text-center text-muted">{loading ? 'Loading…' : 'Nothing to file. The agent records obligations through MCP.'}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#if selected}
		<aside aria-label="Selected filing" class="flex flex-[1_1_320px] flex-col gap-4 border-l border-line bg-panel px-5 py-4 max-lg:border-t max-lg:border-l-0 lg:max-w-[400px]">
			<div>
				<p class="font-mono text-xs text-muted">{selected.authority} · {period(selected)}</p>
				<h2 class="mt-1 text-[17px] font-semibold">{selected.kind}</h2>
				{#if selected.dueDate}<p class="text-xs text-muted">Due {selected.dueDate}</p>{/if}
				{#if selected.amount != null}<p class="mt-1 font-mono text-sm">{money(selected.amount, 'pl')} PLN</p>{/if}
			</div>
			<div>
				<h3 class="label-caps mb-2">State</h3>
				<div class="grid grid-cols-2 gap-1.5">
					{#each KEYS as [key, status] (status)}
						<button class={['btn h-auto justify-between py-1.5 text-xs', selected.status === status && 'border-accent bg-accent-soft text-accent-ink']} onclick={() => setStatus(status)}>
							<span>{STATUS[status].label}</span><Kbd keys={key} />
						</button>
					{/each}
				</div>
			</div>
			<form class="flex flex-col gap-3" onsubmit={(e) => { e.preventDefault(); void update(selected, { reference, filedAt: filedAt || null, note }); toasts.ok('Saved'); }}>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="f-filed" class="mb-1 block text-xs text-muted">Filed on</label>
						<input id="f-filed" type="date" bind:value={filedAt} class="field font-mono text-xs" />
					</div>
					<div>
						<label for="f-ref" class="mb-1 block text-xs text-muted">UPO / reference</label>
						<input id="f-ref" bind:value={reference} class="field font-mono text-xs" />
					</div>
				</div>
				<div>
					<label for="f-note" class="mb-1 block text-xs text-muted">Note</label>
					<textarea id="f-note" rows="4" bind:value={note} class="field"></textarea>
				</div>
				<button class="btn-primary">Save</button>
			</form>
			{#if proofs.length}
				<div>
					<h3 class="label-caps mb-2">Documents</h3>
					<ul class="flex flex-col gap-1">
						{#each proofs as doc (doc.id)}
							<li><button class="text-left text-xs text-accent-ink hover:underline" onclick={() => download(doc.id, doc.fileName || doc.title)}>{doc.title}</button></li>
						{/each}
					</ul>
				</div>
			{/if}
		</aside>
	{/if}
</div>
