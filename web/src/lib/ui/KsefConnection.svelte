<script lang="ts">
	import { download } from '../format';
	import { data } from '../state/data.svelte';
	import { toasts } from '../state/toast.svelte';
	import type { KsefEnv } from '../types';
	import Confirm from './Confirm.svelte';

	// one KSeF connection of the company: production (live mode) or DEMO (test mode), each its own token
	let { env }: { env: KsefEnv } = $props();

	let busy = $state(false);
	let token = $state('');
	let signed = $state<File | null>(null);
	let disconnecting = $state(false);

	const prod = $derived(env === 'prod');
	const connected = $derived(prod ? data.company.ksefConnected : data.company.ksefDemoConnected);
	const portal = $derived(prod ? 'https://ap.ksef.mf.gov.pl/web/tokens/generate-token' : 'https://ap-demo.ksef.mf.gov.pl');

	async function run(action: () => Promise<void>, success: string) {
		busy = true;
		try {
			await action();
			toasts.ok('KSeF', success);
		} catch (error) {
			toasts.error('KSeF error', error);
		} finally {
			busy = false;
		}
	}

	const useToken = (event: SubmitEvent) => {
		event.preventDefault();
		return run(async () => {
			await data.ksefToken(env, token.trim());
			token = '';
		}, 'Token verified and stored.');
	};
	const downloadRequest = () => run(async () => download(await data.ksefAuthRequest(env), `ksef-${env}-auth-request.xml`, 'application/xml'), 'Sign the file within 10 minutes and upload it.');
	const uploadSigned = () => run(async () => {
		if (!signed) throw new Error('Choose the signed XML file first');
		await data.ksefSigned(env, await signed.text());
		signed = null;
	}, `Connected to KSeF ${prod ? 'production' : 'DEMO'}.`);
</script>

<section class={['flex flex-col gap-3 rounded-lg border p-4', prod ? 'border-line bg-panel' : 'border-test/30 bg-test-soft']}>
	<div class="flex flex-wrap items-baseline gap-2">
		<h3 class="font-semibold">{prod ? 'KSeF production' : 'KSeF DEMO'}</h3>
		<span class="text-xs text-muted">{prod ? 'live mode, legally binding' : 'test mode, no legal effect'}</span>
		<span class={['ml-auto text-xs font-medium', connected ? 'text-ok' : 'text-warn']}>{connected ? '● connected' : '○ not connected'}</span>
	</div>
	{#if !prod}
		<p class="text-[13px] text-muted">The Ministry's pre-production KSeF: your real NIP, invoices without legal effect, nobody is notified. Turn on test mode (<span class="font-mono">t</span>) to issue test invoices.</p>
	{/if}
	{#if connected}
		<div><button class="btn" disabled={busy} onclick={() => (disconnecting = true)}>Disconnect</button></div>
	{:else}
		<p class="text-[13px]">
			Paste a token generated in <a class="text-accent underline" href={portal} target="_blank" rel="noreferrer">Aplikacja Podatnika KSeF{prod ? '' : ' (DEMO)'}</a> with invoice read and write permissions{prod ? '' : ' — a production token does not work here'}.
		</p>
		<form class="flex flex-wrap gap-2" onsubmit={useToken}>
			<label for="token-{env}" class="sr-only">KSeF token</label>
			<input id="token-{env}" bind:value={token} type="password" autocomplete="off" placeholder="reference|nip-…|…" class="field flex-1 font-mono text-xs" />
			<button class="btn-primary" disabled={busy || !token.trim()}>{busy ? 'Checking…' : 'Use token'}</button>
		</form>
		<details class="text-[13px] text-muted">
			<summary class="cursor-pointer">Or connect with Profil Zaufany / a qualified signature</summary>
			<ol class="mt-2 list-decimal space-y-1 pl-5">
				<li>Download the authorisation request (valid for 10 minutes).</li>
				<li>Sign it with Profil Zaufany on <a class="text-accent underline" href="https://www.gov.pl/web/gov/podpisz-dokument-elektronicznie-wykorzystaj-podpis-zaufany" target="_blank" rel="noreferrer">gov.pl</a> or a qualified signature, as a person authorised for this NIP.</li>
				<li>Upload the signed XML. The app keeps a KSeF token, signing is needed once.</li>
			</ol>
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<button class="btn" disabled={busy} onclick={downloadRequest}>1. Download request</button>
				<input type="file" accept=".xml,.xades,application/xml,text/xml" aria-label="Signed XML" class="text-xs" onchange={(event) => (signed = event.currentTarget.files?.[0] ?? null)} />
				<button class="btn" disabled={busy || !signed} onclick={uploadSigned}>3. Upload signed XML</button>
			</div>
		</details>
	{/if}
</section>

{#if disconnecting}
	<Confirm title="Disconnect KSeF {prod ? 'production' : 'DEMO'}?" confirmLabel="Disconnect" danger onconfirm={async () => { disconnecting = false; await run(() => data.ksefDisconnect(env), 'Token removed.'); }} oncancel={() => (disconnecting = false)}>
		<p>The stored token is removed from this company. Sending needs a new one.</p>
	</Confirm>
{/if}
