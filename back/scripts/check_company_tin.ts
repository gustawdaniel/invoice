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
    const company = await prisma.companies.findFirst();
    console.log('Company TIN:', company?.tin || 'Not Found');
    console.log('Company Name:', company?.name || 'Not Found');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
