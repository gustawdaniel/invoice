import axios from 'axios';
import 'dotenv/config';

const BASE_URL = 'https://ksef-test.mf.gov.pl/api/v2';

const endpoints = [
    { method: 'POST', path: '/auth/token' },
    { method: 'PUT', path: '/auth/token' },
    { method: 'GET', path: '/auth/token' }, // Just to see if it works
    { method: 'POST', path: '/online/Session/InitToken' },
    { method: 'POST', path: '/Session/InitToken' },
    { method: 'POST', path: '/auth/init' },
    { method: 'POST', path: '/online/Session/InitToken', contentType: 'application/xml' }
];

async function probe() {
    console.log(`Probing Base URL: ${BASE_URL}`);

    for (const ep of endpoints) {
        const url = `${BASE_URL}${ep.path}`;
        const config = {
            method: ep.method,
            url: url,
            headers: {
                'Content-Type': ep.contentType || 'application/json',
                'Accept': 'application/json'
            },
            data: ep.contentType === 'application/xml' ? '<xml></xml>' : {},
            validateStatus: () => true // Don't throw on error
        };

        try {
            const res = await axios(config);
            console.log(`[${ep.method}] ${ep.path} (${ep.contentType || 'json'}) -> ${res.status} ${res.statusText}`);
            if (res.status !== 404 && res.status !== 405) {
                console.log('   Response:', JSON.stringify(res.data).substring(0, 200));
            }
        } catch (err: any) {
            console.error(`[${ep.method}] ${ep.path} -> ERROR: ${err.message}`);
        }
    }
}

probe();
