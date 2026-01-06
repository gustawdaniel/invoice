import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import * as crypto from 'crypto';

interface KsefSessionContext {
    referenceNumber: string;
    token: string;
    aesKey: Buffer;
    iv: Buffer;
}

interface KsefTokenMeta {
    scope: string;
    token: string;
    valid: boolean;
}

interface KsefTokenResponse {
    token: string;
    valid: boolean;
}

export class KsefClient {
    private api: AxiosInstance;
    private context: KsefSessionContext | null = null;
    // Base URL for V2 Test (Updated to new endpoint)
    private baseUrl = 'https://api-test.ksef.mf.gov.pl/v2';

    constructor() {
        this.api = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
    }

    /**
     * Authenticates and opens an interactive session (V2).
     * @param nip - The NIP of the entity (subject).
     * @returns The Session Reference Number.
     */
    async initSession(nip: string): Promise<string> {
        // Clear previous context
        this.context = null;

        try {
            console.log('1. Fetching Public Key...');
            const publicKeyPem = await this.getPublicKey();

            console.log('2. Requesting Authorisation Challenge...');
            const challenge = await this.getChallenge();

            console.log('3. Preparing Encryption keys and Token...');
            // Generate Random AES Key (32 bytes) and IV (16 bytes)
            const aesKey = crypto.randomBytes(32);
            const iv = crypto.randomBytes(16);

            // Handle token format (trim meta if present)
            let rawToken = config.KSEF_TOKEN || '';
            if (rawToken.includes('|')) {
                const parts = rawToken.split('|');
                rawToken = parts[parts.length - 1]; // Assume last part is the token
            }

            // Encrypt Auth Token with Public Key (RSA) - OAEP SHA256 required
            const tokenString = `${rawToken}|${new Date(challenge.timestamp).getTime()}`;
            const encryptedToken = crypto.publicEncrypt({
                key: publicKeyPem,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
            }, Buffer.from(tokenString)).toString('base64');

            console.log('4. Requesting KSeF Auth Token...');
            const authToken = await this.getAuthToken(challenge.challenge, nip, encryptedToken);

            console.log('5. Opening Online Session...');
            const session = await this.openOnlineSession(authToken, aesKey, iv, publicKeyPem);

            this.context = {
                referenceNumber: session.referenceNumber,
                token: authToken,
                aesKey,
                iv,
            };

            // Update axios headers for future requests (if needed)
            // this.api.defaults.headers.common['SessionToken'] = this.context.token; 

            return session.referenceNumber;

        } catch (error: any) {
            console.error('KSeF Session Init Phase Failed:', error.message);
            if (error.response) {
                console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }

    private async getPublicKey(): Promise<string> {
        const res = await this.api.get('/security/public-key-certificates');
        const certs = res.data;
        const certDer = certs[0].certificate;
        return `-----BEGIN CERTIFICATE-----\n${certDer}\n-----END CERTIFICATE-----`;
    }

    private async getChallenge(): Promise<{ challenge: string, timestamp: string }> {
        const res = await this.api.post('/auth/challenge', {});
        return res.data;
    }

    private async getAuthToken(challenge: string, nip: string, encryptedToken: string): Promise<string> {
        const payload = {
            challenge: challenge,
            contextIdentifier: {
                type: 'Nip',
                value: nip
            },
            encryptedToken: encryptedToken
        };

        const res = await this.api.post('/auth/ksef-token', payload);
        // Returns 201/202 with { referenceNumber, authenticationToken: { token: ... } }
        return res.data.authenticationToken.token;
    }

    private async openOnlineSession(authToken: string, aesKey: Buffer, iv: Buffer, publicKeyPem: string): Promise<{ referenceNumber: string, sessionToken: any }> {
        const encryptedKey = crypto.publicEncrypt({
            key: publicKeyPem,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
        }, aesKey).toString('base64');

        const payload = {
            formCode: {
                systemCode: 'FA (3)',
                schemaVersion: '1-0E',
                value: 'FA'
            },
            encryption: {
                encryptedSymmetricKey: encryptedKey,
                initializationVector: iv.toString('base64')
            }
        };

        // Note: openOnlineSession might require Auth Token in header? 
        // Based on previous findings, /sessions/online likely requires authentication.
        // Usually headers: { "SessionToken": authToken } or "Authorization"
        // Let's assume SessionToken header.
        const res = await this.api.post('/sessions/online', payload, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'X-KSeF-Feature': 'upo-v4-3'
            }
        });
        return res.data;
    }

    async checkPermissions(authToken: string, nip: string): Promise<any> {
        // Query for all permissions (empty body for unfiltered)
        // Need to pass pageOffset/pageSize in query params or accept defaults
        // Schema requires non-empty body? OpenAPI says "W przypadku braku podania kryteriów...".
        // Let's try sending just empty contextIdentifier or minimal valid body if needed.
        // Actually, schema shows PersonalPermissionsQueryRequest inside content.

        const payload = {
            contextIdentifier: {
                type: 'Nip',
                value: nip
            }
        };

        // Let's retrieve everything.
        const res = await this.api.post('/permissions/query/personal/grants', payload, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            params: {
                pageSize: 100,
                pageOffset: 0
            }
        });
        return res.data;
    }

    /**
     * Send Invoice XML (Placeholder for now)
     */
    async sendInvoice(xml: string): Promise<any> {
        if (!this.context) throw new Error('Session not initialized');

        // Note: Actual V2 sending requires encrypting the XML with this.context.aesKey + IV
        // For now, validating connection is the goal.
        console.warn('V2 sendInvoice not fully implemented (requires AES encryption). Returning mock success for connection test.');

        return {
            elementReferenceNumber: `FAKE-${Date.now()}`,
            processingCode: 200
        };
    }
}
