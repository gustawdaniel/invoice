// The general ledger of a company, derived from what the books already hold: bank operations (by their kind), purchase
// documents, issued invoices, and journal entries an accountant or agent adds by hand (opening balance, offsets, payroll,
// write-offs, income tax). Everything is computed, nothing is stored twice: change a classification and the ledger,
// the trial balance and the financial statement follow.
import {BILANS_SOURCES, BILANS_TREE, COST_ACCOUNT, isKnownAccount, isResultAccount, RZIS_LINES, RZIS_TREE, synthetic} from "./accounts";

export interface Line {
    account: string;
    debit: number;
    credit: number;
    // a document the line settles, e.g. "cost:<id>" or "invoice:<id>": settlement accounts are kept per document
    ref?: string;
}

export interface Posting {
    date: string;
    source: string; // "bank:<id>", "cost:<id>", "invoice:<id>", "journal:<externalId>"
    description: string;
    lines: Line[];
}

export interface BankInput {
    id: string;
    account: string;
    date: string;
    amount: number;
    currency: string;
    description: string;
    kind: string;
    invoiceId?: string | null;
    costIds: string[];
}

export interface CostInput {
    id: string;
    supplierName: string;
    number: string;
    issueDate: string;
    saleDate?: string | null;
    currency: string;
    net: number;
    vat: number;
    gross: number;
    category: string;
    reverseCharge: boolean;
}

export interface InvoiceInput {
    id: string;
    number: string;
    clientName: string;
    issueDate: string;
    saleDate: string;
    currency: string;
    net: number;
    vat: number;
}

export interface JournalInput {
    externalId: string;
    date: string;
    kind: string; // opening | entry
    description: string;
    lines: Line[];
}

export interface LedgerInput {
    bank: BankInput[];
    costs: CostInput[];
    invoices: InvoiceInput[];
    journal: JournalInput[];
    // average NBP rate (table A) of the last working day before the date; undefined when missing
    rate: (currency: string, date: string) => number | undefined;
    // whether the company deducted VAT on a date (an active VAT taxpayer)
    vatActive: (date: string) => boolean;
}

export interface Warning {
    source: string;
    message: string;
}

const round = (value: number) => Math.round(value * 100) / 100;
const IMPORT_VAT = 0.23;

export function previousDay(date: string): string {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

function dr(account: string, amount: number, ref?: string): Line {
    return amount >= 0 ? {account, debit: round(amount), credit: 0, ref} : {account, debit: 0, credit: round(-amount), ref};
}

function cr(account: string, amount: number, ref?: string): Line {
    return dr(account, -amount, ref);
}

function taxAccount(description: string): string {
    if (/\bVAT\b|JPK/i.test(description)) return '220-VAT';
    if (/\bCIT\b/i.test(description)) return '220-CIT';
    if (/\bPIT\b/i.test(description)) return '220-PIT';
    return '220';
}

// the PLN value of a foreign currency amount at the NBP rate of the day before
function toPln(input: LedgerInput, currency: string, amount: number, date: string, source: string, warnings: Warning[]): number {
    if (currency === 'PLN') return round(amount);
    const rate = input.rate(currency, date);
    if (!rate) {
        warnings.push({source, message: `brak kursu NBP ${currency} przed ${date}`});
        return 0;
    }
    return round(amount * rate);
}

export function buildPostings(input: LedgerInput): { postings: Posting[]; warnings: Warning[] } {
    const warnings: Warning[] = [];
    const postings: Posting[] = [];
    const opening = input.journal.filter((j) => j.kind === 'opening').map((j) => j.date).sort()[0];
    // the books start with the opening balance; source documents before it belong to books kept elsewhere
    const inBooks = (date: string) => !opening || date >= opening;

    const costPln = new Map<string, number>();
    for (const c of input.costs) {
        const date = c.saleDate && c.saleDate < c.issueDate ? c.saleDate : c.issueDate;
        const source = `cost:${c.id}`;
        const gross = toPln(input, c.currency, c.gross, c.issueDate, source, warnings);
        costPln.set(c.id, gross);
        if (!inBooks(c.issueDate)) continue;
        const account = COST_ACCOUNT[c.category] ?? '409';
        const deduct = c.vat > 0 && input.vatActive(date);
        const vat = deduct ? toPln(input, c.currency, c.vat, c.issueDate, source, warnings) : 0;
        const lines = [dr(account, round(gross - vat)), ...(vat ? [dr('220-VAT', vat)] : []), cr('201', gross, source)];
        // import of services outside the VAT register: the company pays the VAT itself (VAT-9M) and cannot deduct it
        if (c.reverseCharge && !input.vatActive(date)) {
            const tax = round(gross * IMPORT_VAT);
            lines.push(dr(account, tax), cr('220-VAT', tax));
        }
        postings.push({date: c.issueDate, source, description: `${c.supplierName} ${c.number}`.trim(), lines});
    }

    const invoicePln = new Map<string, number>();
    for (const inv of input.invoices) {
        const source = `invoice:${inv.id}`;
        const net = toPln(input, inv.currency, inv.net, inv.saleDate || inv.issueDate, source, warnings);
        const vat = toPln(input, inv.currency, inv.vat, inv.saleDate || inv.issueDate, source, warnings);
        invoicePln.set(inv.id, round(net + vat));
        if (!inBooks(inv.issueDate)) continue;
        postings.push({date: inv.issueDate, source, description: `Faktura ${inv.number} ${inv.clientName}`,
            lines: [dr('200', net + vat, source), cr('700', net), ...(vat ? [cr('220-VAT', vat)] : [])]});
    }

    for (const t of input.bank) {
        if (!inBooks(t.date)) continue;
        const source = `bank:${t.id}`;
        const amount = toPln(input, t.currency, t.amount, t.date, source, warnings);
        const bank = `130-${t.account.replace(/\s/g, '').slice(-4)}`;
        const other: Line[] = [];
        switch (t.kind) {
            case 'sale_payment':
                other.push(cr('200', amount, t.invoiceId ? `invoice:${t.invoiceId}` : undefined));
                if (!t.invoiceId) warnings.push({source, message: 'wpłata od klienta bez wskazanej faktury'});
                break;
            case 'cost_payment':
            case 'refund': {
                if (!t.costIds.length) {
                    other.push(cr('201', amount));
                    warnings.push({source, message: t.kind === 'refund' ? 'zwrot bez wskazanego dokumentu' : 'zapłata bez dokumentu kosztowego'});
                    break;
                }
                // one transfer paying several documents: split by their value
                const values = t.costIds.map((id) => Math.abs(costPln.get(id) ?? 0));
                const total = values.reduce((a, b) => a + b, 0) || t.costIds.length;
                let left = amount;
                t.costIds.forEach((id, i) => {
                    const part = i === t.costIds.length - 1 ? left : round(amount * (values[i] || 1) / total);
                    left = round(left - part);
                    other.push(cr('201', part, `cost:${id}`));
                });
                break;
            }
            case 'shareholder_loan':
            case 'shareholder_repayment':
            case 'private':
                other.push(cr('240-WSP', amount));
                break;
            case 'capital':
                other.push(cr('801', amount));
                break;
            case 'interest':
                other.push(cr('750', amount));
                break;
            case 'salary':
                other.push(cr('230', amount));
                break;
            case 'tax':
                other.push(cr(taxAccount(t.description), amount));
                break;
            case 'zus':
                other.push(cr('220-ZUS', amount));
                break;
            case 'bank_fee':
                other.push(cr('403', amount));
                break;
            case 'own_transfer':
                other.push(cr('141', amount));
                break;
            default:
                other.push(cr('249', amount));
                warnings.push({source, message: `operacja niesklasyfikowana (${t.kind})`});
        }
        postings.push({date: t.date, source, description: t.description.slice(0, 120), lines: [dr(bank, amount), ...other]});
    }

    for (const j of input.journal) {
        const source = `journal:${j.externalId}`;
        const unknown = j.lines.filter((l) => !isKnownAccount(l.account));
        if (unknown.length) warnings.push({source, message: `nieznane konta: ${unknown.map((l) => l.account).join(', ')}`});
        const balance = round(j.lines.reduce((s, l) => s + l.debit - l.credit, 0));
        if (balance) warnings.push({source, message: `zapis niezbilansowany o ${balance}`});
        postings.push({date: j.date, source, description: j.description, lines: j.lines.map((l) => ({...l}))});
    }

    // foreign currency documents settled by payments: what is left on the document is an exchange difference
    const byRef = new Map<string, { balance: number; lastDate: string; paid: boolean }>();
    for (const p of postings) {
        for (const l of p.lines) {
            if (!l.ref) continue;
            const r = byRef.get(l.ref) ?? {balance: 0, lastDate: p.date, paid: false};
            r.balance = round(r.balance + l.debit - l.credit);
            if (p.source.startsWith('bank:') || p.source.startsWith('journal:')) r.paid = true;
            if (p.date > r.lastDate) r.lastDate = p.date;
            byRef.set(l.ref, r);
        }
    }
    const foreign = new Set([
        ...input.costs.filter((c) => c.currency !== 'PLN').map((c) => `cost:${c.id}`),
        ...input.invoices.filter((i) => i.currency !== 'PLN').map((i) => `invoice:${i.id}`),
    ]);
    for (const [ref, r] of byRef) {
        if (!r.paid || !r.balance || !foreign.has(ref)) continue;
        const value = Math.abs((ref.startsWith('cost:') ? costPln : invoicePln).get(ref.slice(ref.indexOf(':') + 1)) ?? 0);
        if (Math.abs(r.balance) > 0.15 * value) continue; // a partial payment, not a rate difference
        const account = synthetic(ref.startsWith('cost:') ? '201' : '200');
        // a debit balance left on the settlement means more was paid than booked (cost) or less received (revenue)
        postings.push({date: r.lastDate, source: `fx:${ref}`, description: 'Różnica kursowa',
            lines: r.balance > 0 ? [dr('751', r.balance), cr(account, r.balance, ref)] : [dr(account, -r.balance, ref), cr('750', -r.balance)]});
    }

    postings.sort((a, b) => a.date.localeCompare(b.date) || a.source.localeCompare(b.source));
    return {postings, warnings};
}

export interface TrialRow {
    account: string;
    openingDebit: number;
    openingCredit: number;
    debit: number;
    credit: number;
    closingDebit: number;
    closingCredit: number;
}

function net(debit: number, credit: number): [number, number] {
    const b = round(debit - credit);
    return b >= 0 ? [b, 0] : [0, -b];
}

// zestawienie obrotów i sald for a year: opening balance (with the result of earlier years moved to 820), turnover,
// closing balance, per analytic account; settlement accounts are also kept per document (ref) for the balance sheet
export function trialBalance(postings: Posting[], year: number) {
    const from = `${year}-01-01`, to = `${year}-12-31`;
    const rows = new Map<string, { o: number; d: number; c: number }>();
    const refs = new Map<string, number>(); // "account|ref" → closing balance
    const row = (account: string) => rows.get(account) ?? rows.set(account, {o: 0, d: 0, c: 0}).get(account)!;
    for (const p of postings) {
        if (p.date > to) continue;
        for (const l of p.lines) {
            const before = p.date < from;
            const account = before && isResultAccount(l.account) ? '820' : l.account;
            const r = row(account);
            if (before) r.o = round(r.o + l.debit - l.credit);
            else { r.d = round(r.d + l.debit); r.c = round(r.c + l.credit); }
            const key = `${account}|${l.ref ?? ''}`;
            refs.set(key, round((refs.get(key) ?? 0) + l.debit - l.credit));
        }
    }
    const table: TrialRow[] = [...rows.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([account, r]) => {
        const [openingDebit, openingCredit] = net(r.o, 0);
        const [closingDebit, closingCredit] = net(r.o + r.d - r.c, 0);
        return {account, openingDebit, openingCredit, debit: r.d, credit: r.c, closingDebit, closingCredit};
    });
    return {rows: table, refs};
}

export interface Statement {
    bilans: Record<string, number>;
    rzis: Record<string, number>;
    checks: string[];
}

function sumTree(values: Record<string, number>, tree: Record<string, string[]>, key: string): number {
    if (!(key in tree)) return round(values[key] ?? 0);
    const total = round(tree[key].reduce((s, child) => s + sumTree(values, tree, child), 0));
    values[key] = total;
    return total;
}

// the balance sheet and the profit and loss of a year from the trial balance, in the lines of the MF schema
export function statement(postings: Posting[], year: number): Statement {
    const {rows, refs} = trialBalance(postings, year);
    const rzis: Record<string, number> = {};
    for (const line of RZIS_LINES) {
        rzis[line.key] = round(rows.filter((r) => line.accounts.includes(synthetic(r.account)))
            .reduce((s, r) => s + line.sign * (r.debit - r.credit), 0));
    }
    for (const key of Object.keys(RZIS_TREE)) sumTree(rzis, RZIS_TREE, key);
    rzis.C = round(rzis.A - rzis.B);
    rzis.F = round(rzis.C + rzis.D - rzis.E);
    rzis.I = round(rzis.F + rzis.G - rzis.H);
    rzis.L = round(rzis.I - rzis.J);

    // each analytic balance (and each document on settlement accounts) to the most specific matching line and side
    const bilans: Record<string, number> = {};
    const add = (key: string, value: number) => { bilans[key] = round((bilans[key] ?? 0) + value); };
    const balances = new Map<string, number>();
    for (const [key, value] of refs) {
        const [account] = key.split('|');
        if (isResultAccount(account) || !value) continue;
        const settlement = /^2/.test(synthetic(account));
        const unit = settlement ? key : account;
        balances.set(unit, round((balances.get(unit) ?? 0) + value));
    }
    for (const [unit, value] of balances) {
        if (!value) continue;
        const account = unit.split('|')[0];
        const side = value > 0 ? 'debit' : 'credit';
        const match = BILANS_SOURCES
            .filter((s) => (account === s.account || account.startsWith(`${s.account}-`) || synthetic(account) === s.account)
                && (s.side === 'both' || s.side === side))
            .sort((a, b) => b.account.length - a.account.length)[0];
        if (!match) { add(side === 'debit' ? 'Aktywa_B_II_3_C' : 'Pasywa_B_III_3_I', Math.abs(value)); continue; }
        // assets are debit balances, equity and liabilities credit ones
        add(match.key, match.key.startsWith('Aktywa') ? value : -value);
    }
    bilans.Pasywa_A_VI = rzis.L;
    const assets = sumTree(bilans, BILANS_TREE, 'Aktywa');
    const liabilities = sumTree(bilans, BILANS_TREE, 'Pasywa');
    const checks: string[] = [];
    if (assets !== liabilities) checks.push(`Aktywa ${assets} ≠ Pasywa ${liabilities} (różnica ${round(assets - liabilities)})`);
    const suspense = rows.filter((r) => synthetic(r.account) === '249' && (r.closingDebit || r.closingCredit));
    for (const r of suspense) checks.push(`Konto ${r.account} (do wyjaśnienia) ma saldo ${round(r.closingDebit - r.closingCredit)}`);
    const transit = rows.filter((r) => r.account === '141' && (r.closingDebit || r.closingCredit));
    for (const r of transit) checks.push(`Środki w drodze (141) mają saldo ${round(r.closingDebit - r.closingCredit)}: brak drugiej strony przelewu własnego`);
    return {bilans, rzis, checks};
}
