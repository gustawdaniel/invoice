import dayjs from 'dayjs';
import { score } from './search';
import type { Client, Currency } from './types';

// "invoice acme 12 000 net october consulting" → a draft ready to create
export interface InvoiceIntent {
	client: Client | null;
	amount: number | null;
	// the amount includes VAT
	gross: boolean;
	currency: Currency | null;
	// YYYY-MM of the work, gives the sale date and the item name suffix
	month: string | null;
	hours: number | null;
	itemName: string;
}

const TRIGGERS = ['invoice', 'inv', 'faktura', 'fv', 'fakture', 'fakturę'];
const STOP = new Set(['for', 'za', 'to', 'dla', 'of', 'new', 'nowa', 'a', 'the', 'na']);
const CURRENCY: Record<string, Currency> = { pln: 'PLN', 'zł': 'PLN', zl: 'PLN', eur: 'EUR', '€': 'EUR', usd: 'USD', $: 'USD', gbp: 'GBP', '£': 'GBP' };
const MONTHS: [number, string[]][] = [
	[1, ['january', 'jan', 'styczeń', 'styczen', 'stycznia', 'sty']],
	[2, ['february', 'feb', 'luty', 'lutego', 'lut']],
	[3, ['march', 'mar', 'marzec', 'marca']],
	[4, ['april', 'apr', 'kwiecień', 'kwiecien', 'kwietnia', 'kwi']],
	[5, ['may', 'maj', 'maja']],
	[6, ['june', 'jun', 'czerwiec', 'czerwca', 'cze']],
	[7, ['july', 'jul', 'lipiec', 'lipca', 'lip']],
	[8, ['august', 'aug', 'sierpień', 'sierpien', 'sierpnia', 'sie']],
	[9, ['september', 'sep', 'sept', 'wrzesień', 'wrzesien', 'września', 'wrzesnia', 'wrz']],
	[10, ['october', 'oct', 'październik', 'pazdziernik', 'października', 'pazdziernika', 'paź', 'paz']],
	[11, ['november', 'nov', 'listopad', 'listopada', 'lis']],
	[12, ['december', 'dec', 'grudzień', 'grudzien', 'grudnia', 'gru']]
];

export function isInvoiceCommand(input: string): boolean {
	const first = input.trim().split(/\s+/)[0]?.toLowerCase().replace(/^:/, '');
	return TRIGGERS.includes(first);
}

function monthOf(token: string, today: dayjs.Dayjs): string | null {
	const found = MONTHS.find(([, names]) => names.includes(token));
	if (!found) return null;
	const month = found[0];
	// a month later than next month means last year: "december" typed in March
	const year = month > today.month() + 2 ? today.year() - 1 : today.year();
	return `${year}-${String(month).padStart(2, '0')}`;
}

export function parseInvoiceCommand(input: string, clients: Client[], today = dayjs()): InvoiceIntent {
	// "12 000" and "12 000,50" are one amount
	const normalized = input
		.trim()
		.replace(/^:/, '')
		.replace(/(\d)[\s ](?=\d{3}\b)/g, '$1');
	const tokens = normalized.split(/\s+/).filter(Boolean);
	if (tokens.length && TRIGGERS.includes(tokens[0].toLowerCase())) tokens.shift();

	const intent: InvoiceIntent = {
		client: null,
		amount: null,
		gross: false,
		currency: null,
		month: null,
		hours: null,
		itemName: ''
	};
	const rest: string[] = [];

	// the client is the token that best matches a client name (a word prefix, at least 3 letters)
	let clientToken = -1;
	let best = 0;
	tokens.forEach((token, index) => {
		if (token.length < 3 || /\d/.test(token)) return;
		for (const client of clients) {
			const s = score(client.name, token);
			if (s >= 80 && s > best) {
				best = s;
				clientToken = index;
				intent.client = client;
			}
		}
	});

	tokens.forEach((token, index) => {
		if (index === clientToken) return;
		const lower = token.toLowerCase();
		const amount = lower.match(/^(\d+(?:[.,]\d{1,2})?)(k)?(zł|pln|eur|€|usd|\$|gbp|£)?$/);
		const hours = lower.match(/^(\d+(?:[.,]\d+)?)(h|godz)$/);
		if (hours) intent.hours = Number(hours[1].replace(',', '.'));
		else if (amount && intent.amount === null) {
			intent.amount = Number(amount[1].replace(',', '.')) * (amount[2] ? 1000 : 1);
			if (amount[3]) intent.currency = CURRENCY[amount[3]];
		} else if (CURRENCY[lower]) intent.currency = CURRENCY[lower];
		else if (['net', 'netto'].includes(lower)) intent.gross = false;
		else if (['gross', 'brutto'].includes(lower)) intent.gross = true;
		else if (monthOf(lower, today)) intent.month = monthOf(lower, today);
		else if (!STOP.has(lower)) rest.push(token);
	});

	intent.itemName = rest.join(' ');
	if (intent.itemName) intent.itemName = intent.itemName[0].toUpperCase() + intent.itemName.slice(1);
	return intent;
}

const PL_MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];

// "Consulting — październik 2026"
export function itemNameFor(intent: InvoiceIntent, lang: 'pl' | 'en'): string {
	const base = intent.itemName || (lang === 'pl' ? 'Usługi' : 'Services');
	if (!intent.month) return base;
	const date = dayjs(`${intent.month}-01`);
	const month = lang === 'pl' ? PL_MONTHS[date.month()] : date.format('MMMM');
	return `${base} — ${month} ${date.year()}`;
}

// work done in a past month is sold on its last day
export function saleDateFor(intent: InvoiceIntent, issueDate: string): string {
	if (!intent.month) return issueDate;
	const end = dayjs(`${intent.month}-01`).endOf('month').format('YYYY-MM-DD');
	return end < issueDate ? end : issueDate;
}
