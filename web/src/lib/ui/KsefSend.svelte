<script lang="ts">
	import { gross, money } from '../invoice';
	import { data } from '../state/data.svelte';
	import { toasts } from '../state/toast.svelte';
	import type { Invoice } from '../types';
	import { ksefTarget } from './actions';
	import Confirm from './Confirm.svelte';

	// sending to production KSeF is irreversible: always one explicit confirmation
	let { invoice, onclose }: { invoice: Invoice; onclose: () => void } = $props();
	const lang = $derived(data.company.country === 'PL' ? 'pl' : 'en');

	async function send() {
		try {
			await data.sendToKsef(invoice.id);
			const sent = data.invoice(invoice.id);
			if (sent?.ksefNumber) toasts.ok('Accepted by KSeF', sent.ksefNumber);
			else toasts.error('KSeF did not accept it', sent?.ksefError ?? 'No KSeF number returned');
		} catch (error) {
			toasts.error('KSeF error', error);
		} finally {
			onclose();
		}
	}
</script>

<Confirm title="Send {invoice.number} to {invoice.livemode ? 'KSeF' : 'KSeF DEMO'}?" confirmLabel={invoice.livemode ? 'Send to KSeF' : 'Send to DEMO'} danger={invoice.livemode} onconfirm={send} oncancel={onclose}>
	<p>{invoice.client.name} · <span class="font-mono">{money(gross(invoice), lang)} {invoice.currency}</span></p>
	<p class={['mt-2', invoice.livemode && 'font-medium text-bad']}>Goes to {ksefTarget(invoice)}.</p>
	{#if invoice.ksefSendRequestedBy}<p class="mt-2">Requested by {invoice.ksefSendRequestedBy}{invoice.ksefSendRequestNote ? `: “${invoice.ksefSendRequestNote}”` : ''}.</p>{/if}
</Confirm>
