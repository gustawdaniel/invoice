import axios, { AxiosInstance } from 'axios';
import * as nodeCrypto from 'crypto';
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

    async initSession(identifier: string = 'YOUR_NIP'): Promise<string> {
        if (!this.token) {
            throw new Error('KSEF_TOKEN is not configured');
        }

        try {
            // 1. Get Challenge
            const challengeRes = await this.api.post('/online/Session/AuthorisationChallenge', {
                contextIdentifier: {
                    type: 'onip',
                    identifier: identifier
                }
            });

            const timestamp = challengeRes.data.timestamp;
            const challenge = challengeRes.data.challenge;

            // 2. Encrypt Token
            // Format: token|timestamp
            const message = `${this.token}|${timestamp}`;
            const publicKeysRes = await axios.get('https://api-demo.ksef.mf.gov.pl/v2/security/public-key-certificates');
            // Assuming first key is valid for now, in prod should parse validFrom/To
            const publicKeyPem = publicKeysRes.data.publicKeyCertificateList[0].publicKey.pem;

            const encryptedToken = nodeCrypto.publicEncrypt({
                key: publicKeyPem,
                padding: nodeCrypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
            }, Buffer.from(message)).toString('base64');

            // 3. Init Token Session
            const initTokenXml = `<?xml version="1.0" encoding="UTF-8"?>
<ns3:InitSessionTokenRequest xmlns:ns3="http://ksef.mf.gov.pl/schema/gtw/svc/online/auth/request/2021/10/01/0001" xmlns="http://ksef.mf.gov.pl/schema/gtw/svc/online/types/2021/10/01/0001" xmlns:ns2="http://ksef.mf.gov.pl/schema/gtw/svc/types/2021/10/01/0001">
    <ns3:Context>
        <Challenge>${challenge}</Challenge>
        <Identifier xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="ns2:SubjectIdentifierByCompanyType">
            <ns2:Identifier>${identifier}</ns2:Identifier>
        </Identifier>
        <DocumentType>
            <Service>KSeF</Service>
            <FormCode>
                <SystemCode>FA (2)</SystemCode>
                <SchemaVersion>1-0E</SchemaVersion>
                <TargetNamespace>http://crd.gov.pl/wzor/2023/06/29/12648/</TargetNamespace>
                <Value>FA</Value>
            </FormCode>
        </DocumentType>
        <Token>${encryptedToken}</Token>
    </ns3:Context>
</ns3:InitSessionTokenRequest>`;

            const sessionRes = await this.api.post('/online/Session/InitToken', initTokenXml, {
                headers: { 'Content-Type': 'application/xml' }
            });

            return sessionRes.data.sessionToken.token;

        } catch (error: any) {
            console.error('KSeF Init Session Error', error.response?.data || error.message);
            throw new Error(`Failed to initialize KSeF session: ${JSON.stringify(error.response?.data)}`);
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
