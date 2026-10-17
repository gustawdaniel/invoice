<script lang="ts">
	import { STATUS_LABEL, daysOverdue, type Status } from '../invoice';
	import type { Invoice } from '../types';

	let { status, invoice }: { status: Status; invoice: Invoice } = $props();

	const tone: Record<Status, string> = {
		approval: 'bg-warn-soft text-warn',
		error: 'bg-bad-soft text-bad',
		draft: 'bg-sunken text-muted',
		paid: 'bg-ok-soft text-ok',
		partial: 'bg-warn-soft text-warn',
		overdue: 'bg-bad-soft text-bad',
		unpaid: 'bg-sunken text-ink'
	};
	const label = $derived(
		status === 'overdue' ? `Overdue ${daysOverdue(invoice)}d` : status === 'paid' && invoice.ksefNumber ? 'In KSeF · paid' : invoice.ksefNumber && status === 'unpaid' ? 'In KSeF · unpaid' : STATUS_LABEL[status]
	);
</script>

<span class={['inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs', tone[status]]}>{label}</span>
