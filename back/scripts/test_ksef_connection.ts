import 'dotenv/config';
import { KsefClient } from '../src/services/ksef/KsefClient';
import { config } from '../src/config';

async function main() {
    console.log('--- KSeF Connection Test ---');
    console.log(`API URL: ${config.KSEF_API_URL}`);

    if (!config.KSEF_TOKEN) {
        console.error('ERROR: KSEF_TOKEN is missing in environment variables (.env).');
        console.error('Please add KSEF_TOKEN="your_test_token_here" to back/.env');
        process.exit(1);
    }

    // You can override this with your company NIP e.g. process.argv[2]
    const nip = process.argv[2] || 'YOUR_NIP';

    console.log(`Testing with NIP: ${nip}`);
    if (nip === 'YOUR_NIP') {
        console.warn('WARNING: Using default placeholder NIP. Pass your real NIP as an argument:');
        console.warn('ts-node scripts/test_ksef_connection.ts 1234567890');
    }

    const client = new KsefClient();

    try {
        console.log('Initializing Session...');
        const token = await client.initSession(nip);

        // Decode JWT for debug
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                console.log('--- Decoded Token Payload ---');
                console.dir(payload, { depth: null });
                console.log('-----------------------------');
            }
        } catch (e) { console.error('Failed to decode token', e); }

        console.log('✅ SUCCESS: Session Initialized!');
        console.log('Session Token:', token);
    } catch (error: any) {
        // If initSession failed, we might want to see if we can at least check permissions with the auth token if possible.
        // But initSession encapsulates the whole flow. 
        // We should probably modify initSession to optionally check permissions or log them.

        // However, for this script, let's rely on the error logging. 
        // We will modify KsefClient to log permissions internally or return them if needed.
        // BETTER APPROACH: Let's modify the script to instantiate client and call methods step-by-step if we want to debug, 
        // BUT `initSession` is the public API.

        // Actually, let's modify KsefClient.ts's initSession to call checkPermissions right before opening session,
        // or just let it fail.

        // Wait, I can't easily modify initSession flow from here without changing KsefClient source again.
        // I'll update KsefClient.ts to include the permission check in the main flow for debugging.

        console.error('❌ FAILURE: Could not connect to KSeF.');
        console.error('Error Message:', error.message);
        if (error.response) {
            console.error('API Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

main();
