// The ledger of one company from the database: loads its books, the NBP rates they need, and computes the year.
import {prisma} from "../../db";
import {buildPostings, statement, trialBalance} from "./ledger";
import {loadNbpRates} from "./nbp";
import {accountName} from "./accounts";

const round = (value: number) => Math.round(value * 100) / 100;

export async function companyLedger(companyId: string) {
    const company = await prisma.companies.findUniqueOrThrow({where: {id: companyId}});
    const [bank, costs, invoices, journal] = await Promise.all([
        prisma.bankTransactions.findMany({where: {companyId}}),
        prisma.costs.findMany({where: {companyId}}),
        // issued invoices: live, and either in KSeF or issued outside it (historical); drafts are not in the books
        prisma.invoices.findMany({where: {companyId, livemode: true, OR: [{outsideKsef: true}, {ksefNumber: {not: null}}]}, include: {client: true}}),
        prisma.journalEntries.findMany({where: {companyId}}),
    ]);
    const rate = await loadNbpRates([
        ...bank.map((t) => ({currency: t.currency, date: t.date})),
        ...costs.map((c) => ({currency: c.currency, date: c.issueDate})),
        ...invoices.map((i) => ({currency: i.currency, date: i.saleDate || i.issueDate})),
    ]);
    const vatActive = (date: string) => company.vatActiveTo ? date <= company.vatActiveTo : !company.vatExemptionBasis;
    return buildPostings({
        bank: bank.map((t) => ({id: t.id, account: t.account, date: t.date, amount: t.amount, currency: t.currency,
            description: t.description, kind: t.kind, invoiceId: t.invoiceId, costIds: t.costIds})),
        costs: costs.map((c) => ({id: c.id, supplierName: c.supplierName, number: c.number, issueDate: c.issueDate,
            saleDate: c.saleDate, currency: c.currency, net: c.net, vat: c.vat, gross: c.gross, category: c.category,
            reverseCharge: c.reverseCharge})),
        invoices: invoices.map((i) => {
            const lines = i.items.map((item) => {
                const net = round(item.quantity * item.priceNet);
                return {net, vat: round(net * item.vat.value)};
            });
            return {id: i.id, number: i.number, clientName: i.client.name, issueDate: i.issueDate, saleDate: i.saleDate,
                currency: i.currency, net: round(lines.reduce((s, l) => s + l.net, 0)), vat: round(lines.reduce((s, l) => s + l.vat, 0))};
        }),
        journal: journal.map((j) => ({externalId: j.externalId, date: j.date, kind: j.kind, description: j.description,
            lines: j.lines.map((l) => ({account: l.account, debit: l.debit, credit: l.credit, ref: l.ref ?? undefined}))})),
        rate,
        vatActive,
    });
}

export async function companyBooks(companyId: string, year: number) {
    const {postings, warnings} = await companyLedger(companyId);
    const {rows} = trialBalance(postings, year);
    return {
        year,
        trialBalance: rows.map((r) => ({...r, name: accountName(r.account)})),
        statement: statement(postings, year),
        warnings: warnings.filter((w) => {
            const p = postings.find((x) => x.source === w.source);
            return !p || p.date.startsWith(String(year));
        }),
    };
}
