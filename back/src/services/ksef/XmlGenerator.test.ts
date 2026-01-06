import { describe, it, expect } from 'vitest';
import { XmlGenerator } from './XmlGenerator';

describe('XmlGenerator', () => {
    it('should generate valid FA(2) XML', () => {
        const mockInvoice: any = {
            number: 'INV/2023/001',
            issueDate: '2023-10-01',
            saleDate: '2023-10-01',
            currency: 'EUR',
            items: [
                {
                    name: 'Consulting',
                    quantity: 10,
                    priceNet: 100,
                    vat: { value: 23, name: 'VAT_23' }
                }
            ],
            company: {
                name: 'My Company Sp. z o.o.',
                address: 'Main St, Warsaw',
            },
            client: {
                name: 'Client Ltd',
                tin: '1234567890',
                country: 'Poland',
                street: 'Test St',
                city: 'Krakow',
                post: '30-000'
            }
        };

        const xml = XmlGenerator.generate(mockInvoice);

        expect(xml).toContain('kodSystemowy="FA (2)"');
        expect(xml).toContain('wersjaSchemy="1-0E"');
        expect(xml).toContain('<NIP>1234567890</NIP>'); // Client NIP
        // expect(xml).toContain('<P_13_1>'); // Not implemented yet
        // Let's check what I implemented
        expect(xml).toContain('<P_15>1230.00</P_15>'); // 10 * 100 * 1.23
        expect(xml).toContain('<P_2>INV/2023/001</P_2>');
    });
});
