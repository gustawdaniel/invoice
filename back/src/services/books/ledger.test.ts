import {describe, expect, it} from "vitest";
import {buildPostings, LedgerInput, previousDay, statement, trialBalance} from "./ledger";

const base = (over: Partial<LedgerInput>): LedgerInput => ({
    bank: [], costs: [], invoices: [], journal: [],
    rate: (currency) => ({USD: 4, EUR: 4.5} as Record<string, number>)[currency],
    vatActive: () => true,
    ...over,
});

const opening = {
    externalId: 'opening:2022', date: '2022-01-01', kind: 'opening', description: 'Bilans otwarcia',
    lines: [
        {account: '130-1652', debit: 1000, credit: 0},
        {account: '200', debit: 500, credit: 0, ref: 'invoice:old'},
        {account: '801', debit: 0, credit: 1000},
        {account: '820', debit: 0, credit: 500},
    ],
};

describe('ledger', () => {
    it('books a PLN cost and its payment, and the balance sheet balances', () => {
        const {postings, warnings} = buildPostings(base({
            journal: [opening],
            costs: [{id: 'c1', supplierName: 'Biuro', number: '1/2022', issueDate: '2022-02-01', currency: 'PLN',
                net: 100, vat: 23, gross: 123, category: 'accounting', reverseCharge: false}],
            bank: [{id: 'b1', account: '22 1140 2004 0000 3502 7991 1652', date: '2022-02-05', amount: -123, currency: 'PLN',
                description: 'Biuro FV 1/2022', kind: 'cost_payment', costIds: ['c1']}],
        }));
        expect(warnings).toEqual([]);
        const s = statement(postings, 2022);
        expect(s.rzis.B_III).toBe(100);
        expect(s.rzis.L).toBe(-100);
        expect(s.bilans.Aktywa_B_III_1_C_1).toBe(877);
        expect(s.bilans.Aktywa_B_II_3_B).toBe(23); // VAT to deduct
        expect(s.bilans.Aktywa).toBe(s.bilans.Pasywa);
        expect(s.checks).toEqual([]);
    });

    it('turns what is left on a foreign currency document into an exchange difference', () => {
        const {postings} = buildPostings(base({
            journal: [opening],
            costs: [{id: 'c1', supplierName: 'DigitalOcean', number: '9', issueDate: '2022-03-01', currency: 'USD',
                net: 100, vat: 0, gross: 100, category: 'hosting', reverseCharge: true}],
            bank: [{id: 'b1', account: '1652', date: '2022-03-03', amount: -410, currency: 'PLN', description: 'DIGITALOCEAN',
                kind: 'cost_payment', costIds: ['c1']}],
        }));
        const s = statement(postings, 2022);
        expect(s.rzis.B_III).toBe(400);
        expect(s.rzis.H_IV).toBe(10);
        expect(s.bilans.Pasywa_B_III_3_D_1 ?? 0).toBe(0);
    });

    it('keeps a shareholder loan as a liability and money taken by the shareholder as a receivable', () => {
        const {postings} = buildPostings(base({
            journal: [opening],
            bank: [
                {id: 'b1', account: '1652', date: '2022-04-01', amount: 2000, currency: 'PLN', description: 'pożyczka', kind: 'shareholder_loan', costIds: []},
                {id: 'b2', account: '1652', date: '2022-06-29', amount: -2500, currency: 'PLN', description: 'wypłata', kind: 'private', costIds: []},
            ],
        }));
        const s = statement(postings, 2022);
        expect(s.bilans.Aktywa_B_II_3_C).toBe(500);
        expect(s.bilans.Pasywa_B_III_3_A ?? 0).toBe(0);
        expect(s.bilans.Aktywa).toBe(s.bilans.Pasywa);
    });

    it('moves the result of earlier years to 820 in the opening balance', () => {
        const {postings} = buildPostings(base({
            journal: [opening],
            invoices: [{id: 'i1', number: '1/2022', clientName: 'Klient', issueDate: '2022-05-01', saleDate: '2022-05-01',
                currency: 'PLN', net: 1000, vat: 230}],
        }));
        const rows = trialBalance(postings, 2023).rows;
        expect(rows.find((r) => r.account === '820')?.openingCredit).toBe(1500);
        expect(statement(postings, 2022).rzis.A).toBe(1000);
        expect(statement(postings, 2023).bilans.Pasywa_A_V).toBe(1500);
    });

    it('ignores source documents before the opening balance and pays VAT on imported services outside the register', () => {
        const {postings} = buildPostings(base({
            journal: [opening],
            vatActive: (date) => date < '2026-04-01',
            costs: [
                {id: 'old', supplierName: 'X', number: '1', issueDate: '2021-12-01', currency: 'PLN', net: 50, vat: 0, gross: 50, category: 'other', reverseCharge: false},
                {id: 'c2', supplierName: 'DigitalOcean', number: '2', issueDate: '2026-05-01', currency: 'USD', net: 10, vat: 0, gross: 10, category: 'hosting', reverseCharge: true},
            ],
        }));
        expect(postings.some((p) => p.source === 'cost:old')).toBe(false);
        const s = statement(postings, 2026);
        expect(s.rzis.B_III).toBe(49.2); // 40 + 23% VAT
        expect(s.bilans.Pasywa_B_III_3_G).toBe(9.2);
    });

    it('shows the opening balance as the opening of its year', () => {
        const {postings} = buildPostings(base({journal: [opening]}));
        const bank = trialBalance(postings, 2022).rows.find((r) => r.account === '130-1652')!;
        expect([bank.openingDebit, bank.debit, bank.closingDebit]).toEqual([1000, 0, 1000]);
    });

    it('finds the day before', () => {
        expect(previousDay('2024-03-01')).toBe('2024-02-29');
    });
});
