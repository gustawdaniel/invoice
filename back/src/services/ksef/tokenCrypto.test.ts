import * as crypto from 'node:crypto';
import {describe, expect, it, vi} from 'vitest';

const config = vi.hoisted(() => ({KSEF_SECRET_KEY: undefined as string | undefined}));
vi.mock('../../config', () => ({config}));

import {decryptKsefToken, encryptKsefToken} from './tokenCrypto';

const TOKEN = '20261017-EC-0000000000-0000000000-00|nip-0000000000|' + 'a'.repeat(64);

describe('tokenCrypto', () => {
    it('accepts a base64 key', () => {
        config.KSEF_SECRET_KEY = crypto.randomBytes(32).toString('base64');
        expect(decryptKsefToken(encryptKsefToken(TOKEN))).toBe(TOKEN);
    });

    it('accepts a hex key and reads the same bytes as its base64 form', () => {
        const bytes = crypto.randomBytes(32);
        config.KSEF_SECRET_KEY = bytes.toString('hex');
        const encrypted = encryptKsefToken(TOKEN);
        config.KSEF_SECRET_KEY = bytes.toString('base64');
        expect(decryptKsefToken(encrypted)).toBe(TOKEN);
    });

    it('rejects a key of wrong length', () => {
        config.KSEF_SECRET_KEY = crypto.randomBytes(16).toString('base64');
        expect(() => encryptKsefToken(TOKEN)).toThrow(/32 bytes/);
    });
});
