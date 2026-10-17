// Stores a KSeF token from env on the company with the token's NIP, after checking it logs in.
//
//   KSEF_TOKEN='<reference>|nip-<NIP>|<secret>' [KSEF_ENV=prod|test] [KSEF_COMPANY_ID=...] \
//     infisical run --env=prod --path=/back -- tsx scripts/ksef_import_token.ts
//
// Needs the same env as the backend (MONGO_URI, KSEF_SECRET_KEY, ...). Production tokens come from
// https://ap.ksef.mf.gov.pl/web/tokens/generate-token, test tokens from https://ap-test.ksef.mf.gov.pl.
import type {KsefEnv} from '@prisma/client';
import {prisma} from '../src/db';
import {verifyUserToken} from '../src/services/ksef/ksef';
import {encryptKsefToken} from '../src/services/ksef/tokenCrypto';

async function main() {
    const token = process.env.KSEF_TOKEN?.trim();
    if (!token) throw new Error('Set KSEF_TOKEN');
    const env = (process.env.KSEF_ENV ?? 'prod') as KsefEnv;
    if (env !== 'prod' && env !== 'test') throw new Error('KSEF_ENV must be "prod" or "test"');

    const tokenNip = token.match(/\|nip-(\d{10})\|/)?.[1];
    if (!tokenNip) throw new Error('KSEF_TOKEN does not look like a KSeF token');

    const candidates = (await prisma.companies.findMany({where: {country: 'PL'}}))
        .filter(c => c.tin.replace(/\D/g, '') === tokenNip)
        .filter(c => !process.env.KSEF_COMPANY_ID || c.id === process.env.KSEF_COMPANY_ID);
    if (candidates.length === 0) throw new Error(`No Polish company with NIP ${tokenNip}`);
    if (candidates.length > 1) {
        const list = candidates.map(c => `${c.id} ${c.name}`).join('\n  ');
        throw new Error(`Several companies have NIP ${tokenNip}, pick one with KSEF_COMPANY_ID:\n  ${list}`);
    }
    const company = candidates[0];

    console.log(`Checking the token against KSeF ${env} for ${company.name} (NIP ${tokenNip})...`);
    const verified = await verifyUserToken(company, env, token);
    await prisma.companies.update({
        where: {id: company.id},
        data: {ksefEnv: env, ksefTokenEnc: encryptKsefToken(verified)},
    });
    console.log(`Done: ${company.name} is connected to KSeF ${env}. You can now remove KSEF_TOKEN from env.`);
}

main()
    .catch((e) => {
        console.error(e instanceof Error ? e.message : e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
