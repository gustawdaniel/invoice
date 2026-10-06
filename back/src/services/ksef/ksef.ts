import type {companies, KsefEnv} from '@prisma/client';
import {
    authenticateWithCertificate,
    authenticateWithToken,
    buildUnsignedAuthTokenRequestXml,
    CertificateService,
    isValidNip,
    KSeFClient,
    openOnlineSession,
    pollUntil,
    sha256Base64,
    type SessionInvoiceStatusResponse,
} from 'ksef-client-ts';
import {decryptKsefToken} from './tokenCrypto';

export function ksefClient(env: KsefEnv): KSeFClient {
    return new KSeFClient({environment: env === 'prod' ? 'PROD' : 'TEST'});
}

export function companyNip(company: companies): string {
    const nip = company.tin.replace(/\D/g, '');
    if (!isValidNip(nip)) throw new Error(`Company NIP "${company.tin}" is not a valid Polish NIP`);
    return nip;
}

function requireKsef(company: companies): { env: KsefEnv; token: string } {
    if (company.country !== 'PL') throw new Error('KSeF is available only for Polish companies');
    if (!company.ksefEnv) throw new Error('KSeF environment is not selected for this company');
    if (!company.ksefTokenEnc) throw new Error('KSeF is not connected for this company');
    return {env: company.ksefEnv, token: decryptKsefToken(company.ksefTokenEnc)};
}

export interface SentInvoice {
    status: SessionInvoiceStatusResponse;
    qrUrl: string;
}

export async function sendInvoiceToKsef(company: companies, xml: string, issueDate: string): Promise<SentInvoice> {
    const {env, token} = requireKsef(company);
    const nip = companyNip(company);
    const client = ksefClient(env);

    await authenticateWithToken(client, {nip, token});
    const session = await openOnlineSession(client, {});
    try {
        const invoiceRef = await session.sendInvoice(xml);
        const status = await session.waitForInvoice(invoiceRef);
        const qrUrl = client.qr.buildInvoiceVerificationUrl(nip, issueDate, sha256Base64(Buffer.from(xml, 'utf8')));
        return {status, qrUrl};
    } finally {
        await session.close();
    }
}

const TOKEN_PERMISSIONS = ['InvoiceRead', 'InvoiceWrite'] as const;

async function generateToken(client: KSeFClient, description: string): Promise<string> {
    const result = await client.tokens.generateToken({description, permissions: [...TOKEN_PERMISSIONS]});
    // a new token is usable only after KSeF activates it
    await pollUntil(
        () => client.tokens.getToken(result.referenceNumber),
        (t) => t.status !== 'Pending',
        {description: `KSeF token ${result.referenceNumber} activation`},
    );
    return result.token;
}

// TEST environment accepts self-signed certificates, so we can get a token without any signature
export async function connectTestEnvironment(company: companies): Promise<string> {
    const nip = companyNip(company);
    const client = ksefClient('test');
    const seal = await CertificateService.generateCompanySeal(company.name, `VATPL-${nip}`, company.name);
    await authenticateWithCertificate(client, {nip, certPem: seal.certificatePem, keyPem: seal.privateKeyPem});
    return generateToken(client, 'openinvoice (test)');
}

// PROD step 1: XML to be signed by the user (e.g. Profil Zaufany on podpis.gov.pl).
// The challenge is embedded in the XML and valid for 10 minutes.
export async function createProdAuthRequest(company: companies): Promise<string> {
    const nip = companyNip(company);
    const client = ksefClient('prod');
    const challenge = await client.auth.getChallenge();
    return buildUnsignedAuthTokenRequestXml({
        challenge: challenge.challenge,
        contextIdentifier: {type: 'Nip', value: nip},
        subjectIdentifierType: 'certificateSubject',
    });
}

// PROD step 2: authenticate with the signed XML and exchange it for a long-lived KSeF token
export async function connectProdEnvironment(signedXml: string): Promise<string> {
    const client = ksefClient('prod');
    const init = await client.auth.submitXadesAuthRequest(signedXml);
    const authToken = init.authenticationToken.token;
    const status = await pollUntil(
        () => client.auth.getAuthStatus(init.referenceNumber, authToken),
        (s) => s.status.code !== 100,
        {description: 'KSeF authentication', maxAttempts: 90},
    );
    if (status.status.code !== 200) {
        const details = status.status.details?.join('; ') ?? '';
        throw new Error(`KSeF authentication failed: ${status.status.code} ${status.status.description} ${details}`.trim());
    }
    const tokens = await client.auth.getAccessToken(authToken);
    client.authManager.setAccessToken(tokens.accessToken.token);
    client.authManager.setRefreshToken(tokens.refreshToken.token);
    return generateToken(client, 'openinvoice');
}
