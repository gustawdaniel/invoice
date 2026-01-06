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
        // Adjust fields based on company model. Assuming NIP (TIN) is available.
        const podmiot1 = doc.ele('Podmiot1');
        const daneId1 = podmiot1.ele('DaneIdentyfikacyjne');
        daneId1.ele('NIP').txt('REPLACE_WITH_COMPANY_NIP').up(); // TODO: Add NIP to company model or config
        daneId1.ele('NazwaPelna').txt(invoice.company.name).up();
        daneId1.up();

        const adres1 = podmiot1.ele('Adres').ele('AdresPol');
        adres1.ele('KodKraju').txt('PL').up();
        adres1.ele('Ulica').txt(invoice.company.address.split(',')[0]?.trim() || 'Unknown').up(); // Simplified parsing
        adres1.ele('NrDomu').txt('1').up(); // Placeholder
        adres1.ele('Miejscowosc').txt(invoice.company.address.split(',')[1]?.trim() || 'Unknown').up();
        adres1.ele('KodPocztowy').txt('00-000').up(); // Placeholder
        adres1.up().up().up();

        // 3. Podmiot2 (Buyer/Client)
        const podmiot2 = doc.ele('Podmiot2');
        const daneId2 = podmiot2.ele('DaneIdentyfikacyjne');
        daneId2.ele('NIP').txt(invoice.client.tin).up();
        daneId2.ele('NazwaPelna').txt(invoice.client.name).up();
        daneId2.up();

        const adres2 = podmiot2.ele('Adres').ele('AdresPol');
        adres2.ele('KodKraju').txt(invoice.client.country === 'Poland' ? 'PL' : 'XX').up();
        adres2.ele('Ulica').txt(invoice.client.street).up();
        adres2.ele('NrDomu').txt('1').up(); // Placeholder if not in DB
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

        // Calculate Totals per rate
        // Simplified Logic: Assessing all items.
        // In reality, this needs summing up net/vat per rate (P_13_x, P_14_x)
        // For now, let's assume one rate or basic structure

        let totalNet = 0;
        let totalVat = 0;
        let totalGross = 0;

        // Invoice Items (FaWiersz)
        const items = invoice.items as any[]; // Type assertion if generic Json

        items.forEach((item, index) => {
            const net = item.priceNet * item.quantity;
            const vatFn = (net * (item.vat.value / 100)); // Simplified calc

            totalNet += net;
            totalVat += vatFn;

            const wiersz = fa.ele('FaWiersz');
            wiersz.ele('NrWierszaFa').txt((index + 1).toString()).up();
            wiersz.ele('P_7').txt(item.name).up();
            wiersz.ele('P_8B').txt(item.quantity.toString()).up();
            wiersz.ele('P_9A').txt(item.priceNet.toFixed(2)).up(); // Unit Net Price
            wiersz.ele('P_11').txt(net.toFixed(2)).up(); // Total Net for line
            // P_12: VAT Rate. Convert internal enum to KSeF code (e.g. 23)
            wiersz.ele('P_12').txt(mapVatRate(item.vat.name)).up();
        });

        totalGross = totalNet + totalVat;

        // P_13_1, P_14_1 for 23% etc. 
        // Important: KSeF requires filling specific fields for specific rates.
        // Using P_15 (Total Gross)
        fa.ele('P_15').txt(totalGross.toFixed(2)).up();

        return doc.end({ prettyPrint: true });
    }
}

function mapVatRate(internalRate: string): string {
    // Map internal enum to FA(2) codes
    switch (internalRate) {
        case 'VAT_23': return '23';
        case 'VAT_8': return '8';
        case 'VAT_5': return '5';
        case 'VAT_zw': return 'zw';
        default: return '23'; // Default to 23
    }
}
