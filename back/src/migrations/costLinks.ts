import {prisma} from "../db";

// A bank operation used to point at one cost (`costId`); now it lists them (`costIds`), so one transfer can pay several
// documents and a document can be paid in parts. Idempotent, runs on every start and does nothing once done.
export async function migrateCostLinks(): Promise<void> {
    const moved = await prisma.$runCommandRaw({
        update: 'bankTransactions',
        updates: [{
            q: {costId: {$exists: true}},
            u: [
                {$set: {costIds: {$cond: [{$eq: [{$ifNull: ['$costId', null]}, null]}, [], ['$costId']]}}},
                {$unset: 'costId'},
            ],
            multi: true,
        }],
    });
    const filled = await prisma.$runCommandRaw({
        update: 'bankTransactions',
        updates: [{q: {costIds: {$exists: false}}, u: {$set: {costIds: []}}, multi: true}],
    });
    const changed = Number(moved.nModified ?? 0) + Number(filled.nModified ?? 0);
    if (changed) console.info(`cost links migration: moved=${moved.nModified} filled=${filled.nModified}`);
}
