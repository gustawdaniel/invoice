import { z } from 'zod';

export const serverVariables = z.object({
    NODE_ENV: z
        .enum(['development', 'production', 'test'])
        .default('development'),
    PORT: z.coerce.number().int().default(5000),

    SPACE_ACCESS_KEY: z.string(),
    SPACE_SECRET_KEY: z.string(),
    SPACE_BUCKET: z.string(),
    SPACE_ENDPOINT: z.string(),
    SPACE_REGION: z.string().default('fra1'),

    MONGO_URI: z.string(),
    JWT_SECRET: z.string(),

    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

    EXCHANGE_RATES_API_TOKEN: z.string(),

    KSEF_API_URL: z.string().default('https://api-test.ksef.mf.gov.pl/v2'),
    KSEF_TOKEN: z.string().optional(), // For test environment authorization
});

export const config = serverVariables.parse(process.env);
