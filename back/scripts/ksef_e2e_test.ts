// End-to-end check of multi-company + KSeF TEST flow through the HTTP API.
// Needs a running backend on a LOCAL database (never production) - it creates a throwaway user.
// Usage: API_URL=http://localhost:5055 tsx scripts/ksef_e2e_test.ts
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {tokenizeUser} from '../src/helpers/tokenize';

const API = process.env.API_URL ?? 'http://localhost:5055';
if (!/localhost|127\.0\.0\.1/.test(process.env.MONGO_URI ?? '')) {
    throw new Error('Refusing to run: MONGO_URI must point to a local database');
}

const prisma = new PrismaClient();

function randomNip(): string {
    const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    for (;;) {
        const d = Array.from({length: 9}, (_, i) => (i === 0 ? 1 : 0) + Math.floor(Math.random() * (i === 0 ? 9 : 10)));
        const c = d.reduce((s, x, i) => s + x * w[i], 0) % 11;
        if (c !== 10) return d.join('') + c;
    }
}

async function main() {
    const geCompany = await prisma.companies.create({data: {name: 'Georgian LLC (e2e)'}});
    const user = await prisma.users.create({
        data: {
            email: `e2e-${randomBytes(4).toString('hex')}@example.invalid`,
            full_name: 'E2E', avatar: '', roles: ['user'],
            company: {connect: {id: geCompany.id}},
        },
    });
    const token = tokenizeUser(user);

    async function call(method: string, path: string, body?: unknown, companyId?: string) {
        const res = await fetch(`${API}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(body ? {'Content-Type': 'application/json'} : {}),
                ...(companyId ? {'x-company-id': companyId} : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        let data: any = text;
        try { data = JSON.parse(text); } catch { /* xml or empty */ }
        return {status: res.status, data};
    }

    // default company is the Georgian one
    let r = await call('GET', '/company');
    assert.equal(r.status, 200);
    assert.equal(r.data.country, 'GE');

    // add a Polish company in KSeF test mode
    r = await call('POST', '/companies', {name: 'Test Sp. z o.o.', country: 'PL'});
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const pl = r.data.id as string;

    r = await call('PUT', '/company', {
        tin: randomNip(),
        address: 'ul. Testowa 1/2, 00-001 Warszawa',
        ksefEnv: 'test',
        vatExemptionBasis: 'Art. 113 ust. 1 ustawy o VAT',
    }, pl);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.ksefConnected, false);
    assert.equal(r.data.ksefTokenEnc, undefined);

    r = await call('GET', '/companies');
    assert.deepEqual(r.data.map((c: any) => c.country), ['GE', 'PL']);

    // foreign company id is rejected
    r = await call('GET', '/company', undefined, '000000000000000000000000');
    assert.equal(r.status, 403);

    console.log('connecting KSeF TEST...');
    r = await call('POST', '/company/ksef/test-connect', undefined, pl);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.ksefConnected, true);

    r = await call('POST', '/clients', {
        name: 'Nabywca Testowy Sp. z o.o.', street: 'ul. Próbna 3', post: '00-002', city: 'Warszawa',
        tin: randomNip(), country: 'Poland',
    }, pl);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const clientId = r.data.id;

    const today = new Date().toISOString().slice(0, 10);
    r = await call('POST', '/invoices', {
        number: `0001/${today.slice(5, 7)}/${today.slice(0, 4)}`,
        clientId, issueDate: today, saleDate: today, deadlineDate: today,
        issuePlace: '', currency: 'PLN', lang: 'pl', paymentForm: '14d',
        items: [{name: 'Usługa testowa', priceNet: 3000, quantity: 1, unit: 'service', vat: {name: 'zw.', value: 0}}],
        issuerName: '', bankAccountNumber: '22 1140 2004 0000 3502 7991 1652', publicNote: '', privateNote: '',
    }, pl);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const invoiceId = r.data.id;

    // invoices are scoped per company
    r = await call('GET', '/invoices');
    assert.equal(r.data.length, 0);

    console.log('sending invoice to KSeF TEST...');
    r = await call('POST', `/invoices/${invoiceId}/ksef`, undefined, pl);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.match(r.data.ksefNumber, /^\d{10}-\d{8}-[0-9A-F]{12}-[0-9A-F]{2}$/);
    assert.match(r.data.ksefQrUrl, /^https:\/\/qr-test\.ksef\.mf\.gov\.pl\/invoice\//);
    console.log('KSeF number:', r.data.ksefNumber);

    // accepted invoices are immutable
    r = await call('POST', `/invoices/${invoiceId}/ksef`, undefined, pl);
    assert.equal(r.status, 409);
    r = await call('DELETE', `/invoices/${invoiceId}`, undefined, pl);
    assert.equal(r.status, 409);

    // the Georgian company cannot touch the Polish invoice
    r = await call('POST', `/invoices/${invoiceId}/ksef`);
    assert.equal(r.status, 404);

    console.log('OK');
}

main().finally(() => prisma.$disconnect());
