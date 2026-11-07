// The monthly VAT return with the VAT register (JPK_V7M) of a Polish company, computed from the books: issued invoices
// are the sales, purchase documents with Polish VAT are the deductions, and services bought from abroad are an import of
// services (art. 28b) the company reports on both sides. Amounts in grosze (integers) so the sums are exact; the
// declaration has the rounded totals of the register columns, as the MF validation expects.
// Structures: JPK_V7M(2) for months up to 01.2026, JPK_V7M(3) from 02.2026 (rows carry the KSeF number or BFK).

import type {VatRate} from "@prisma/client";

export type VatRateName = VatRate;

export interface JpkCost {
    number: string;
    supplierName: string;
    supplierTin: string;
    supplierCountry: string; // ISO code
    issueDate: string;
    saleDate?: string | null;
    currency: string;
    net: number;
    vat: number;
    reverseCharge: boolean;
    vatPeriod?: string | null;
}

export interface JpkInvoice {
    number: string;
    issueDate: string;
    saleDate: string;
    deadlineDate: string;
    currency: string;
    client: { name: string; tin: string; country: string }; // ISO country code
    lines: { rate: VatRateName; net: number; vat: number }[];
    ksefNumber?: string | null;
    badDebtPeriod?: string | null;
    badDebtPaidPeriod?: string | null;
}

export interface JpkCompany {
    nip: string;
    name: string;
    email: string;
    taxOfficeCode: string; // e.g. 1440 (Warszawa-Wola)
}

export interface JpkInput {
    company: JpkCompany;
    costs: JpkCost[];
    invoices: JpkInvoice[];
    // average NBP rate (table A) of the last working day before the date (art. 31a ustawy o VAT)
    rate: (currency: string, date: string) => number | undefined;
}

export type RefundTerm = 'P_540' | 'P_55' | 'P_56' | 'P_560' | 'P_58';

export interface MonthOptions {
    purpose: 1 | 2; // 1 = złożenie, 2 = korekta
    carried: number; // P_39: the surplus carried from the month before (its P_62)
    refund?: { amount: number; term: RefundTerm }; // P_54 and the term of the refund
}

export interface SaleRow {
    country?: string;
    tin: string;
    name: string;
    number: string;
    issueDate: string;
    saleDate?: string;
    ksef?: string; // NrKSeF; JPK_V7M(3) writes BFK without it
    badDebt?: { deadline: string }; // KorektaPodstawyOpodt (art. 89a)
    k: Partial<Record<SaleField, number>>; // grosze
}

export interface PurchaseRow {
    country?: string;
    tin: string;
    name: string;
    number: string;
    date: string;
    k: Partial<Record<PurchaseField, number>>;
}

type SaleField = 'K_10' | 'K_11' | 'K_12' | 'K_13' | 'K_15' | 'K_16' | 'K_17' | 'K_18' | 'K_19' | 'K_20' | 'K_21' | 'K_22'
    | 'K_27' | 'K_28' | 'K_29' | 'K_30';
type PurchaseField = 'K_42' | 'K_43';

export interface Register {
    month: string;
    sales: SaleRow[];
    purchases: PurchaseRow[];
    warnings: string[];
}

export const IMPORT_VAT = 0.23;
const EU = new Set(['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'EL', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU',
    'LV', 'MT', 'NL', 'PT', 'RO', 'SE', 'SI', 'SK']);
const SALE_FIELDS: SaleField[] = ['K_10', 'K_11', 'K_12', 'K_13', 'K_15', 'K_16', 'K_17', 'K_18', 'K_19', 'K_20', 'K_21', 'K_22',
    'K_27', 'K_28', 'K_29', 'K_30'];
const OUTPUT_TAX: SaleField[] = ['K_16', 'K_18', 'K_20', 'K_28', 'K_30'];

const grosze = (value: number) => Math.round(value * 100);
const zl = (g: number) => (g < 0 ? '-' : '') + `${Math.floor(Math.abs(g) / 100)}.${String(Math.abs(g) % 100).padStart(2, '0')}`;
// the declaration rounds to whole złoty, halves away from zero
const whole = (g: number) => Math.sign(g) * Math.round(Math.abs(g) / 100);
const month = (date: string) => date.slice(0, 7);
const add = <K extends string>(k: Partial<Record<K, number>>, field: K, value: number) => { k[field] = (k[field] ?? 0) + value; };

// the tax point of an import of services: when the service was done (the end of a billed month), else the invoice date
export function taxPoint(cost: JpkCost): string {
    return cost.saleDate || cost.issueDate;
}

// the month a purchase document is in the register, or undefined when it is not
export function registerMonth(cost: JpkCost): string | undefined {
    if (cost.vatPeriod === 'none') return undefined;
    if (cost.vatPeriod) return cost.vatPeriod;
    if (cost.reverseCharge) return month(taxPoint(cost));
    return cost.vat > 0 && cost.supplierCountry === 'PL' ? month(cost.issueDate) : undefined;
}

function pln(input: JpkInput, currency: string, amount: number, date: string, what: string, warnings: string[]): number {
    if (currency === 'PLN') return grosze(amount);
    const rate = input.rate(currency, date);
    if (!rate) {
        warnings.push(`${what}: brak kursu NBP ${currency} przed ${date}`);
        return 0;
    }
    return grosze(amount * rate);
}

function saleFields(rate: VatRateName, country: string, net: number, vat: number): Partial<Record<SaleField, number>> {
    switch (rate) {
        case 'VAT_23': return {K_19: net, K_20: vat};
        case 'VAT_8': return {K_17: net, K_18: vat};
        case 'VAT_5': return {K_15: net, K_16: vat};
        case 'VAT_0': return {K_13: net};
        case 'VAT_0_WDT': return {K_21: net};
        case 'VAT_0_EXP': return {K_22: net};
        case 'VAT_zw':
        case 'VAT_exempt': return {K_10: net};
        // services taxed where the client is (art. 28b): K_12 when the client is a taxpayer in another EU country
        case 'VAT_np': return EU.has(country) ? {K_11: net, K_12: net} : {K_11: net};
        case 'VAT_npEU': return {K_11: net, K_12: net};
        default: throw new Error(`Stawka ${rate} nie jest polską stawką VAT`);
    }
}

export function register(input: JpkInput, period: string): Register {
    const warnings: string[] = [];
    const sales: SaleRow[] = [];
    const purchases: PurchaseRow[] = [];

    for (const inv of input.invoices) {
        const point = inv.saleDate || inv.issueDate;
        const client = {country: inv.client.country === 'PL' ? undefined : inv.client.country,
            tin: inv.client.tin.replace(/[^0-9A-Za-z]/g, '') || 'BRAK', name: inv.client.name};
        if (month(point) === period) {
            const k: SaleRow['k'] = {};
            for (const line of inv.lines) {
                const fields = saleFields(line.rate, inv.client.country, pln(input, inv.currency, line.net, point, inv.number, warnings),
                    pln(input, inv.currency, line.vat, point, inv.number, warnings));
                for (const [f, v] of Object.entries(fields)) add(k, f as SaleField, v);
            }
            sales.push({...client, number: inv.number, issueDate: inv.issueDate,
                saleDate: point !== inv.issueDate ? point : undefined, ksef: inv.ksefNumber ?? undefined, k});
        }
        // bad debt relief: the VAT of the unpaid invoice comes off (art. 89a ust. 1), and back when it is paid (ust. 4)
        for (const [p, sign] of [[inv.badDebtPeriod, -1], [inv.badDebtPaidPeriod, 1]] as const) {
            if (p !== period) continue;
            const k: SaleRow['k'] = {};
            for (const line of inv.lines.filter((l) => l.vat)) {
                const fields = saleFields(line.rate, inv.client.country, sign * pln(input, inv.currency, line.net, point, inv.number, warnings),
                    sign * pln(input, inv.currency, line.vat, point, inv.number, warnings));
                for (const [f, v] of Object.entries(fields)) add(k, f as SaleField, v);
            }
            sales.push({...client, number: inv.number, issueDate: inv.issueDate, ksef: inv.ksefNumber ?? undefined,
                badDebt: {deadline: inv.deadlineDate}, k});
        }
    }

    for (const c of input.costs) {
        if (registerMonth(c) !== period) continue;
        const supplier = {country: c.supplierCountry === 'PL' ? undefined : c.supplierCountry,
            tin: c.supplierTin.replace(/[^0-9A-Za-z]/g, '') || 'BRAK', name: c.supplierName};
        if (c.reverseCharge) {
            // import of services: output VAT on the sales side, the same VAT deducted on the purchase side (art. 86 ust. 2 pkt 4)
            const point = taxPoint(c);
            const net = pln(input, c.currency, c.net, point, c.number, warnings);
            const vat = Math.round(net * IMPORT_VAT);
            sales.push({...supplier, number: c.number, issueDate: c.issueDate, saleDate: point !== c.issueDate ? point : undefined,
                k: EU.has(c.supplierCountry) ? {K_29: net, K_30: vat} : {K_27: net, K_28: vat}});
            purchases.push({...supplier, number: c.number, date: point, k: {K_42: net, K_43: vat}});
        } else {
            if (c.currency !== 'PLN') warnings.push(`${c.number}: faktura z polskim VAT w ${c.currency}, kwoty po kursie z ${c.issueDate}`);
            purchases.push({...supplier, number: c.number, date: c.issueDate,
                k: {K_42: pln(input, c.currency, c.net, c.issueDate, c.number, warnings),
                    K_43: pln(input, c.currency, c.vat, c.issueDate, c.number, warnings)}});
        }
    }
    sales.sort((a, b) => (a.saleDate ?? a.issueDate).localeCompare(b.saleDate ?? b.issueDate) || a.number.localeCompare(b.number));
    purchases.sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));
    return {month: period, sales, purchases, warnings};
}

export type Declaration = Record<string, number>;

const sum = <K extends string>(rows: { k: Partial<Record<K, number>> }[], f: K) => rows.reduce((s, r) => s + (r.k[f] ?? 0), 0);

// the declaration part (VAT-7): P_10..P_38 are the rounded register totals, P_39..P_62 settle the month
export function declaration(reg: Register, options: MonthOptions): Declaration {
    const p: Declaration = {};
    for (const f of SALE_FIELDS) {
        const total = sum(reg.sales, f);
        if (total) p[f.replace('K_', 'P_')] = whole(total);
    }
    const v = (k: string) => p[k] ?? 0;
    p.P_37 = v('P_10') + v('P_11') + v('P_13') + v('P_15') + v('P_17') + v('P_19') + v('P_21') + v('P_22') + v('P_27') + v('P_29');
    p.P_38 = v('P_16') + v('P_18') + v('P_20') + v('P_28') + v('P_30');
    if (options.carried) p.P_39 = options.carried;
    const net = sum(reg.purchases, 'K_42'), tax = sum(reg.purchases, 'K_43');
    if (net || tax) { p.P_42 = whole(net); p.P_43 = whole(tax); }
    p.P_48 = v('P_39') + v('P_43');
    p.P_51 = Math.max(p.P_38 - p.P_48, 0);
    const surplus = Math.max(p.P_48 - p.P_38, 0);
    if (surplus) {
        p.P_53 = surplus;
        const refund = options.refund?.amount ?? 0;
        if (refund > surplus) throw new Error(`${reg.month}: zwrot ${refund} większy niż nadwyżka ${surplus}`);
        if (refund) { p.P_54 = refund; p[options.refund!.term] = 1; }
        p.P_62 = surplus - refund;
    } else if (options.refund?.amount) {
        throw new Error(`${reg.month}: zwrot bez nadwyżki podatku naliczonego`);
    }
    const bad = reg.sales.filter((r) => r.badDebt);
    if (bad.length) {
        p.P_68 = whole(bad.reduce((s, r) => s + (r.k.K_19 ?? 0) + (r.k.K_17 ?? 0) + (r.k.K_15 ?? 0), 0));
        p.P_69 = whole(bad.reduce((s, r) => s + (r.k.K_20 ?? 0) + (r.k.K_18 ?? 0) + (r.k.K_16 ?? 0), 0));
    }
    return p;
}

// the order of the fields in the schema
const P_ORDER = ['P_10', 'P_11', 'P_12', 'P_13', 'P_15', 'P_16', 'P_17', 'P_18', 'P_19', 'P_20', 'P_21', 'P_22', 'P_27', 'P_28',
    'P_29', 'P_30', 'P_37', 'P_38', 'P_39', 'P_42', 'P_43', 'P_48', 'P_51', 'P_53', 'P_54', 'P_540', 'P_55', 'P_56', 'P_560',
    'P_58', 'P_62', 'P_68', 'P_69'];

const SCHEMA = {
    2: {ns: 'http://crd.gov.pl/wzor/2021/12/27/11148/', etd: 'http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2021/06/08/eD/DefinicjeTypy/',
        vat7: 'VAT-7 (22)', variant: 22},
    3: {ns: 'http://crd.gov.pl/wzor/2025/12/19/14090/', etd: 'http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/09/13/eD/DefinicjeTypy/',
        vat7: 'VAT-7 (23)', variant: 23},
} as const;

export const schemaOf = (period: string): 2 | 3 => (period >= '2026-02' ? 3 : 2);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function jpkXml(company: JpkCompany, reg: Register, p: Declaration, options: MonthOptions & { createdAt: string; system?: string }): string {
    const ver = schemaOf(reg.month);
    const s = SCHEMA[ver];
    const [y, m] = reg.month.split('-').map(Number);
    const el = (name: string, value: string | number | undefined) => (value === undefined ? '' : `<tns:${name}>${typeof value === 'string' ? esc(value) : value}</tns:${name}>`);
    const ksef = (nr?: string) => (ver === 3 ? (nr ? el('NrKSeF', nr) : el('BFK', 1)) : '');
    const sales = reg.sales.map((r, i) => '<tns:SprzedazWiersz>' + el('LpSprzedazy', i + 1) + el('KodKrajuNadaniaTIN', r.country)
        + el('NrKontrahenta', r.tin) + el('NazwaKontrahenta', r.name) + el('DowodSprzedazy', r.number)
        + el('DataWystawienia', r.issueDate) + el('DataSprzedazy', r.saleDate) + ksef(r.ksef)
        + (r.badDebt ? el('KorektaPodstawyOpodt', 1) + el('TerminPlatnosci', r.badDebt.deadline) : '')
        + SALE_FIELDS.filter((f) => r.k[f] !== undefined).map((f) => el(f, zl(r.k[f]!))).join('') + '</tns:SprzedazWiersz>').join('');
    const buys = reg.purchases.map((r, i) => '<tns:ZakupWiersz>' + el('LpZakupu', i + 1) + el('KodKrajuNadaniaTIN', r.country)
        + el('NrDostawcy', r.tin) + el('NazwaDostawcy', r.name) + el('DowodZakupu', r.number) + el('DataZakupu', r.date)
        + ksef() + el('K_42', zl(r.k.K_42 ?? 0)) + el('K_43', zl(r.k.K_43 ?? 0)) + '</tns:ZakupWiersz>').join('');
    const outputTax = reg.sales.reduce((t, r) => t + OUTPUT_TAX.reduce((x, f) => x + (r.k[f] ?? 0), 0), 0);
    return `<?xml version="1.0" encoding="UTF-8"?>
<tns:JPK xmlns:tns="${s.ns}" xmlns:etd="${s.etd}">
<tns:Naglowek><tns:KodFormularza kodSystemowy="JPK_V7M (${ver})" wersjaSchemy="1-0E">JPK_VAT</tns:KodFormularza>`
        + el('WariantFormularza', ver) + el('DataWytworzeniaJPK', options.createdAt) + el('NazwaSystemu', options.system ?? 'openinvoice')
        + `<tns:CelZlozenia poz="P_7">${options.purpose}</tns:CelZlozenia>` + el('KodUrzedu', company.taxOfficeCode)
        + el('Rok', y) + el('Miesiac', m) + `</tns:Naglowek>
<tns:Podmiot1 rola="Podatnik"><tns:OsobaNiefizyczna>${el('NIP', company.nip)}${el('PelnaNazwa', company.name)}${el('Email', company.email)}</tns:OsobaNiefizyczna></tns:Podmiot1>
<tns:Deklaracja><tns:Naglowek><tns:KodFormularzaDekl kodSystemowy="${s.vat7}" kodPodatku="VAT" rodzajZobowiazania="Z" wersjaSchemy="1-0E">VAT-7</tns:KodFormularzaDekl>`
        + el('WariantFormularzaDekl', s.variant) + '</tns:Naglowek><tns:PozycjeSzczegolowe>'
        + P_ORDER.filter((k) => p[k] !== undefined).map((k) => el(k, p[k])).join('')
        + `</tns:PozycjeSzczegolowe><tns:Pouczenia>1</tns:Pouczenia></tns:Deklaracja>
<tns:Ewidencja>${sales}<tns:SprzedazCtrl>${el('LiczbaWierszySprzedazy', reg.sales.length)}${el('PodatekNalezny', zl(outputTax))}</tns:SprzedazCtrl>`
        + `${buys}<tns:ZakupCtrl>${el('LiczbaWierszyZakupow', reg.purchases.length)}${el('PodatekNaliczony', zl(sum(reg.purchases, 'K_43')))}</tns:ZakupCtrl></tns:Ewidencja>
</tns:JPK>
`;
}

export interface MonthResult {
    month: string;
    register: Register;
    declaration: Declaration;
    xml: string;
}

const nextMonth = (period: string) => {
    const [y, m] = period.split('-').map(Number);
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

// consecutive months: each month carries the surplus (P_62) of the month before
export function jpkSeries(input: JpkInput, from: string, to: string, options: {
    carriedIn: number;
    purpose: (period: string) => 1 | 2;
    refunds?: Record<string, MonthOptions['refund']>;
    createdAt: string;
}): MonthResult[] {
    const out: MonthResult[] = [];
    let carried = options.carriedIn;
    for (let period = from; period <= to; period = nextMonth(period)) {
        const reg = register(input, period);
        const monthOptions: MonthOptions = {purpose: options.purpose(period), carried, refund: options.refunds?.[period]};
        const p = declaration(reg, monthOptions);
        out.push({month: period, register: reg, declaration: p, xml: jpkXml(input.company, reg, p, {...monthOptions, createdAt: options.createdAt})});
        carried = p.P_62 ?? 0;
    }
    return out;
}
