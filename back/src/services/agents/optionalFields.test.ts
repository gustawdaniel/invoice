import {describe, expect, it} from 'vitest';
import {z} from 'zod/v4';
import {optionalFields} from './optionalFields';

describe('optionalFields', () => {
    const shape = optionalFields({
        issue_place: z.string().default('').describe('Defaults to the company default'),
        currency: z.enum(['PLN', 'EUR']).default('PLN'),
        number: z.string().min(1),
    });

    it('leaves fields the update does not name undefined', () => {
        expect(z.object(shape).parse({number: '1'})).toEqual({number: '1'});
    });

    it('publishes no defaults and keeps descriptions', () => {
        const schema = z.toJSONSchema(z.object(shape)) as {properties: Record<string, Record<string, unknown>>, required?: string[]};
        expect(schema.properties.issue_place.default).toBeUndefined();
        expect(schema.properties.currency.default).toBeUndefined();
        expect(schema.properties.issue_place.description).toBe('Defaults to the company default');
        expect(schema.required ?? []).toEqual([]);
    });
});
