<script lang="ts">
	import { score } from '../search';
	import { data } from '../state/data.svelte';
	import { ui } from '../state/ui.svelte';
	import type { Client } from '../types';
	import { newClient } from './clients';

	let { client, onpick, disabled = false }: { client: Client; onpick: (client: Client) => void; disabled?: boolean } = $props();

	let text = $state('');
	let open = $state(false);
	let cursor = $state(0);
	let input: HTMLInputElement | undefined = $state();

	// clients of this company used most recently come first when nothing is typed
	const recent = $derived.by(() => {
		const last = new Map<string, string>();
		for (const inv of data.invoices) {
			if ((last.get(inv.clientId) ?? '') < inv.issueDate) last.set(inv.clientId, inv.issueDate);
		}
		return [...data.clients].sort((a, b) => (last.get(b.id) ?? '').localeCompare(last.get(a.id) ?? ''));
	});

	const matches = $derived(
		text.trim()
			? data.clients
					.map((c) => ({ c, s: score(`${c.name} ${c.tin}`, text) }))
					.filter(({ s }) => s > 0)
					.sort((a, b) => b.s - a.s)
					.map(({ c }) => c)
					.slice(0, 8)
			: recent.slice(0, 8)
	);

	function pick(chosen: Client) {
		onpick(chosen);
		text = '';
		open = false;
	}

	function create() {
		open = false;
		newClient(onpick);
		if (ui.client && /\d{10}/.test(text.replace(/\D/g, ''))) ui.client.tin = text.replace(/\D/g, '');
		else if (ui.client) ui.client.name = text;
	}

	function onkeydown(event: KeyboardEvent) {
		if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
			open = true;
			return;
		}
		if (event.key === 'ArrowDown' || (event.ctrlKey && event.key === 'n')) {
			event.preventDefault();
			cursor = Math.min(matches.length, cursor + 1);
		} else if (event.key === 'ArrowUp' || (event.ctrlKey && event.key === 'p')) {
			event.preventDefault();
			cursor = Math.max(0, cursor - 1);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (cursor < matches.length) pick(matches[cursor]);
			else create();
		} else if (event.key === 'Escape' && open) {
			event.stopPropagation();
			open = false;
		}
	}

	$effect(() => {
		void text;
		cursor = 0;
	});
</script>

<div class="relative">
	<label for="client-picker" class="sr-only">Buyer</label>
	<input
		id="client-picker"
		bind:this={input}
		bind:value={text}
		{disabled}
		{onkeydown}
		onfocus={() => (open = true)}
		onblur={() => setTimeout(() => (open = false), 150)}
		placeholder={client.name || 'Type a client name or NIP…'}
		class={['field h-9 text-sm', client.name && !text && 'placeholder:font-medium placeholder:text-ink']}
		autocomplete="off"
		role="combobox"
		aria-expanded={open}
		aria-controls="client-options"
	/>
	{#if open && !disabled}
		<ul id="client-options" role="listbox" class="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-line bg-panel py-1 shadow-lg">
			{#each matches as option, index (option.id)}
				<li role="option" aria-selected={index === cursor}>
					<button
						type="button"
						class={['flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-[13px]', index === cursor ? 'bg-accent-soft' : 'hover:bg-sunken']}
						onmousedown={(event) => event.preventDefault()}
						onclick={() => pick(option)}
					>
						<span class="min-w-0 flex-1 truncate">{option.name}</span>
						<span class="shrink-0 font-mono text-xs text-muted">{option.tin}</span>
					</button>
				</li>
			{/each}
			<li role="option" aria-selected={cursor === matches.length}>
				<button
					type="button"
					class={['w-full border-t border-line px-3 py-1.5 text-left text-[13px] text-accent', cursor === matches.length ? 'bg-accent-soft' : 'hover:bg-sunken']}
					onmousedown={(event) => event.preventDefault()}
					onclick={create}
				>
					+ New client{text ? ` “${text}”` : ''}
				</button>
			</li>
		</ul>
	{/if}
</div>
