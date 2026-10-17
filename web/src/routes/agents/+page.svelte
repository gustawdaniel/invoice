<script lang="ts">
	import { goto } from '$app/navigation';
	import { ago } from '#lib/format.js';
	import { gross, money } from '#lib/invoice.js';
	import { API_URL } from '#lib/state/api.js';
	import { data } from '#lib/state/data.svelte.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import type { AgentKey, Invoice } from '#lib/types.js';
	import Confirm from '#lib/ui/Confirm.svelte';
	import KsefSend from '#lib/ui/KsefSend.svelte';

	const mcpUrl = `${API_URL}/mcp`;
	let name = $state('');
	let newKey = $state<string | null>(null);
	let busy = $state(false);
	let revoking = $state<AgentKey | null>(null);
	let sending = $state<Invoice | null>(null);

	const lang = $derived(data.company.country === 'PL' ? 'pl' : 'en');
	const command = $derived(`claude mcp add --transport http openinvoice ${mcpUrl} --header "Authorization: Bearer ${newKey ?? 'oi_…'}"`);

	$effect(() => {
		data.loadKeys().catch((error) => toasts.error('Could not load the keys', error));
	});

	// what agents did, as far as the invoices tell
	const activity = $derived(
		data.invoices
			.filter((inv) => inv.createdByAgent || inv.ksefSendRequestedBy)
			.flatMap((inv) => [
				...(inv.ksefSendRequestedAt ? [{ when: inv.ksefSendRequestedAt, agent: inv.ksefSendRequestedBy ?? '', tool: 'request_ksef_send', inv }] : []),
				...(inv.createdByAgent ? [{ when: inv.issueDate, agent: inv.createdByAgent, tool: 'create_invoice_draft', inv }] : [])
			])
			.sort((a, b) => b.when.localeCompare(a.when))
			.slice(0, 30)
	);

	async function create(event: SubmitEvent) {
		event.preventDefault();
		if (!name.trim()) return;
		busy = true;
		try {
			newKey = await data.createKey(name.trim());
			name = '';
		} catch (error) {
			toasts.error('Could not create the key', error);
		} finally {
			busy = false;
		}
	}

	async function revoke() {
		if (!revoking) return;
		try {
			await data.deleteKey(revoking.id);
			toasts.ok('Key revoked', revoking.name);
		} catch (error) {
			toasts.error('Could not revoke', error);
		} finally {
			revoking = null;
		}
	}

	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
		toasts.ok('Copied');
	}

	async function dismiss(inv: Invoice) {
		try {
			await data.dismissKsefRequest(inv.id);
			toasts.ok('Request dismissed', inv.number);
		} catch (error) {
			toasts.error('Could not dismiss', error);
		}
	}

	const rights: [string, string, 'ok' | 'ask' | 'no'][] = [
		['Read companies, clients and invoices', 'allowed', 'ok'],
		['Look up a NIP in the MF White List', 'allowed', 'ok'],
		['Create companies, clients and invoice drafts', 'allowed', 'ok'],
		['Validate and send test invoices to KSeF DEMO', 'allowed', 'ok'],
		['Send to production KSeF', 'asks you', 'ask'],
		['Change the NIP of a KSeF company, connect KSeF', 'humans only', 'no']
	];
</script>

<svelte:head><title>Agents · openinvoice</title></svelte:head>

<div class="flex flex-col gap-1 px-5 pt-4">
	<h1 class="text-lg font-semibold">Agents</h1>
	<p class="text-[13px] text-muted">AI agents work through MCP. They draft; you approve anything with legal effect.</p>
</div>

<div class="flex flex-wrap items-start gap-5 px-5 pt-4 pb-8">
	<div class="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
		<section aria-labelledby="connect" class="rounded-lg border border-line bg-panel p-4">
			<h2 id="connect" class="font-semibold">Connect an agent</h2>
			<p class="mt-0.5 mb-3 text-[13px] text-muted">Create a key, then add the server to Claude Code, Claude Desktop or any MCP client.</p>
			<form class="flex flex-wrap gap-2" onsubmit={create}>
				<label for="key-name" class="sr-only">Key name</label>
				<input id="key-name" bind:value={name} maxlength="60" placeholder="Key name, e.g. Claude on laptop" class="field max-w-sm flex-1" />
				<button class="btn-primary" disabled={busy || !name.trim()}>Create key</button>
			</form>
			{#if newKey}
				<div class="mt-3 rounded-md border border-warn/40 bg-warn-soft p-3 text-[13px]">
					<p class="font-medium text-warn">Copy the key now, it is not shown again.</p>
					<div class="mt-2 flex items-center gap-2"><code class="min-w-0 flex-1 rounded bg-panel px-2 py-1 font-mono text-xs break-all">{newKey}</code><button class="btn" onclick={() => copy(newKey!)}>Copy</button></div>
				</div>
			{/if}
			<div class="mt-3 flex items-center gap-2 overflow-x-auto rounded-md border border-line bg-[#1c1917] px-3 py-2.5 font-mono text-xs text-[#f5f5f4]">
				<span class="flex-1 whitespace-nowrap">{command}</span>
				<button class="shrink-0 rounded border border-white/30 px-2.5 py-1 text-[11px] hover:bg-white/10" onclick={() => copy(command)}>Copy</button>
			</div>
		</section>

		<section aria-labelledby="approvals" class="overflow-hidden rounded-lg border border-accent-line bg-panel">
			<h2 id="approvals" class="border-b border-accent-line bg-accent-soft px-4 py-2.5 font-semibold text-accent-ink">Needs your approval · {data.waiting.length}</h2>
			{#each data.waiting as inv (inv.id)}
				<div class="flex flex-wrap items-center gap-3 border-t border-line-soft px-4 py-3 first:border-t-0">
					<div class="min-w-0 flex-[1_1_320px] text-[13px]">
						<p><span class="rounded bg-ink px-1.5 py-px font-mono text-[11px] text-bg">{inv.ksefSendRequestedBy}</span> wants to send <strong class="font-semibold">{inv.number}</strong> to {inv.livemode ? 'production KSeF' : 'KSeF DEMO'}</p>
						<p class="mt-1 text-xs text-muted">{inv.client.name} · {money(gross(inv), lang)} {inv.currency}{inv.ksefSendRequestNote ? ` · “${inv.ksefSendRequestNote}”` : ''}</p>
					</div>
					<button class="btn" onclick={() => goto(`/invoices/${inv.id}`)}>Review</button>
					<button class="btn" onclick={() => dismiss(inv)}>Dismiss</button>
					<button class="btn-primary" onclick={() => (sending = inv)}>Approve &amp; send</button>
				</div>
			{:else}
				<p class="px-4 py-5 text-[13px] text-muted">Nothing to approve.</p>
			{/each}
		</section>

		<section aria-labelledby="activity" class="overflow-hidden rounded-lg border border-line bg-panel">
			<h2 id="activity" class="border-b border-line px-4 py-2.5 font-semibold">Agent work in {data.company.name}</h2>
			<div class="overflow-x-auto">
				<table class="w-full min-w-[560px] border-collapse text-[13px]">
					<tbody>
						{#each activity as row, i (i)}
							<tr class="border-t border-line-soft first:border-t-0">
								<td class="px-4 py-2 font-mono text-xs whitespace-nowrap text-muted">{row.when.length > 10 ? ago(row.when) : row.when}</td>
								<td class="px-2 py-2 font-mono text-xs">{row.agent}</td>
								<td class="px-2 py-2 font-mono text-xs text-accent-ink">{row.tool}</td>
								<td class="px-2 py-2 pr-4"><a href="/invoices/{row.inv.id}" class="hover:text-accent">{row.inv.number} · {row.inv.client.name}</a></td>
							</tr>
						{:else}
							<tr><td class="px-4 py-5 text-muted">No agent has drafted anything here yet{data.invoices.length ? '' : ' in this mode'}.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	</div>

	<aside class="flex flex-[1_1_300px] flex-col gap-5 lg:max-w-[400px]">
		<section aria-labelledby="keys" class="rounded-lg border border-line bg-panel p-4">
			<h2 id="keys" class="mb-2.5 font-semibold">Keys</h2>
			<ul class="flex flex-col gap-2.5 text-[13px]">
				{#each data.keys as key (key.id)}
					<li class="flex items-center gap-2">
						<span class="min-w-0 flex-1"><span class="font-medium">{key.name}</span> <span class="font-mono text-xs text-muted">{key.prefix}…</span><br /><span class={['text-xs', key.lastUsedAt ? 'text-ok' : 'text-muted']}>{key.lastUsedAt ? `used ${ago(key.lastUsedAt)}` : 'never used'}</span></span>
						<button class="btn h-7 text-xs" onclick={() => (revoking = key)}>Revoke</button>
					</li>
				{:else}
					<li class="text-muted">No keys yet.</li>
				{/each}
			</ul>
		</section>

		<section aria-labelledby="rights" class="rounded-lg border border-line bg-panel p-4">
			<h2 id="rights" class="mb-2.5 font-semibold">What agents can do</h2>
			<ul class="flex flex-col gap-2 text-[13px]">
				{#each rights as [what, how, tone] (what)}
					<li class="flex justify-between gap-3"><span>{what}</span><span class={['shrink-0 text-xs', tone === 'ok' && 'text-ok', tone === 'ask' && 'text-warn', tone === 'no' && 'text-muted']}>{how}</span></li>
				{/each}
			</ul>
			<p class="mt-3 text-xs text-muted">Server: <span class="font-mono break-all">{mcpUrl}</span></p>
		</section>
	</aside>
</div>

{#if revoking}
	<Confirm title="Revoke {revoking.name}?" confirmLabel="Revoke" danger onconfirm={revoke} oncancel={() => (revoking = null)}>
		<p>Agents using it lose access immediately.</p>
	</Confirm>
{/if}
{#if sending}<KsefSend invoice={sending} onclose={() => (sending = null)} />{/if}
