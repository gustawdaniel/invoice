import {prisma} from "../db";

// One KSeF mode per company -> Stripe like live/test mode. Idempotent, runs on every start and does nothing once done:
// - invoices without `livemode`: false if sent to KSeF TEST or made in a company that was in test mode, else true
// - companies in the old test mode lose their KSeF TEST token (test mode now uses DEMO, which needs its own token);
//   the token of companies in production mode stays as their production token
export async function migrateKsefModes(): Promise<void> {
    const testCompanies = await prisma.companies.findMany({where: {ksefEnv: 'test'}, select: {id: true}});
    const testCompanyIds = testCompanies.map(company => ({$oid: company.id}));

    const toTest = await prisma.$runCommandRaw({
        update: 'invoices',
        updates: [{
            q: {livemode: {$exists: false}, $or: [{ksefEnv: 'test'}, {companyId: {$in: testCompanyIds}}]},
            u: {$set: {livemode: false}},
            multi: true,
        }],
    });
    const toLive = await prisma.$runCommandRaw({
        update: 'invoices',
        updates: [{q: {livemode: {$exists: false}}, u: {$set: {livemode: true}}, multi: true}],
    });
    const testReset = await prisma.companies.updateMany({where: {ksefEnv: 'test'}, data: {ksefEnv: null, ksefTokenEnc: null}});
    const prodKept = await prisma.companies.updateMany({where: {ksefEnv: 'prod'}, data: {ksefEnv: null}});

    const changed = Number(toTest.nModified ?? 0) + Number(toLive.nModified ?? 0) + testReset.count + prodKept.count;
    if (changed) {
        console.info(`ksef modes migration: invoices test=${toTest.nModified} live=${toLive.nModified}, `
            + `companies test mode reset=${testReset.count}, production kept=${prodKept.count}`);
    }
}
