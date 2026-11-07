import {describe, expect, it} from "vitest";
import {declaration, JpkCost, JpkInput, JpkInvoice, jpkSeries, jpkXml, register, registerMonth, schemaOf} from "./jpk";

const company = {nip: '1111111111', name: 'Firma Testowa sp. z o.o.', email: 'biuro@example.com', taxOfficeCode: '1471'};
const rates: Record<string, Record<string, number>> = {USD: {'2024-03-28': 4.0, '2024-04-29': 4.1}, EUR: {'2024-03-28': 4.3}};
const rate = (currency: string, date: string) => {
    const days = Object.keys(rates[currency] ?? {}).filter((d) => d < date).sort();
    return days.length ? rates[currency][days[days.length - 1]] : undefined;
};
const cost = (c: Partial<JpkCost>): JpkCost => ({number: 'K/1', supplierName: 'Dostawca', supplierTin: '2222222222', supplierCountry: 'PL',
    issueDate: '2024-03-10', currency: 'PLN', net: 100, vat: 23, reverseCharge: false, ...c});
const invoice = (i: Partial<JpkInvoice>): JpkInvoice => ({number: '1/03/2024', issueDate: '2024-03-31', saleDate: '2024-03-31',
    deadlineDate: '2024-04-14', currency: 'PLN', client: {name: 'Klient sp. z o.o.', tin: '333-333-33-33', country: 'PL'},
    lines: [{rate: 'VAT_23', net: 1000, vat: 230}], ...i});
const input = (costs: JpkCost[], invoices: JpkInvoice[] = []): JpkInput => ({company, costs, invoices, rate});

describe('register', () => {
    it('puts a service bought abroad on both sides, in the month it was done, at the NBP rate of the day before', () => {
        const hosting = cost({number: 'H-1', supplierName: 'Hosting Inc.', supplierTin: '', supplierCountry: 'US', issueDate: '2024-04-01',
            saleDate: '2024-03-31', currency: 'USD', net: 50, vat: 0, reverseCharge: true});
        const cloud = cost({number: 'X-1', supplierName: 'Cloud GmbH', supplierTin: 'DE123', supplierCountry: 'DE', issueDate: '2024-04-02',
            saleDate: '2024-03-31', currency: 'EUR', net: 10, vat: 0, reverseCharge: true});
        expect(registerMonth(hosting)).toBe('2024-03');
        const reg = register(input([hosting, cloud]), '2024-03');
        // 50 USD x 4.0 (28.03, the last rate before 31.03) = 200.00, VAT 46.00; the EU supplier goes to K_29/K_30
        expect(reg.sales.map((r) => r.k)).toEqual([{K_27: 20000, K_28: 4600}, {K_29: 4300, K_30: 989}]);
        expect(reg.purchases.map((r) => [r.country, r.tin, r.k])).toEqual([['US', 'BRAK', {K_42: 20000, K_43: 4600}],
            ['DE', 'DE123', {K_42: 4300, K_43: 989}]]);
        expect(register(input([hosting]), '2024-04').sales).toEqual([]);
    });

    it('deducts Polish VAT in the month of the invoice, or in the month set on the document, never "none"', () => {
        expect(registerMonth(cost({}))).toBe('2024-03');
        expect(registerMonth(cost({vatPeriod: '2024-05'}))).toBe('2024-05');
        expect(registerMonth(cost({vatPeriod: 'none'}))).toBeUndefined();
        expect(registerMonth(cost({vat: 0}))).toBeUndefined();
        expect(registerMonth(cost({supplierCountry: 'IE', vat: 5}))).toBeUndefined(); // foreign VAT is not deducted here
    });

    it('takes the VAT of an unpaid invoice back (art. 89a) and adds it when the debtor pays', () => {
        const inv = invoice({badDebtPeriod: '2024-06', badDebtPaidPeriod: '2024-09'});
        const off = register(input([], [inv]), '2024-06').sales;
        expect(off).toEqual([expect.objectContaining({number: '1/03/2024', badDebt: {deadline: '2024-04-14'}, k: {K_19: -100000, K_20: -23000}})]);
        expect(register(input([], [inv]), '2024-09').sales[0].k).toEqual({K_19: 100000, K_20: 23000});
        const p = declaration(register(input([], [inv]), '2024-06'), {purpose: 1, carried: 0});
        expect(p).toMatchObject({P_19: -1000, P_20: -230, P_38: -230, P_68: -1000, P_69: -230, P_53: 230, P_62: 230});
    });
});

describe('declaration', () => {
    it('rounds the register totals, not the rows, and carries the surplus', () => {
        const small = [1, 2, 3].map((n) => cost({number: `P/${n}`, net: 0.4, vat: 0.4}));
        const reg = register(input(small, [invoice({lines: [{rate: 'VAT_23', net: 10.4, vat: 2.39}]})]), '2024-03');
        const p = declaration(reg, {purpose: 1, carried: 50});
        expect(p).toMatchObject({P_19: 10, P_20: 2, P_37: 10, P_38: 2, P_39: 50, P_42: 1, P_43: 1, P_48: 51, P_51: 0, P_53: 49, P_62: 49});
    });

    it('pays the excess of output VAT and asks for a refund of the surplus', () => {
        const reg = register(input([cost({})], [invoice({})]), '2024-03');
        expect(declaration(reg, {purpose: 1, carried: 0})).toMatchObject({P_38: 230, P_48: 23, P_51: 207});
        const refund = declaration(register(input([cost({vat: 300, net: 1300})]), '2024-03'),
            {purpose: 2, carried: 100, refund: {amount: 400, term: 'P_58'}});
        expect(refund).toMatchObject({P_48: 400, P_53: 400, P_54: 400, P_58: 1, P_62: 0});
        expect(() => declaration(register(input([cost({})]), '2024-03'), {purpose: 1, carried: 0, refund: {amount: 24, term: 'P_58'}}))
            .toThrow(/zwrot/);
    });
});

describe('jpkXml', () => {
    it('writes JPK_V7M(2) until 01.2026 and JPK_V7M(3) with KSeF numbers or BFK after', () => {
        expect(schemaOf('2026-01')).toBe(2);
        expect(schemaOf('2026-02')).toBe(3);
        const reg = register(input([cost({})], [invoice({})]), '2024-03');
        const xml = jpkXml(company, reg, declaration(reg, {purpose: 2, carried: 0}), {purpose: 2, carried: 0, createdAt: '2024-04-20T10:00:00'});
        expect(xml).toContain('kodSystemowy="JPK_V7M (2)"');
        expect(xml).toContain('<tns:CelZlozenia poz="P_7">2</tns:CelZlozenia>');
        expect(xml).toContain('<tns:NrKontrahenta>3333333333</tns:NrKontrahenta>');
        expect(xml).toMatch(/<tns:P_37>1000<\/tns:P_37><tns:P_38>230<\/tns:P_38><tns:P_42>100<\/tns:P_42><tns:P_43>23<\/tns:P_43><tns:P_48>23<\/tns:P_48><tns:P_51>207</);
        expect(xml).toContain('<tns:PodatekNalezny>230.00</tns:PodatekNalezny>');
        expect(xml).not.toContain('BFK');

        const later = input([cost({issueDate: '2026-02-10'})], [invoice({issueDate: '2026-03-02', saleDate: '2026-02-28', ksefNumber: '1111111111-20260302-ABC'})]);
        const reg3 = register(later, '2026-02');
        const xml3 = jpkXml(company, reg3, declaration(reg3, {purpose: 1, carried: 0}), {purpose: 1, carried: 0, createdAt: '2026-03-20T10:00:00'});
        expect(xml3).toContain('kodSystemowy="JPK_V7M (3)"');
        expect(xml3).toContain('<tns:DataSprzedazy>2026-02-28</tns:DataSprzedazy><tns:NrKSeF>1111111111-20260302-ABC</tns:NrKSeF>');
        expect(xml3).toContain('<tns:DataZakupu>2026-02-10</tns:DataZakupu><tns:BFK>1</tns:BFK>');
    });
});

describe('jpkSeries', () => {
    it('carries each month\'s P_62 into the next month\'s P_39', () => {
        const months = jpkSeries(input([cost({}), cost({number: 'K/2', issueDate: '2024-05-03', vat: 10, net: 50})]), '2024-03', '2024-05',
            {carriedIn: 7, purpose: () => 2, createdAt: '2024-06-01T10:00:00'});
        expect(months.map((m) => [m.month, m.declaration.P_39, m.declaration.P_62])).toEqual([
            ['2024-03', 7, 30], ['2024-04', 30, 30], ['2024-05', 30, 40]]);
    });
});
