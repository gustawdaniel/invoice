import type { BankTransaction, BookStatus, Cost, CostCategory, Invoice, TransactionKind } from './types';
import { gross } from './invoice';

export const KIND_LABEL: Record<TransactionKind, string> = {
	unclassified: 'Unclassified',
	sale_payment: 'Client paid an invoice',
	refund: 'Refund from a supplier',
	shareholder_loan: 'Loan from the shareholder',
	capital: 'Share capital',
	interest: 'Bank interest',
	cost_payment: 'Paid a cost',
	shareholder_repayment: 'Loan repaid to the shareholder',
	salary: 'Pay for people',
	tax: 'Tax (CIT, VAT, PIT)',
	zus: 'ZUS',
	bank_fee: 'Bank fee',
	private: 'Private, owed by the shareholder',
	own_transfer: 'Between own accounts',
	other: 'Other'
};

// one key per common decision in the review queue
export const KIND_KEYS: [string, TransactionKind][] = [
	['1', 'sale_payment'],
	['2', 'cost_payment'],
	['3', 'bank_fee'],
	['4', 'tax'],
	['5', 'zus'],
	['6', 'salary'],
	['7', 'shareholder_loan'],
	['8', 'shareholder_repayment'],
	['9', 'own_transfer'],
	['0', 'private']
];

export const OTHER_KINDS: TransactionKind[] = ['refund', 'capital', 'interest', 'other', 'unclassified'];

export const STATUS_LABEL: Record<BookStatus, string> = {
	auto: 'classified by the agent',
	confirmed: 'confirmed by you',
	review: 'waiting for you'
};

export const CATEGORY_LABEL: Record<CostCategory, string> = {
	hosting: 'Hosting & cloud',
	software: 'Software & subscriptions',
	equipment: 'Equipment',
	office: 'Office',
	travel: 'Travel',
	accounting: 'Accounting',
	legal: 'Legal',
	marketing: 'Marketing',
	education: 'Education',
	subcontractor: 'Subcontractors',
	telecom: 'Phone & internet',
	other: 'Other'
};

const near = (a: number, b: number) => Math.abs(Math.abs(a) - Math.abs(b)) < 0.005;

// invoices whose amount matches a payment that came in, closest date first
export function invoiceCandidates(t: BankTransaction, invoices: Invoice[]): Invoice[] {
	if (t.amount <= 0) return [];
	return invoices
		.filter((inv) => inv.currency === t.currency && (near(gross(inv), t.amount) || near(gross(inv) - inv.withholdingTax, t.amount)))
		.sort((a, b) => Math.abs(Date.parse(a.issueDate) - Date.parse(t.date)) - Math.abs(Date.parse(b.issueDate) - Date.parse(t.date)))
		.slice(0, 5);
}

// purchase documents with the amount of a payment that went out
export function costCandidates(t: BankTransaction, costs: Cost[]): Cost[] {
	if (t.amount >= 0) return [];
	return costs
		.filter((c) => c.currency === t.currency && near(c.gross, t.amount))
		.sort((a, b) => Math.abs(Date.parse(a.issueDate) - Date.parse(t.date)) - Math.abs(Date.parse(b.issueDate) - Date.parse(t.date)))
		.slice(0, 5);
}

export function filterTransactions(list: BankTransaction[], query: string): BankTransaction[] {
	const words = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (!words.length) return list;
	return list.filter((t) => {
		const text = `${t.date} ${t.description} ${t.bankCategory} ${t.kind} ${KIND_LABEL[t.kind]} ${t.note} ${t.amount.toFixed(2)}`.toLowerCase();
		return words.every((w) => text.includes(w));
	});
}
