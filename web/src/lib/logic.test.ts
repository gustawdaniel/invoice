import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { isInvoiceCommand, itemNameFor, parseInvoiceCommand, saleDateFor } from './command';
import { draftInvoice, fromApi, money, nextNumber, outstanding, status, toApi, totals } from './invoice';
import { filterInvoices, parseQuery, score, sortInvoices } from './search';
import type { Client, Company, Invoice } from './types';

const patronad: Client = {
	id: 'c1',
	name: 'PATRONAD SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ',
	street: 'ul. Londyńska 25',
	post: '03-921',
	city: 'Warszawa',
	tin: '1133022863',
	tinName: 'NIP',
	country: 'Poland'
};
const ovh: Client = { ...patronad, id: 'c2', name: 'OVH SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ', tin: '8992520556' };

const company: Company = {
	id: 'co',
	name: 'PRECISE LAB',
	tin: '5272923603',
	address: 'ul. Grzybowska 85A/32, 00-844 Warszawa',
	info: '',
	logo: '',
	signature: '',
	country: 'PL',
	status: 'active',
	vatExemptionBasis: 'Art. 113 ust. 1 ustawy o VAT',
	krs: '',
	regon: '',
	defaultIssuePlace: 'Warszawa',
	defaultIssuerName: '',
	defaultBankAccountNumber: 'PL61 1090 1014 0000 0712 1981 2874',
	defaultPublicNote: '',
	ksefConnected: true,
	ksefDemoConnected: true
};

function invoice(overrides: Partial<Invoice> = {}): Invoice {
	return {
		...draftInvoice(company, [], 'Daniel', false),
		id: 'i1',
		clientId: patronad.id,
		client: patronad,
		items: [{ name: 'Consulting', unit: 'service', quantity: 1, priceNet: 12000, vat: { name: 'zw.', value: 0 } }],
		...overrides
	};
}

describe('API mapping', () => {
	it('turns enum names into labels and back', () => {
		const parsed = fromApi({
			id: 'i1',
			number: '0001/10/2026',
			client: patronad,
			paymentForm: 'd14',
			paid: 0,
			items: [{ name: 'x', unit: 'pack', quantity: 2, priceNet: 10, vat: { name: 'VAT_zw', value: 0 } }]
		});
		expect(parsed.paymentForm).toBe('14d');
		expect(parsed.items[0].unit).toBe('pack.');
		expect(parsed.items[0].vat.name).toBe('zw.');
		expect(parsed.clientId).toBe('c1');
		expect(toApi(parsed).items[0]).toEqual({ name: 'x', unit: 'pack.', quantity: 2, priceNet: 10, vat: { name: 'zw.', value: 0 } });
	});
});

describe('amounts', () => {
	it('sums net, VAT and gross per item, rounded to grosze', () => {
		const inv = invoice({
			items: [
				{ name: 'a', unit: 'hour', quantity: 3, priceNet: 33.33, vat: { name: '23%', value: 0.23 } },
				{ name: 'b', unit: 'service', quantity: 1, priceNet: 100, vat: { name: 'zw.', value: 0 } }
			]
		});
		expect(totals(inv)).toEqual({ net: 199.99, vat: 23, gross: 222.99 });
	});

	it('formats Polish and English money', () => {
		expect(money(12000, 'pl').replace(/\s/g, ' ')).toBe('12 000,00');
		expect(money(12000, 'en')).toBe('12,000.00');
	});
});

describe('numbering', () => {
	it('continues the highest sequence of the month', () => {
		const existing = [
			{ number: '0001/10/2026', issueDate: '2026-10-02' },
			{ number: '0005/10/2026', issueDate: '2026-10-09' },
			{ number: '0009/09/2026', issueDate: '2026-09-30' }
		];
		expect(nextNumber(existing, '2026-10-17')).toBe('0006/10/2026');
		expect(nextNumber(existing, '2026-11-01')).toBe('0001/11/2026');
	});
});

describe('status', () => {
	const today = '2026-10-17';
	it('is a draft until a Polish invoice is in KSeF', () => {
		expect(status(invoice(), true, today)).toBe('draft');
		expect(status(invoice({ ksefSendRequestedAt: '2026-10-17T12:00:00Z' }), true, today)).toBe('approval');
		expect(status(invoice({ ksefError: 'bad' }), true, today)).toBe('error');
	});
	it('tracks payment once issued', () => {
		const issued = { ksefNumber: '5272923603-20261017-ABC' };
		expect(status(invoice({ ...issued, deadlineDate: '2026-10-31' }), true, today)).toBe('unpaid');
		expect(status(invoice({ ...issued, deadlineDate: '2026-10-10' }), true, today)).toBe('overdue');
		expect(status(invoice({ ...issued, paid: 12000 }), true, today)).toBe('paid');
		expect(status(invoice({ ...issued, paid: 100 }), true, today)).toBe('partial');
		expect(status(invoice({ deadlineDate: '2026-10-10' }), false, today)).toBe('overdue');
	});
	it('counts withholding tax as settled', () => {
		const foreign = { deadlineDate: '2026-10-10', currency: 'EUR' as const };
		expect(status(invoice({ ...foreign, paid: 10800 }), false, today)).toBe('partial');
		expect(status(invoice({ ...foreign, paid: 10800, withholdingTax: 1200 }), false, today)).toBe('paid');
		expect(outstanding(invoice({ paid: 10800, withholdingTax: 600 }))).toBe(600);
	});
});

describe('draft defaults', () => {
	it('prefer company defaults over the latest invoice', () => {
		const latest = invoice({ issuePlace: 'Kraków', bankAccountNumber: 'OLD', publicNote: 'old note', issueDate: '2026-10-01' });
		const draft = draftInvoice({ ...company, defaultPublicNote: '' }, [latest], 'Daniel', true);
		expect(draft.issuePlace).toBe('Warszawa');
		expect(draft.bankAccountNumber).toBe(company.defaultBankAccountNumber);
		expect(draft.publicNote).toBe('old note');
		expect(draft.issuerName).toBe('Daniel');
		expect(draft.livemode).toBe(false);
	});
});

describe('search', () => {
	const list = [
		invoice({ id: 'a', number: '0001/10/2026', issueDate: '2026-10-02', ksefNumber: 'K1', deadlineDate: '2026-10-05' }),
		invoice({ id: 'b', number: '0002/10/2026', issueDate: '2026-10-09', client: ovh, createdByAgent: 'claude', currency: 'EUR' }),
		invoice({ id: 'c', number: '0010/09/2025', issueDate: '2025-09-30', ksefNumber: 'K2', paid: 12000 })
	];
	const ids = (query: string) => filterInvoices(list, query, true).map((inv) => inv.id);

	it('parses filters, negation and amounts', () => {
		expect(parseQuery('-is:test client:acme >1000 hello')).toEqual({
			filters: [
				{ key: 'is', value: 'test', negated: true },
				{ key: 'client', value: 'acme', negated: false },
				{ key: '>', value: '1000', negated: false }
			],
			text: ['hello']
		});
	});

	it('filters by status, client, period, author and currency', () => {
		expect(ids('is:overdue')).toEqual(['a']);
		expect(ids('is:unpaid')).toEqual(['a']);
		expect(ids('is:draft')).toEqual(['b']);
		expect(ids('client:ovh')).toEqual(['b']);
		expect(ids('-client:ovh year:2026')).toEqual(['a']);
		expect(ids('by:agent')).toEqual(['b']);
		expect(ids('cur:eur')).toEqual(['b']);
		expect(ids('in:ksef >100')).toEqual(['a', 'c']);
		expect(ids('patronad 09/2025')).toEqual(['c']);
	});

	it('sorts newest first', () => {
		expect(sortInvoices(list).map((inv) => inv.id)).toEqual(['b', 'a', 'c']);
	});

	it('scores word prefixes above substrings', () => {
		expect(score('PATRONAD SPÓŁKA', 'patro')).toBeGreaterThan(score('OVH PATRONAD', 'patro'));
		expect(score('OVH SPÓŁKA', 'xyz')).toBe(0);
	});
});

describe('invoice command', () => {
	const today = dayjs('2026-10-17');

	it('recognises the trigger word', () => {
		expect(isInvoiceCommand('invoice patronad')).toBe(true);
		expect(isInvoiceCommand(':fv ovh')).toBe(true);
		expect(isInvoiceCommand('patronad')).toBe(false);
	});

	it('reads client, amount, month and item name', () => {
		const intent = parseInvoiceCommand('invoice patronad 12 000 net for october consulting', [patronad, ovh], today);
		expect(intent.client?.id).toBe('c1');
		expect(intent.amount).toBe(12000);
		expect(intent.gross).toBe(false);
		expect(intent.month).toBe('2026-10');
		expect(intent.itemName).toBe('Consulting');
		expect(itemNameFor(intent, 'pl')).toBe('Consulting — październik 2026');
		expect(saleDateFor(intent, '2026-10-17')).toBe('2026-10-17');
	});

	it('handles thousands, currency, gross, hours and last year', () => {
		const intent = parseInvoiceCommand('fv ovh 2,5k eur brutto 10h grudzień hosting', [patronad, ovh], today);
		expect(intent.client?.id).toBe('c2');
		expect(intent.amount).toBe(2500);
		expect(intent.currency).toBe('EUR');
		expect(intent.gross).toBe(true);
		expect(intent.hours).toBe(10);
		expect(intent.month).toBe('2025-12');
		expect(saleDateFor(intent, '2026-10-17')).toBe('2025-12-31');
	});
});
