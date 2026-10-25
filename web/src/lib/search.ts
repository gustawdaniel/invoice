import { gross, status, type Status } from './invoice';
import type { Invoice } from './types';

// query language of the invoice list: free text plus filters, "-" negates a filter
//   is:unpaid|paid|overdue|draft|scheduled|approval|error|partial|ksef  client:acme  month:2026-10  year:2025
//   cur:EUR  by:agent|me|<agent name>  >10000  <500
export interface Filter {
	key: string;
	value: string;
	negated: boolean;
}

export interface Query {
	filters: Filter[];
	text: string[];
}

const FILTER = /^(-?)(is|client|month|year|cur|by|in):(.+)$/i;
const AMOUNT = /^([<>])(\d+(?:[.,]\d+)?)$/;

export function parseQuery(input: string): Query {
	const filters: Filter[] = [];
	const text: string[] = [];
	for (const token of input.trim().split(/\s+/).filter(Boolean)) {
		const filter = token.match(FILTER);
		const amount = token.match(AMOUNT);
		if (filter) {
			filters.push({ negated: filter[1] === '-', key: filter[2].toLowerCase(), value: filter[3].toLowerCase() });
		} else if (amount) {
			filters.push({ negated: false, key: amount[1], value: amount[2].replace(',', '.') });
		} else {
			text.push(token.toLowerCase());
		}
	}
	return { filters, text };
}

function matches(filter: Filter, invoice: Invoice, invoiceStatus: Status): boolean {
	const { key, value } = filter;
	switch (key) {
		case 'is':
			if (value === 'ksef') return Boolean(invoice.ksefNumber);
			if (value === 'unpaid') return ['unpaid', 'overdue', 'partial'].includes(invoiceStatus);
			return invoiceStatus === value;
		case 'in':
			return value === 'ksef' && Boolean(invoice.ksefNumber);
		case 'client':
			return invoice.client.name.toLowerCase().includes(value) || invoice.client.tin.includes(value);
		case 'month':
			return invoice.issueDate.startsWith(value);
		case 'year':
			return invoice.issueDate.startsWith(value);
		case 'cur':
			return invoice.currency.toLowerCase() === value;
		case 'by':
			if (value === 'agent') return Boolean(invoice.createdByAgent);
			if (value === 'me' || value === 'human') return !invoice.createdByAgent;
			return (invoice.createdByAgent ?? '').toLowerCase().includes(value);
		case '>':
			return gross(invoice) > Number(value);
		case '<':
			return gross(invoice) < Number(value);
		default:
			return true;
	}
}

function haystack(invoice: Invoice): string {
	return [
		invoice.number,
		invoice.client.name,
		invoice.client.tin,
		invoice.client.city,
		invoice.ksefNumber ?? '',
		invoice.createdByAgent ?? '',
		invoice.publicNote,
		invoice.privateNote,
		...invoice.items.map((item) => item.name)
	]
		.join(' ')
		.toLowerCase();
}

export function filterInvoices(invoices: Invoice[], input: string, usesKsef: boolean): Invoice[] {
	const query = parseQuery(input);
	if (!query.filters.length && !query.text.length) return invoices;
	return invoices.filter((invoice) => {
		const invoiceStatus = status(invoice, usesKsef);
		const text = haystack(invoice);
		return (
			query.filters.every((filter) => matches(filter, invoice, invoiceStatus) !== filter.negated) &&
			query.text.every((word) => text.includes(word))
		);
	});
}

// newest first: by issue date, then by the sequence in the number
export function sortInvoices(invoices: Invoice[]): Invoice[] {
	const key = (invoice: Invoice) =>
		`${invoice.issueDate}|${(invoice.number.match(/^(\d+)/)?.[1] ?? '').padStart(8, '0')}`;
	return [...invoices].sort((a, b) => key(b).localeCompare(key(a)));
}

// one-word fuzzy score for the palette: prefix of a word beats a substring, substring beats subsequence
export function score(candidate: string, query: string): number {
	const c = candidate.toLowerCase();
	const q = query.toLowerCase().trim();
	if (!q) return 1;
	if (c.startsWith(q)) return 100 - c.length / 100;
	if (c.split(/[\s"'.,-]+/).some((word) => word.startsWith(q))) return 80 - c.length / 100;
	const index = c.indexOf(q);
	if (index >= 0) return 60 - index / 10;
	let position = 0;
	for (const char of q) {
		position = c.indexOf(char, position);
		if (position < 0) return 0;
		position++;
	}
	return 20;
}
