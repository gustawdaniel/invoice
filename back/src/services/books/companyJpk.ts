// JPK_V7M of a company from the database: its purchase documents, its issued invoices and the NBP rates they need.
import {prisma} from "../../db";
import {loadNbpRates} from "./nbp";
import {jpkSeries, JpkCompany, MonthOptions, taxPoint} from "./jpk";
import {countryCode} from "../ksef/buildFa3";

const round = (value: number) => Math.round(value * 100) / 100;
// a client whose country name is not known keeps it as written: the XSD check of the file shows it if it matters
const isoCountry = (country: string) => { try { return countryCode(country); } catch { return country; } };

export async function companyJpk(companyId: string, from: string, to: string, options: {
    company: Omit<JpkCompany, 'nip' | 'name'>;
    carriedIn: number;
    purpose: (period: string) => 1 | 2;
    refunds?: Record<string, MonthOptions['refund']>;
    createdAt: string;
}) {
    const company = await prisma.companies.findUniqueOrThrow({where: {id: companyId}});
    const [costs, invoices] = await Promise.all([
        prisma.costs.findMany({where: {companyId}}),
        // issued invoices in the books: live, and either in KSeF or issued outside it (historical)
        prisma.invoices.findMany({where: {companyId, livemode: true, OR: [{outsideKsef: true}, {ksefNumber: {not: null}}]}, include: {client: true}}),
    ]);
    const rate = await loadNbpRates([
        ...costs.map((c) => ({currency: c.currency, date: c.reverseCharge ? taxPoint(c) : c.issueDate})),
        ...invoices.map((i) => ({currency: i.currency, date: i.saleDate || i.issueDate})),
    ]);
    return jpkSeries({
        company: {nip: company.tin.replace(/\D/g, ''), name: company.name, ...options.company},
        costs: costs.map((c) => ({number: c.number, supplierName: c.supplierName, supplierTin: c.supplierTin,
            supplierCountry: c.supplierCountry, issueDate: c.issueDate, saleDate: c.saleDate, currency: c.currency, net: c.net,
            vat: c.vat, reverseCharge: c.reverseCharge, vatPeriod: c.vatPeriod})),
        invoices: invoices.map((i) => ({number: i.number, issueDate: i.issueDate, saleDate: i.saleDate, deadlineDate: i.deadlineDate,
            currency: i.currency, client: {name: i.client.name, tin: i.client.tin, country: isoCountry(i.client.country)},
            lines: i.items.map((item) => {
                const net = round(item.quantity * item.priceNet);
                return {rate: item.vat.name, net, vat: round(net * item.vat.value)};
            }),
            ksefNumber: i.ksefNumber, badDebtPeriod: i.badDebtPeriod, badDebtPaidPeriod: i.badDebtPaidPeriod})),
        rate,
    }, from, to, options);
}
