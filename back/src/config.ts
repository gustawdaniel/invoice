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

    // 32 bytes, base64; encrypts KSeF tokens stored in companies.ksefTokenEnc
    KSEF_SECRET_KEY: z.string().optional(),

    // comma separated emails that get the admin role (list of all companies at /admin)
    ADMIN_EMAILS: z.string().default('')
        .transform(value => value.split(',').map(email => email.trim().toLowerCase()).filter(Boolean)),
});

export const config = serverVariables.parse(process.env);
