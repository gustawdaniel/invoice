// Checks the signature based KSeF connection (the one used for PROD with Profil Zaufany)
// on KSeF TEST, signing the request with a self-signed seal instead of a real signature,
// then sends an invoice with the obtained token. Uses fake NIPs only.
// Usage: KSEF_SECRET_KEY=... tsx scripts/ksef_signed_flow_test.ts
import assert from 'node:assert/strict';
import {CertificateService, SignatureService} from 'ksef-client-ts';
import type {companies} from '@prisma/client';
import {connectWithSignedRequest, createAuthRequest, sendInvoiceToKsef} from '../src/services/ksef/ksef';
import {buildFa3} from '../src/services/ksef/buildFa3';
import {encryptKsefToken} from '../src/services/ksef/tokenCrypto';

function randomNip(): string {
    const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    for (;;) {
        const d = Array.from({length: 9}, (_, i) => (i === 0 ? 1 : 0) + Math.floor(Math.random() * (i === 0 ? 9 : 10)));
        const c = d.reduce((s, x, i) => s + x * w[i], 0) % 11;
        if (c !== 10) return d.join('') + c;
    }
}

async function main() {
    const nip = randomNip();
    const company = {
        id: 'test', name: 'Signed Flow Test Sp. z o.o.', tin: nip, address: 'ul. Testowa 1, 00-001 Warszawa',
        info: '', logo: '', signature: '', country: 'PL', ksefEnv: 'test', ksefTokenEnc: null,
        vatExemptionBasis: 'Art. 113 ust. 1 ustawy o VAT', createdAt: new Date(), updatedAt: new Date(),
    } as companies;

    const unsigned = await createAuthRequest(company, 'test');
    assert.match(unsigned, /<AuthTokenRequest/);
    assert.ok(unsigned.includes(`<Nip>${nip}</Nip>`));

    // stands in for the user signing the file with Profil Zaufany
    const seal = await CertificateService.generateCompanySeal(company.name, `VATPL-${nip}`, company.name);
    const signed = SignatureService.sign(unsigned, seal.certificatePem, seal.privateKeyPem);

    console.log('connecting with signed request...');
    const token = await connectWithSignedRequest('test', signed);
    assert.ok(token.length > 20);

    console.log('sending invoice with the obtained token...');
    company.ksefTokenEnc = encryptKsefToken(token);
    const today = new Date().toISOString().slice(0, 10);
    const xml = buildFa3({
        number: `0001/${today.slice(5, 7)}/${today.slice(0, 4)}`, issueDate: today, saleDate: today, deadlineDate: today,
        currency: 'PLN', paymentForm: 'd14', paid: 0, paymentDate: null, bankAccountNumber: '22 1140 2004 0000 3502 7991 1652',
        items: [{name: 'Usługa', unit: 'service', quantity: 1, priceNet: 100, vat: {name: 'VAT_zw', value: 0}}],
        company,
        client: {name: 'Nabywca', tin: randomNip(), street: 'ul. Próbna 3', post: '00-002', city: 'Warszawa', country: 'Poland'},
    } as any);
    const {status, qrUrl} = await sendInvoiceToKsef(company, xml, today);
    assert.equal(status.status.code, 200);
    console.log('KSeF number:', status.ksefNumber, qrUrl);
    console.log('OK');
}

main();
