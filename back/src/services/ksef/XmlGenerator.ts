import { create } from 'xmlbuilder2';
import { invoices, companies, clients, Prisma } from '@prisma/client';

// Define complex types that includes relations
type InvoiceWithRelations = invoices & {
    company: companies;
    client: clients;
};

export class XmlGenerator {
    static generate(invoice: InvoiceWithRelations): string {
        const doc = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('Faktura', {
                'xmlns': 'http://crd.gov.pl/wzor/2023/06/29/12648/',
                'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                'xsi:schemaLocation': 'http://crd.gov.pl/wzor/2023/06/29/12648/ http://crd.gov.pl/wzor/2023/06/29/12648/schemat.xsd'
            });

        // 1. Naglowek (Header)
        const naglowek = doc.ele('Naglowek');
        naglowek.ele('KodFormularza', { kodSystemowy: 'FA (2)', wersjaSchemy: '1-0E' }).txt('FA').up();
        naglowek.ele('WariantFormularza').txt('2').up();
        naglowek.ele('DataWytworzeniaFa').txt(new Date().toISOString().slice(0, 19) + 'Z').up();

        // 2. Podmiot1 (Seller/Issuer)
        // Clean TIN
        const sellerTin = (invoice.company.tin || '').replace(/[^0-9]/g, '');

        const podmiot1 = doc.ele('Podmiot1');
        const daneId1 = podmiot1.ele('DaneIdentyfikacyjne');
        daneId1.ele('NIP').txt(sellerTin).up();
        daneId1.ele('NazwaPelna').txt(invoice.company.name).up();
        daneId1.up();

        const [sellerStreet, sellerCity] = this.parseAddress(invoice.company.address);

        const adres1 = podmiot1.ele('Adres').ele('AdresPol');
        adres1.ele('KodKraju').txt('PL').up();
        adres1.ele('Ulica').txt(sellerStreet).up();
        adres1.ele('NrDomu').txt('1').up(); // Placeholder as usually address string is unstructured
        adres1.ele('Miejscowosc').txt(sellerCity).up();
        adres1.ele('KodPocztowy').txt('00-000').up(); // Placeholder
        adres1.up().up().up();

        // 3. Podmiot2 (Buyer/Client)
        const clientTin = (invoice.client.tin || '').replace(/[^0-9]/g, '');

        const podmiot2 = doc.ele('Podmiot2');
        const daneId2 = podmiot2.ele('DaneIdentyfikacyjne');
        if (clientTin && invoice.client.country === 'Poland') {
            daneId2.ele('NIP').txt(clientTin).up();
        } else {
            // For non-PL entities or no TIN use BrakID if applicable or just Nazwa
            // For simplicity assuming B2B PL context primarily, but fallback to clean NIP
            if (clientTin) daneId2.ele('NrKlienta').txt(clientTin).up();
        }
        daneId2.ele('NazwaPelna').txt(invoice.client.name).up();
        daneId2.up();

        const adres2 = podmiot2.ele('Adres').ele('AdresPol');
        adres2.ele('KodKraju').txt(invoice.client.country === 'Poland' ? 'PL' : 'XX').up();
        adres2.ele('Ulica').txt(invoice.client.street).up();
        adres2.ele('NrDomu').txt('1').up();
        adres2.ele('Miejscowosc').txt(invoice.client.city).up();
        adres2.ele('KodPocztowy').txt(invoice.client.post).up();
        adres2.up().up().up();

        // 4. Fa (Invoice Data)
        const fa = doc.ele('Fa');
        fa.ele('KodWaluty').txt(invoice.currency).up();
        fa.ele('P_1').txt(invoice.issueDate).up(); // Date of issue
        fa.ele('P_2').txt(invoice.number).up(); // Invoice Number
        // P_6: Sale Date
        fa.ele('P_6').txt(invoice.saleDate).up();

        // Aggregation Logic
        const items = invoice.items as any[];

        let totalNet = 0;
        let totalVat = 0;

        const ratesMap = new Map<string, { net: number, vat: number }>();

        items.forEach((item, index) => {
            const net = item.priceNet * item.quantity;
            let vatFn = 0;
            if (item.vat && item.vat.value) {
                vatFn = (net * (item.vat.value / 100));
            }

            totalNet += net;
            totalVat += vatFn;

            // Group by VAT Rate Name
            const rateName = item.vat?.name || 'VAT_23';
            const current = ratesMap.get(rateName) || { net: 0, vat: 0 };
            ratesMap.set(rateName, {
                net: current.net + net,
                vat: current.vat + vatFn
            });

            // Line Item
            const wiersz = fa.ele('FaWiersz');
            wiersz.ele('NrWierszaFa').txt((index + 1).toString()).up();
            wiersz.ele('P_7').txt(item.name).up();
            wiersz.ele('P_8B').txt(item.quantity.toString()).up();
            wiersz.ele('P_9A').txt(item.priceNet.toFixed(2)).up();
            wiersz.ele('P_11').txt(net.toFixed(2)).up();
            wiersz.ele('P_12').txt(this.mapVatRateToCode(rateName)).up();
        });

        const totalGross = totalNet + totalVat;

        // Map Aggregates to Header Fields
        // P_13_x (Net), P_14_x (Vat)
        ratesMap.forEach((vals, rateName) => {
            const netStr = vals.net.toFixed(2);
            const vatStr = vals.vat.toFixed(2);

            switch (rateName) {
                case 'VAT_23':
                    fa.ele('P_13_1').txt(netStr).up();
                    fa.ele('P_14_1').txt(vatStr).up();
                    break;
                case 'VAT_8':
                    fa.ele('P_13_2').txt(netStr).up();
                    fa.ele('P_14_2').txt(vatStr).up();
                    break;
                case 'VAT_5':
                    fa.ele('P_13_3').txt(netStr).up();
                    fa.ele('P_14_3').txt(vatStr).up();
                    break;
                case 'VAT_zw':
                    fa.ele('P_13_6').txt(netStr).up(); // zw is often mapped to 13_6 or 13_7 depends on type, assuming zw here
                    // zw has no P_14
                    break;
                // Add others as needed
            }
        });

        // P_15 Total Gross
        fa.ele('P_15').txt(totalGross.toFixed(2)).up();

        return doc.end({ prettyPrint: true });
    }

    private static parseAddress(fullAddress: string): [string, string] {
        if (!fullAddress) return ['Unknown', 'Unknown'];
        const parts = fullAddress.split(',');
        return [parts[0]?.trim() || 'Unknown', parts[1]?.trim() || 'Unknown'];
    }

    private static mapVatRateToCode(internalRate: string): string {
        switch (internalRate) {
            case 'VAT_23': return '23';
            case 'VAT_8': return '8';
            case 'VAT_5': return '5';
            case 'VAT_zw': return 'zw';
            default: return '23';
        }
    }
}
