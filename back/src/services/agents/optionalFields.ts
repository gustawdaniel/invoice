import {z} from 'zod/v4';

type Optional<T extends z.ZodRawShape> = {[K in keyof T]: z.ZodOptional<T[K] extends z.ZodDefault<infer I> ? I : T[K]>};

// Fields of a partial update: every field optional and without its default. Zod applies a default even under
// .optional(), so an update would quietly reset fields the agent never named (issue place, bank account...).
export function optionalFields<T extends z.ZodRawShape>(shape: T): Optional<T> {
    return Object.fromEntries((Object.entries(shape) as [string, z.ZodType][]).map(([key, schema]) => {
        const field: z.ZodType = schema instanceof z.ZodDefault ? (schema.unwrap() as z.ZodType) : schema;
        return [key, (schema.description ? field.describe(schema.description) : field).optional()];
    })) as unknown as Optional<T>;
}
