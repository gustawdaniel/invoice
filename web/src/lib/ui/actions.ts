import { goto } from '$app/navigation';
import { duplicateInvoice, settled } from '../invoice';
import { data } from '../state/data.svelte';
import { session } from '../state/session.svelte';
import { toasts } from '../state/toast.svelte';
import { ui } from '../state/ui.svelte';
import type { Invoice } from '../types';

// the print page lays the invoices out on A4 and opens the print dialog, "Save as PDF" makes the file
export function printInvoices(ids: string[]) {
	if (!ids.length) return;
	const opened = window.open(`/print?ids=${ids.join(',')}`, '_blank');
	if (!opened) toasts.show('Allow pop-ups to print', 'The browser blocked the print window.', 'warn');
}

export async function copyNumber(invoice: Invoice) {
	await navigator.clipboard.writeText(invoice.number);
	toasts.ok('Copied', invoice.number);
}

export function duplicate(invoice: Invoice) {
	ui.draft = duplicateInvoice(invoice, data.invoices, session.testMode);
	void goto('/invoices/new');
}

// paid in full today, or back to unpaid; withholding tax goes with it
export async function markPaid(invoice: Invoice, total: number) {
	const today = new Date().toISOString().slice(0, 10);
	const paid = settled(invoice) >= total - 0.005;
	try {
		await data.recordPayment(invoice.id, {
			paid: paid ? 0 : total - invoice.withholdingTax,
			paymentDate: paid ? null : today,
			withholdingTax: paid ? 0 : invoice.withholdingTax,
			privateNote: invoice.privateNote
		});
		toasts.ok(paid ? 'Marked unpaid' : 'Marked paid', invoice.number);
	} catch (error) {
		toasts.error('Could not change the payment', error);
	}
}

// what sending would do, said plainly before it is done
export function ksefTarget(invoice: Invoice): string {
	return invoice.livemode ? 'production KSeF — legally binding, cannot be undone' : 'KSeF DEMO — test, no legal effect';
}
