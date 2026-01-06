import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const mongoUriMatch = envContent.match(/MONGO_URI=(.*)/);
const mongoUri = mongoUriMatch ? mongoUriMatch[1] : process.env.MONGO_URI;

const prisma = new PrismaClient({
    datasourceUrl: mongoUri
});

async function main() {
    // Update all companies to have the acquired TIN (since we assume single tenant or main company)
    const update = await prisma.companies.updateMany({
        data: {
            tin: '8133387686'
        }
    });
    console.log('Updated companies:', update.count);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
