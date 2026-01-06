import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';

export class KsefClient {
    private api: AxiosInstance;
    private token: string | undefined;

    constructor() {
        this.api = axios.create({
            baseURL: config.KSEF_API_URL,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });
        this.token = config.KSEF_TOKEN;
    }

    /**
     * Init SessionToken based on AuthorisationToken (Simplified 'Test' flow)
     * Real production flow involves Challenge-Response with digital signature.
     */
    async initSession(): Promise<string> {
        if (!this.token) {
            throw new Error('KSEF_TOKEN is not configured');
        }

        // Note: This is a simplified placeholder.
        // The actual KSeF auth flow is:
        // 1. GET /online/Session/AuthorisationChallenge
        // 2. Sign the challenge
        // 3. POST /online/Session/InitToken

        // For the purpose of this task (integration PoC), we assume the user provides a valid SessionToken 
        // or we implement the simpler "Token" auth if available in test env, 
        // BUT KSeF V2 strictly requires the Challenge-Response even for tokens.

        // Let's implement the structure for the Challenge call at least.
        try {
            // 1. Get Challenge
            const challengeRes = await this.api.post('/online/Session/AuthorisationChallenge', {
                contextIdentifier: {
                    type: 'onip', // or 'nip' depending on issuer type
                    identifier: 'YOUR_NIP' // Needs to come from Company config
                }
            });

            // ... We would need to Sign this challenge ...

            // Since we cannot easily sign in Node without the user's private key file which we don't have yet,
            // We will throw an error describing what is needed.
            // OR: If the user provided a usable Session Token in env, we return it.

            return this.token;
        } catch (error) {
            console.error('KSeF Init Session Error', error);
            throw new Error('Failed to initialize KSeF session');
        }
    }

    /**
     * Send Invoice XML
     */
    async sendInvoice(xml: string): Promise<string> {
        // Mock implementation until Session is valid
        console.log('Would send XML to KSeF:', xml.substring(0, 100) + '...');

        // 1. Init Session (Get Token)
        // const sessionToken = await this.initSession();

        // 2. PUT /online/Invoice/Send
        /*
        const res = await this.api.put('/online/Invoice/Send', xml, {
            headers: {
                'SessionToken': sessionToken,
                'Content-Type': 'application/octet-stream'
            }
        });
        return res.data.elementReferenceNumber;
        */

        return 'MOCK-KSEF-REF-12345';
    }
}
