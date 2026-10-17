import dayjs from 'dayjs';
import type {
	Client,
	Company,
	Currency,
	ExchangeRate,
	Invoice,
	Item,
	PaymentKey,
	Unit,
	Vat,
	VatName
} from './types';

export const VATS: Vat[] = [
	{ name: '23%', value: 0.23 },
	{ name: '8%', value: 0.08 },
	{ name: '5%', value: 0.05 },
	{ name: '0%', value: 0 },
	{ name: 'zw.', value: 0 },
	{ name: 'np.', value: 0 },
	{ name: 'np. EU', value: 0 },
	{ name: '0% WDT', value: 0 },
	{ name: '0% Exp.', value: 0 },
	{ name: 'o.o.', value: 0 },
	{ name: '19%', value: 0.19 },
	{ name: '18%', value: 0.18 },
	{ name: 'exempt.', value: 0 }
];

export const UNITS: Unit[] = [
	'service',
	'hour',
	'piece',
	'pack.',
	'box',
	'palette',
	't.',
	'kg',
	'm2',
	'm3',
	'km',
	'mb',
	'l',
	'mh.'
];

export const CURRENCIES: Currency[] = ['PLN', 'EUR', 'USD', 'GBP'];

export const PAYMENT_FORMS: { key: PaymentKey; en: string; pl: string; days?: number }[] = [
	{ key: '14d', en: 'Transfer 14 days', pl: 'Przelew 14 dni', days: 14 },
	{ key: '7d', en: 'Transfer 7 days', pl: 'Przelew 7 dni', days: 7 },
	{ key: 'prepaid', en: 'Transfer (prepaid)', pl: 'Przelew (przedpłata)', days: 0 },
	{ key: 'cash', en: 'Cash', pl: 'Gotówka', days: 0 },
	{ key: 'card', en: 'Payment card', pl: 'Karta płatnicza', days: 0 },
	{ key: 'delivery', en: 'Cash on delivery', pl: 'Za pobraniem', days: 0 },
	{ key: 'check', en: 'Check', pl: 'Czek' },
	{ key: 'dotpay', en: 'DotPay', pl: 'DotPay' },
	{ key: 'paypal', en: 'PayPal', pl: 'PayPal' },
	{ key: 'payu', en: 'PayU', pl: 'PayU' },
	{ key: 'other', en: 'Other', pl: 'Inna' }
];

// the API stores enum names (VAT_zw, d14, pack), the app works with labels (zw., 14d, pack.)
const VAT_BY_ENUM: Record<string, VatName> = {
	VAT_23: '23%',
	VAT_19: '19%',
	VAT_18: '18%',
	VAT_8: '8%',
	VAT_5: '5%',
	VAT_0: '0%',
	VAT_zw: 'zw.',
	VAT_exempt: 'exempt.',
	VAT_np: 'np.',
	VAT_npEU: 'np. EU',
	VAT_0_WDT: '0% WDT',
	VAT_0_EXP: '0% Exp.',
	VAT_oo: 'o.o.'
};
const UNIT_BY_ENUM: Record<string, Unit> = { pack: 'pack.', t: 't.', mh: 'mh.' };
const PAYMENT_BY_ENUM: Record<string, PaymentKey> = { d14: '14d', d7: '7d' };

const PL_UNITS: Record<string, string> = {
	piece: 'szt.',
	service: 'usł.',
	hour: 'godz.',
	'pack.': 'opak.',
	box: 'karton',
	palette: 'paleta',
	't.': 't',
	'mh.': 'rbh'
};

export function unitLabel(unit: Unit, pl: boolean): string {
	return pl ? (PL_UNITS[unit] ?? unit) : unit;
}

export function paymentLabel(key: PaymentKey, pl: boolean): string {
	const form = PAYMENT_FORMS.find((f) => f.key === key);
	return form ? (pl ? form.pl : form.en) : key;
}

export function isExempt(vat: Vat): boolean {
	return vat.name === 'zw.' || vat.name === 'exempt.';
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function fromApi(raw: any): Invoice {
	return {
		...raw,
		clientId: raw.clientId ?? raw.client?.id ?? '',
		client: raw.client ? clientFromApi(raw.client) : emptyClient(),
		paymentDate: raw.paymentDate ?? null,
		paymentForm: PAYMENT_BY_ENUM[raw.paymentForm] ?? raw.paymentForm,
		receiverName: raw.receiverName ?? '',
		paid: Number(raw.paid) || 0,
		withholdingTax: Number(raw.withholdingTax) || 0,
		livemode: raw.livemode !== false,
		items: (raw.items ?? []).map(
			(item: any): Item => ({
				name: item.name,
				unit: UNIT_BY_ENUM[item.unit] ?? item.unit,
				quantity: Number(item.quantity),
				priceNet: Number(item.priceNet),
				vat: { name: VAT_BY_ENUM[item.vat?.name] ?? item.vat?.name, value: Number(item.vat?.value) }
			})
		)
	};
}

export function clientFromApi(raw: any): Client {
	return {
		id: raw.id,
		name: raw.name ?? '',
		street: raw.street ?? '',
		post: raw.post ?? '',
		city: raw.city ?? '',
		tin: raw.tin ?? '',
		tinName: raw.tinName ?? 'NIP',
		country: raw.country ?? 'Poland'
	};
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// body of POST /invoices and PUT /invoices/:id
export function toApi(invoice: Invoice) {
	return {
		number: invoice.number,
		clientId: invoice.clientId,
		issueDate: invoice.issueDate,
		saleDate: invoice.saleDate,
		deadlineDate: invoice.deadlineDate,
		issuePlace: invoice.issuePlace,
		currency: invoice.currency,
		lang: invoice.lang,
		paymentForm: invoice.paymentForm,
		items: invoice.items.map((item) => ({
			name: item.name,
			unit: item.unit,
			quantity: Number(item.quantity),
			priceNet: Number(item.priceNet),
			vat: { name: item.vat.name, value: item.vat.value }
		})),
		issuerName: invoice.issuerName,
		bankAccountNumber: invoice.bankAccountNumber,
		publicNote: invoice.publicNote,
		privateNote: invoice.privateNote,
		paid: Number(invoice.paid) || 0,
		withholdingTax: Number(invoice.withholdingTax) || 0,
		...(invoice.paymentDate ? { paymentDate: invoice.paymentDate } : {})
	};
}

export function emptyClient(): Client {
	return { id: '', name: '', street: '', post: '', city: '', tin: '', tinName: 'NIP', country: 'Poland' };
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function itemNet(item: Item): number {
	return round2(item.quantity * item.priceNet);
}

export function itemVat(item: Item): number {
	return round2(itemNet(item) * item.vat.value);
}

export function totals(invoice: Pick<Invoice, 'items'>) {
	const net = round2(invoice.items.reduce((sum, item) => sum + itemNet(item), 0));
	const vat = round2(invoice.items.reduce((sum, item) => sum + itemVat(item), 0));
	return { net, vat, gross: round2(net + vat) };
}

export function gross(invoice: Pick<Invoice, 'items'>): number {
	return totals(invoice).gross;
}

// 12 000,00 for Polish, 12,000.00 for English
export function money(value: number, lang: 'pl' | 'en' = 'pl'): string {
	return new Intl.NumberFormat(lang === 'pl' ? 'pl-PL' : 'en-GB', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
		useGrouping: 'always'
	} as Intl.NumberFormatOptions).format(value);
}

export function exchange(value: number, from: Currency, to: Currency, rate: ExchangeRate | null): number {
	if (from === to) return value;
	if (!rate) return 0;
	return (value * rate[to]) / rate[from];
}

// what the client covered: money received plus tax it withheld for its own tax office
export function settled(invoice: Pick<Invoice, 'paid' | 'withholdingTax'>): number {
	return (Number(invoice.paid) || 0) + (Number(invoice.withholdingTax) || 0);
}

// what is still owed
export function outstanding(invoice: Invoice): number {
	return Math.max(0, Math.round((gross(invoice) - settled(invoice)) * 100) / 100);
}

export type Status = 'approval' | 'error' | 'draft' | 'paid' | 'partial' | 'overdue' | 'unpaid';

export const STATUS_LABEL: Record<Status, string> = {
	approval: 'Awaiting approval',
	error: 'KSeF rejected',
	draft: 'Draft',
	paid: 'Paid',
	partial: 'Partly paid',
	overdue: 'Overdue',
	unpaid: 'Unpaid'
};

// a Polish invoice exists legally once it is in KSeF; a Georgian one once it is issued
export function status(invoice: Invoice, usesKsef: boolean, today = dayjs().format('YYYY-MM-DD')): Status {
	const total = gross(invoice);
	if (total > 0 && settled(invoice) >= total - 0.005) return 'paid';
	if (usesKsef && !invoice.ksefNumber) {
		if (invoice.ksefSendRequestedAt) return 'approval';
		if (invoice.ksefError) return 'error';
		return 'draft';
	}
	if (invoice.paid > 0) return 'partial';
	if (invoice.deadlineDate < today) return 'overdue';
	return 'unpaid';
}

export function daysOverdue(invoice: Invoice, today = dayjs()): number {
	return today.startOf('day').diff(dayjs(invoice.deadlineDate), 'day');
}

// 0003/10/2026: next sequence within the month of the issue date
export function nextNumber(invoices: Pick<Invoice, 'number' | 'issueDate'>[], issueDate: string): string {
	const date = dayjs(issueDate);
	const suffix = date.format('MM/YYYY');
	const inMonth = invoices.filter((inv) => inv.issueDate.startsWith(date.format('YYYY-MM')));
	const sequences = inMonth
		.map((inv) => inv.number.match(/^(\d+)\//)?.[1])
		.filter((seq): seq is string => Boolean(seq))
		.map(Number);
	const next = Math.max(inMonth.length, ...sequences, 0) + 1;
	return `${String(next).padStart(4, '0')}/${suffix}`;
}

export function deadlineFor(issueDate: string, payment: PaymentKey): string {
	const days = PAYMENT_FORMS.find((f) => f.key === payment)?.days ?? 0;
	return dayjs(issueDate).add(days, 'day').format('YYYY-MM-DD');
}

// VAT payers in Poland default to 23%, companies with an exemption basis (and Georgian ones) to zw.
export function defaultVat(company: Pick<Company, 'country' | 'vatExemptionBasis'>): Vat {
	return company.country === 'PL' && !company.vatExemptionBasis
		? { name: '23%', value: 0.23 }
		: { name: 'zw.', value: 0 };
}

export function newItem(company: Pick<Company, 'country' | 'vatExemptionBasis'>, previous?: Item): Item {
	return {
		name: '',
		unit: previous?.unit ?? (company.country === 'PL' ? 'service' : 'hour'),
		quantity: 1,
		priceNet: previous?.priceNet ?? 0,
		vat: previous?.vat ?? defaultVat(company)
	};
}

// seller-side fields come from the company defaults, then from the latest invoice
export function draftInvoice(company: Company, invoices: Invoice[], userName: string, testMode: boolean): Invoice {
	const latest = [...invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate))[0];
	const issueDate = dayjs().format('YYYY-MM-DD');
	const paymentForm = latest?.paymentForm ?? '14d';
	return {
		id: '',
		number: nextNumber(invoices, issueDate),
		clientId: '',
		client: emptyClient(),
		issueDate,
		saleDate: issueDate,
		deadlineDate: deadlineFor(issueDate, paymentForm),
		paymentDate: null,
		issuePlace: company.defaultIssuePlace || latest?.issuePlace || '',
		paymentForm,
		currency: latest?.currency ?? (company.country === 'PL' ? 'PLN' : 'EUR'),
		lang: latest?.lang ?? (company.country === 'PL' ? 'pl' : 'en'),
		items: [],
		issuerName: company.defaultIssuerName || latest?.issuerName || userName,
		receiverName: '',
		bankAccountNumber: company.defaultBankAccountNumber || latest?.bankAccountNumber || '',
		publicNote: company.defaultPublicNote || latest?.publicNote || '',
		privateNote: '',
		paid: 0,
		withholdingTax: 0,
		livemode: !testMode,
		ksefEnv: null,
		ksefStatus: null,
		ksefNumber: null,
		ksefQrUrl: null,
		ksefError: null,
		ksefSentAt: null,
		createdByAgent: null,
		ksefSendRequestedAt: null,
		ksefSendRequestedBy: null,
		ksefSendRequestNote: null
	};
}

// a copy issued today with the next number, unpaid and outside KSeF
export function duplicateInvoice(source: Invoice, invoices: Invoice[], testMode: boolean): Invoice {
	const issueDate = dayjs().format('YYYY-MM-DD');
	return {
		// JSON copy: the source may be a reactive proxy, which structuredClone refuses
		...(JSON.parse(JSON.stringify(source)) as Invoice),
		id: '',
		number: nextNumber(invoices, issueDate),
		issueDate,
		saleDate: issueDate,
		deadlineDate: deadlineFor(issueDate, source.paymentForm),
		paymentDate: null,
		paid: 0,
		withholdingTax: 0,
		livemode: !testMode,
		ksefEnv: null,
		ksefStatus: null,
		ksefNumber: null,
		ksefQrUrl: null,
		ksefError: null,
		ksefSentAt: null,
		createdByAgent: null,
		ksefSendRequestedAt: null,
		ksefSendRequestedBy: null,
		ksefSendRequestNote: null
	};
}

export function isValidNip(nip: string): boolean {
	const digits = nip.replace(/\D/g, '');
	if (digits.length !== 10) return false;
	const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
	const sum = weights.reduce((s, w, i) => s + w * Number(digits[i]), 0);
	return sum % 11 === Number(digits[9]);
}
