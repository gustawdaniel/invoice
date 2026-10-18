<script lang="ts">
	import { goto } from '$app/navigation';
	import { isInvoiceCommand, itemNameFor, parseInvoiceCommand, saleDateFor } from '../command';
	import { defaultVat, draftInvoice, gross, money } from '../invoice';
	import { score, sortInvoices } from '../search';
	import { data } from '../state/data.svelte';
	import { keys } from '../state/keys.svelte';
	import { session } from '../state/session.svelte';
	import { THEMES, theme } from '../state/theme.svelte';
	import { toasts } from '../state/toast.svelte';
	import { ui } from '../state/ui.svelte';
	import { newClient } from './clients';
	import Kbd from './Kbd.svelte';
	import Modal from './Modal.svelte';

	interface Entry {
		id: string;
		group: string;
		label: string;
		hint?: string;
		keys?: string;
		run: () => void | Promise<void>;
	}

	let query = $state(ui.paletteSeed);
	let cursor = $state(0);
	let input: HTMLInputElement | undefined = $state();
	let list: HTMLDivElement | undefined = $state();

	const close = () => (ui.paletteOpen = false);
	const lang = $derived(data.company.country === 'PL' ? 'pl' : 'en');
	const text = $derived(query.replace(/^:/, '').trim());

	// "invoice acme 12000 net october" → a prefilled draft
	const intent = $derived(isInvoiceCommand(query) ? parseInvoiceCommand(query, data.clients) : null);

	function createFromIntent() {
		if (!intent) return;
		const draft = draftInvoice(data.company, data.invoices, session.user?.full_name ?? '', session.testMode);
		if (intent.client) {
			draft.client = intent.client;
			draft.clientId = intent.client.id;
		}
		if (intent.currency) draft.currency = intent.currency;
		draft.saleDate = saleDateFor(intent, draft.issueDate);
		const vat = defaultVat(data.company);
		const quantity = intent.hours ?? 1;
		const amount = intent.amount ?? 0;
		const net = intent.gross ? amount / (1 + vat.value) : amount;
		draft.items = [
			{
				name: itemNameFor(intent, draft.lang),
				unit: intent.hours ? 'hour' : 'service',
				quantity,
				// with hours the amount is the hourly rate
				priceNet: Math.round(net * 100) / 100,
				vat
			}
		];
		ui.draft = draft;
		close();
		void goto('/invoices/new');
	}

	function go(path: string) {
		close();
		void goto(path);
	}

	const commands = $derived<Entry[]>([
		{ id: 'new', group: 'Commands', label: 'New invoice', keys: 'n', run: () => go('/invoices/new') },
		{ id: 'client', group: 'Commands', label: 'New client', hint: 'fills name and address from the MF White List by NIP', keys: 'c', run: () => { close(); newClient(); } },
		{ id: 'test', group: 'Commands', label: session.testMode ? 'Switch to live mode' : 'Switch to test mode', hint: session.testMode ? 'real invoices' : 'KSeF DEMO, no legal effect', keys: 't', run: async () => { close(); await data.setTestMode(!session.testMode); } },
		{ id: 'inbox', group: 'Go to', label: 'Inbox', keys: 'gi', run: () => go('/inbox') },
		{ id: 'invoices', group: 'Go to', label: 'Invoices', keys: 'gv', run: () => go('/') },
		{ id: 'clients', group: 'Go to', label: 'Clients', keys: 'gc', run: () => go('/clients') },
		{ id: 'books', group: 'Go to', label: 'Books', keys: 'gb', run: () => go('/books') },
		{ id: 'bank', group: 'Go to', label: 'Bank operations', hint: data.bankToReview ? `${data.bankToReview} to review` : undefined, keys: 'gt', run: () => go('/bank') },
		{ id: 'costs', group: 'Go to', label: 'Costs', keys: 'gk', run: () => go('/costs') },
		{ id: 'taxes', group: 'Go to', label: 'Taxes and filings', hint: data.filingsMissing ? `${data.filingsMissing} overdue` : undefined, keys: 'gx', run: () => go('/taxes') },
		{ id: 'agents', group: 'Go to', label: 'Agents (MCP)', keys: 'ga', run: () => go('/agents') },
		{ id: 'company', group: 'Go to', label: 'Company settings', keys: 'gs', run: () => go('/company') },
		...(session.isAdmin ? [{ id: 'admin', group: 'Go to', label: 'Admin', run: () => go('/admin') }] : []),
		...(data.companies.length > 1 && data.defaultCompany?.id !== data.company.id
			? [{
					id: 'default',
					group: 'Commands',
					label: `Make ${data.company.name} my default company`,
					hint: 'it opens after login',
					run: async () => {
						close();
						try {
							await data.setDefaultCompany(data.company.id);
							toasts.ok('Default company', data.company.name);
						} catch (error) {
							toasts.error('Could not change the default', error);
						}
					}
				}]
			: []),
		...data.companies
			.filter((company) => company.id !== data.company.id)
			.map((company) => ({
				id: `company-${company.id}`,
				group: 'Commands',
				label: `Switch to ${company.name}`,
				hint: `${company.country}${company.status !== 'active' ? ` · ${company.status}` : ''}${company.isDefault ? ' · default' : ''}`,
				run: async () => { close(); await data.switchCompany(company.id); }
			})),
		...THEMES.map((value) => ({
			id: `theme-${value}`,
			group: 'Commands',
			label: `Theme: ${value}`,
			hint: theme.value === value ? 'current' : undefined,
			run: () => { theme.set(value); close(); }
		})),
		{ id: 'keys', group: 'Commands', label: 'Keyboard shortcuts', keys: '?', run: () => { close(); ui.keymapOpen = true; } },
		{ id: 'logout', group: 'Commands', label: 'Log out', run: async () => { close(); await data.logout(); await goto('/login'); } }
	]);

	const entries = $derived.by<Entry[]>(() => {
		const q = text.toLowerCase();
		const ranked = <T,>(items: T[], name: (item: T) => string) =>
			items
				.map((item) => ({ item, s: score(name(item), q) }))
				.filter(({ s }) => s > 0)
				.sort((a, b) => b.s - a.s)
				.map(({ item }) => item);

		const result: Entry[] = [];
		if (intent) {
			result.push({ id: 'intent', group: 'Run', label: 'Open this draft in the editor', keys: 'enter', run: createFromIntent });
		}
		result.push(...ranked(commands, (c) => `${c.label} ${c.group}`).slice(0, q ? 6 : commands.length));
		if (q && !intent) {
			result.push(
				...ranked(data.clients, (c) => `${c.name} ${c.tin}`)
					.slice(0, 5)
					.map((client) => ({
						id: `cl-${client.id}`,
						group: 'Clients',
						label: client.name,
						hint: [client.tin && `NIP ${client.tin}`, client.city].filter(Boolean).join(' · '),
						run: () => go(`/clients?id=${client.id}`)
					}))
			);
			result.push(
				...ranked(sortInvoices(data.invoices), (inv) => `${inv.number} ${inv.client.name} ${inv.ksefNumber ?? ''}`)
					.slice(0, 6)
					.map((inv) => ({
						id: `inv-${inv.id}`,
						group: 'Invoices',
						label: `${inv.number} · ${inv.client.name}`,
						hint: `${money(gross(inv), lang)} ${inv.currency}`,
						run: () => go(`/invoices/${inv.id}`)
					}))
			);
			result.push({
				id: 'agent',
				group: 'Hand off to an agent',
				label: 'Copy as a prompt for Claude',
				hint: 'the agent does it through MCP, you approve anything sent to KSeF',
				keys: 'mod-enter',
				run: async () => {
					await navigator.clipboard.writeText(`Using the openinvoice MCP server, for company "${data.company.name}": ${text}`);
					toasts.ok('Prompt copied', 'Paste it into Claude with the openinvoice MCP server connected.');
					close();
				}
			});
		}
		return result;
	});

	$effect(() => {
		// a new query starts at the top
		void text;
		cursor = 0;
	});

	$effect(() => {
		input?.focus();
	});

	$effect(() => {
		list?.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
	});

	const move = (delta: number) => {
		if (entries.length) cursor = (cursor + delta + entries.length) % entries.length;
	};

	$effect(() =>
		keys.use({
			arrowdown: () => move(1),
			arrowup: () => move(-1),
			'ctrl-n': () => move(1),
			'ctrl-p': () => move(-1),
			'ctrl-j': () => move(1),
			'ctrl-k': () => move(-1),
			'mod-enter': () => entries.find((e) => e.id === 'agent')?.run(),
			tab: () => (intent ? createFromIntent() : undefined),
			escape: close
		}, { exclusive: true })
	);

	function onkeydown(event: KeyboardEvent) {
		// enter, arrows and tab are handled here because the input has focus
		if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
			event.preventDefault();
			void entries[cursor]?.run();
		} else if (['ArrowDown', 'ArrowUp', 'Tab'].includes(event.key)) {
			event.preventDefault();
			if (event.key === 'ArrowDown') move(1);
			else if (event.key === 'ArrowUp') move(-1);
			else if (intent) createFromIntent();
		}
	}
</script>

<Modal title="Command palette" onclose={close} width="max-w-2xl" top="pt-[10vh]">
	<div class="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
		<span class="font-mono text-base text-accent" aria-hidden="true">:</span>
		<label for="palette-input" class="sr-only">Command or search</label>
		<input
			id="palette-input"
			bind:this={input}
			bind:value={query}
			{onkeydown}
			autocomplete="off"
			spellcheck="false"
			placeholder="Search, run a command, or type: invoice acme 12000 net october"
			class="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint"
		/>
		<Kbd keys="esc" />
	</div>

	{#if intent}
		<section aria-label="Understood" class="border-b border-accent-line bg-accent-soft px-4 py-3">
			<p class="mb-2 text-[11px] font-semibold tracking-[0.06em] text-accent-ink uppercase">Understood</p>
			<div class="flex flex-wrap gap-1.5 text-[13px]">
				<span class="rounded-md border border-accent-line bg-panel px-2 py-0.5">New invoice{session.testMode ? ' (test)' : ''}</span>
				<span class={['rounded-md border bg-panel px-2 py-0.5', intent.client ? 'border-accent-line' : 'border-warn/50 text-warn']}>
					{intent.client ? intent.client.name : 'client: not found — pick it in the editor'}
				</span>
				<span class="rounded-md border border-accent-line bg-panel px-2 py-0.5">{intent.hours ? `${intent.hours} h × ` : '1 × '}{itemNameFor(intent, lang)}</span>
				{#if intent.amount !== null}
					<span class="rounded-md border border-accent-line bg-panel px-2 py-0.5 font-mono text-xs leading-5">
						{money(intent.amount, lang)} {intent.currency ?? (data.company.country === 'PL' ? 'PLN' : 'EUR')} {intent.gross ? 'gross' : 'net'}{intent.hours ? ' / h' : ''}
					</span>
				{/if}
				<span class="rounded-md border border-accent-line bg-panel px-2 py-0.5">VAT {defaultVat(data.company).name}</span>
			</div>
			<p class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-accent-ink">
				<span><Kbd keys="enter" tone="accent" /> open the draft</span>
				<span>Company defaults fill the rest; nothing is saved until you save it</span>
			</p>
		</section>
	{/if}

	<div bind:this={list} class="max-h-[56vh] overflow-y-auto py-1.5" role="listbox" aria-label="Results">
		{#each entries as entry, index (entry.id)}
			{#if index === 0 || entries[index - 1].group !== entry.group}
				<p class="px-4 pt-2.5 pb-1 text-[11px] font-semibold tracking-[0.06em] text-faint uppercase">{entry.group}</p>
			{/if}
			<button
				data-index={index}
				role="option"
				aria-selected={index === cursor}
				class={['flex w-full items-center gap-3 px-4 py-2 text-left', index === cursor ? 'bg-accent-soft' : 'hover:bg-sunken']}
				onmousemove={() => (cursor = index)}
				onclick={() => entry.run()}
			>
				<span class="min-w-0 flex-1 truncate">
					{entry.label}
					{#if entry.hint}<span class="text-muted"> — {entry.hint}</span>{/if}
				</span>
				{#if entry.keys}<Kbd keys={entry.keys === 'mod-enter' ? '⌘↵' : entry.keys} tone={index === cursor ? 'accent' : 'muted'} />{/if}
			</button>
		{:else}
			<p class="px-4 py-6 text-center text-muted">Nothing found</p>
		{/each}
	</div>

	<footer class="flex flex-wrap gap-x-4 gap-y-1 border-t border-line bg-bg px-4 py-2.5 text-xs text-muted">
		<span><Kbd keys="↑↓" /> or <Kbd keys="ctrl-n/p" /> move</span>
		<span><Kbd keys="enter" /> run</span>
		<span><Kbd keys="⌘↵" /> hand off to an agent</span>
		<span class="ml-auto">start with <span class="font-mono">invoice</span> or <span class="font-mono">fv</span> to draft one</span>
	</footer>
</Modal>
