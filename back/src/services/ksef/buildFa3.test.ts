import {describe, expect, it} from 'vitest';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {buildFa3, extractAccountNumber, splitAddress} from './buildFa3';

const hasXmllint = spawnSync('xmllint', ['--version']).status === 0;
// official FA(3) XSD shipped with ksef-client-ts
const FA3_XSD = join(dirname(require.resolve('ksef-client-ts')), '..', 'docs', 'schemas', 'FA', 'schemat_FA(3)_v1-0E.xsd');

function xsdErrors(xml: string): string {
    const file = join(mkdtempSync(join(tmpdir(), 'fa3-')), 'invoice.xml');
    writeFileSync(file, xml);
    try {
        execFileSync('xmllint', ['--noout', '--schema', FA3_XSD, file], {stdio: 'pipe'});
        return '';
    } catch (error: any) {
        return String(error.stderr);
    }
}

function invoice(overrides: Record<string, unknown> = {}): any {
    return {
        number: '0001/10/2026',
        issueDate: '2026-10-06',
        saleDate: '2026-10-06',
        deadlineDate: '2026-10-20',
        currency: 'PLN',
        paymentForm: 'd14',
        paid: 0,
        paymentDate: null,
        bankAccountNumber: 'mBank 22 1140 2004 0000 3502 7991 1652',
        items: [{
            name: 'Wykonanie modułu integracji feedów produktowych',
            unit: 'service',
            quantity: 1,
            priceNet: 3000,
            vat: {name: 'VAT_zw', value: 0},
        }],
        company: {
            name: 'PRECISE LAB SP. Z O.O.',
            tin: '5272923603',
            address: 'ul. Grzybowska 85A/32, 00-844 Warszawa',
            country: 'PL',
            vatExemptionBasis: 'Art. 113 ust. 1 ustawy o VAT',
        },
        client: {
            name: 'PATRONAD SP. Z O.O.',
            tin: '1133022863',
            street: 'ul. Londyńska 25',
            post: '03-921',
            city: 'Warszawa',
            country: 'Poland',
        },
        ...overrides,
    };
}

describe('buildFa3', () => {
    it('builds an exempt invoice with the exemption basis', () => {
        const xml = buildFa3(invoice(), new Date('2026-10-06T10:00:00Z'));
        expect(xml).toContain('<P_13_7>3000.00</P_13_7>');
        expect(xml).toContain('<P_15>3000.00</P_15>');
        expect(xml).toContain('<P_12>zw</P_12>');
        expect(xml).toContain('<P_19A>Art. 113 ust. 1 ustawy o VAT</P_19A>');
        expect(xml).toContain('<NrRB>22114020040000350279911652</NrRB>');
        expect(xml).toContain('<P_8A>usł.</P_8A>');
        expect(xml).not.toContain('<P_6>');
    });

    it.skipIf(!hasXmllint)('exempt invoice passes FA(3) XSD', () => {
        expect(xsdErrors(buildFa3(invoice()))).toBe('');
    });

    it.skipIf(!hasXmllint)('23% invoice with different sale date passes FA(3) XSD', () => {
        const xml = buildFa3(invoice({
            saleDate: '2026-09-30',
            items: [
                {name: 'Programowanie', unit: 'hour', quantity: 10, priceNet: 150, vat: {name: 'VAT_23', value: 0.23}},
                {name: 'Licencja', unit: 'piece', quantity: 1, priceNet: 99.99, vat: {name: 'VAT_23', value: 0.23}},
            ],
        }));
        expect(xml).toContain('<P_13_1>1599.99</P_13_1>');
        expect(xml).toContain('<P_14_1>368.00</P_14_1>');
        expect(xml).toContain('<P_15>1967.99</P_15>');
        expect(xml).toContain('<P_6>2026-09-30</P_6>');
        expect(xml).toContain('<P_19N>1</P_19N>');
        expect(xsdErrors(xml)).toBe('');
    });

    it('requires the exemption basis for exempt items', () => {
        const inv = invoice();
        inv.company.vatExemptionBasis = '';
        expect(() => buildFa3(inv)).toThrow(/exemption basis/);
    });

    it('rejects non-Polish VAT rates and currencies', () => {
        expect(() => buildFa3(invoice({items: [{name: 'x', unit: 'hour', quantity: 1, priceNet: 1, vat: {name: 'VAT_18', value: 0.18}}]})))
            .toThrow(/not valid in Poland/);
        expect(() => buildFa3(invoice({currency: 'EUR'}))).toThrow(/only PLN/);
    });
});

describe('helpers', () => {
    it('splits company address', () => {
        expect(splitAddress('ul. Grzybowska 85A/32, 00-844 Warszawa')).toEqual(['ul. Grzybowska 85A/32', '00-844 Warszawa']);
        expect(splitAddress('ul. Testowa 1')).toEqual(['ul. Testowa 1', undefined]);
    });

    it('extracts account numbers from free text', () => {
        expect(extractAccountNumber('PLN Millennium (90 1160 2202 0000 0002 2859 6562)')).toBe('90116022020000000228596562');
        expect(extractAccountNumber('IBAN: GE29 NB00 0000 0101 9049 17')).toBe('GE29NB0000000101904917');
        expect(extractAccountNumber('cash only')).toBeUndefined();
    });
});
