import type {clients, companies, invoices, PaymentForm, Unit, VatRate} from '@prisma/client';
import {buildFakturaXml, type FakturaInput} from 'ksef-client-ts';

type InvoiceWithRelations = invoices & { company: companies; client: clients };

// P_12 code and the P_13_x / P_14_x bucket used for the totals of each rate
const VAT_RATES: Partial<Record<VatRate, { code: string; net: string; vat?: string }>> = {
    VAT_23: {code: '23', net: 'P_13_1', vat: 'P_14_1'},
    VAT_8: {code: '8', net: 'P_13_2', vat: 'P_14_2'},
    VAT_5: {code: '5', net: 'P_13_3', vat: 'P_14_3'},
    VAT_0: {code: '0 KR', net: 'P_13_6_1'},
    VAT_0_WDT: {code: '0 WDT', net: 'P_13_6_2'},
    VAT_0_EXP: {code: '0 EX', net: 'P_13_6_3'},
    VAT_zw: {code: 'zw', net: 'P_13_7'},
    VAT_exempt: {code: 'zw', net: 'P_13_7'},
    VAT_np: {code: 'np I', net: 'P_13_8'},
    VAT_npEU: {code: 'np II', net: 'P_13_9'},
    VAT_oo: {code: 'oo', net: 'P_13_10'},
};

const UNITS: Record<Unit, string> = {
    piece: 'szt.', service: 'usł.', hour: 'godz.', pack: 'opak.', box: 'karton', palette: 'paleta',
    t: 't', kg: 'kg', m2: 'm2', m3: 'm3', km: 'km', mb: 'mb', l: 'l', mh: 'rbh',
};

// FA(3) FormaPlatnosci: 1 gotówka, 2 karta, 4 czek, 6 przelew
const PAYMENT_FORMS: Partial<Record<PaymentForm, number>> = {
    cash: 1, card: 2, check: 4, prepaid: 6, d14: 6, d7: 6,
};

const COUNTRY_CODES: Record<string, string> = {
    poland: 'PL', polska: 'PL', georgia: 'GE', germany: 'DE', 'united kingdom': 'GB', 'united states': 'US',
};

const amount = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

function countryCode(country: string): string {
    if (/^[A-Z]{2}$/.test(country)) return country;
    const code = COUNTRY_CODES[country.trim().toLowerCase()];
    if (!code) throw new Error(`Unknown country "${country}" of the client, use a 2-letter ISO code`);
    return code;
}

// "ul. Grzybowska 85A/32, 00-844 Warszawa" -> ["ul. Grzybowska 85A/32", "00-844 Warszawa"]
export function splitAddress(address: string): [string, string | undefined] {
    const [line1, ...rest] = address.split(/\n|,/).map(p => p.trim()).filter(Boolean);
    if (!line1) throw new Error('Company address is empty');
    return [line1, rest.length ? rest.join(', ') : undefined];
}

// Account number from free text like "PLN mBank (22 1140 2004 0000 3502 7991 1652)"
export function extractAccountNumber(text: string): string | undefined {
    const compact = text.replace(/[\s-]/g, '');
    return compact.match(/[A-Z]{2}\d{2}[A-Z0-9]{10,30}|\d{26}/)?.[0];
}

export function buildFa3(invoice: InvoiceWithRelations, now = new Date()): string {
    const {company, client} = invoice;
    if (invoice.currency !== 'PLN') {
        throw new Error(`KSeF invoices in ${invoice.currency} are not supported yet, only PLN`);
    }

    const buckets = new Map<string, { net: number; vat: number; vatField?: string }>();
    let gross = 0;
    let exempt = false;

    const rows = invoice.items.map((item, index) => {
        const rate = VAT_RATES[item.vat.name];
        if (!rate) throw new Error(`VAT rate ${item.vat.name} is not valid in Poland`);
        if (rate.code === 'zw') exempt = true;

        const net = item.priceNet * item.quantity;
        const vat = rate.vat ? net * item.vat.value : 0;
        const bucket = buckets.get(rate.net) ?? {net: 0, vat: 0, vatField: rate.vat};
        bucket.net += net;
        bucket.vat += vat;
        buckets.set(rate.net, bucket);
        gross += net + vat;

        return {
            NrWierszaFa: index + 1,
            P_7: item.name,
            P_8A: UNITS[item.unit as Unit] ?? item.unit,
            P_8B: String(item.quantity),
            P_9A: amount(item.priceNet),
            P_11: amount(net),
            P_12: rate.code,
        };
    });

    if (exempt && !company.vatExemptionBasis) {
        throw new Error('Invoice has VAT exempt items, set the VAT exemption basis in company settings');
    }

    const totals: Record<string, string> = {};
    for (const [netField, bucket] of buckets) {
        totals[netField] = amount(bucket.net);
        if (bucket.vatField) totals[bucket.vatField] = amount(bucket.vat);
    }

    const [sellerL1, sellerL2] = splitAddress(company.address);
    const clientCountry = countryCode(client.country);
    const clientTin = client.tin.replace(/[^0-9A-Za-z]/g, '');

    const paidInFull = invoice.paid >= Math.round(gross * 100) / 100 && invoice.paymentDate;
    const paymentForm = PAYMENT_FORMS[invoice.paymentForm];
    const account = extractAccountNumber(invoice.bankAccountNumber);

    const faktura: FakturaInput = {
        Naglowek: {
            KodFormularza: {systemCode: 'FA (3)', schemaVersion: '1-0E', value: 'FA'},
            WariantFormularza: 3,
            DataWytworzeniaFa: now.toISOString().replace(/\.\d+Z$/, 'Z'),
            SystemInfo: 'openinvoice',
        },
        Podmiot1: {
            DaneIdentyfikacyjne: {NIP: company.tin.replace(/\D/g, ''), Nazwa: company.name},
            Adres: {KodKraju: 'PL', AdresL1: sellerL1, ...(sellerL2 ? {AdresL2: sellerL2} : {})},
        },
        Podmiot2: {
            DaneIdentyfikacyjne: clientCountry === 'PL'
                ? {NIP: clientTin, Nazwa: client.name}
                : {KodKraju: clientCountry, NrID: clientTin, Nazwa: client.name},
            Adres: {KodKraju: clientCountry, AdresL1: client.street, AdresL2: `${client.post} ${client.city}`.trim()},
            JST: 2,
            GV: 2,
        },
        Fa: {
            KodWaluty: 'PLN',
            P_1: invoice.issueDate,
            P_2: invoice.number,
            ...(invoice.saleDate && invoice.saleDate !== invoice.issueDate ? {P_6: invoice.saleDate} : {}),
            ...totals,
            P_15: amount(gross),
            Adnotacje: {
                P_16: 2, P_17: 2, P_18: 2, P_18A: 2,
                Zwolnienie: exempt ? {P_19: 1, P_19A: company.vatExemptionBasis} : {P_19N: 1},
                NoweSrodkiTransportu: {P_22N: 1},
                P_23: 2,
                PMarzy: {P_PMarzyN: 1},
            },
            RodzajFaktury: 'VAT',
            FaWiersz: rows,
            Platnosc: {
                ...(paidInFull
                    ? {Zaplacono: 1, DataZaplaty: invoice.paymentDate}
                    : {TerminPlatnosci: {Termin: invoice.deadlineDate}}),
                ...(paymentForm
                    ? {FormaPlatnosci: paymentForm}
                    : {PlatnoscInna: 1, OpisPlatnosci: invoice.paymentForm}),
                ...(account ? {RachunekBankowy: {NrRB: account}} : {}),
            },
        },
    };

    return buildFakturaXml(faktura);
}
