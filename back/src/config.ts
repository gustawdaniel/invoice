import { z } from 'zod';

export const serverVariables = z.object({
    NODE_ENV: z
        .enum(['development', 'production', 'test'])
        .default('development'),
    PORT: z.coerce.number().int().default(5000),

    MONGO_URI: z.string(),
    JWT_SECRET: z.string(),

    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

    EXCHANGE_RATES_API_TOKEN: z.string(),
});

export const config = serverVariables.parse(process.env);
