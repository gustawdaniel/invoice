// One-off backfill for the multi-company + KSeF schema. Safe to run many times.
// Prisma defaults apply only on create, so documents created before the change must get the new required fields.
// Usage: tsx scripts/migrate_multi_company.ts            (dry run)
//        tsx scripts/migrate_multi_company.ts --apply
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const backfills = [
    {collection: 'companies', field: 'country', value: 'GE'},
    {collection: 'companies', field: 'vatExemptionBasis', value: ''},
    {collection: 'users', field: 'companyIds', value: []},
];

async function main() {
    for (const {collection, field, value} of backfills) {
        const filter = {[field]: {$exists: false}};
        const count = await prisma.$runCommandRaw({count: collection, query: filter}) as { n: number };
        console.log(`${collection}.${field}: ${count.n} documents to backfill with ${JSON.stringify(value)}`);
        if (apply && count.n > 0) {
            const result = await prisma.$runCommandRaw({
                update: collection,
                updates: [{q: filter, u: {$set: {[field]: value}}, multi: true}],
            }) as { nModified: number };
            console.log(`  updated ${result.nModified}`);
        }
    }
    if (!apply) console.log('Dry run, pass --apply to write.');
}

main().finally(() => prisma.$disconnect());
