import * as crypto from 'node:crypto';
import {config} from '../../config';

// KSeF token lets anyone issue invoices on behalf of the company, so it is stored
// encrypted with AES-256-GCM. Format: base64(iv).base64(tag).base64(ciphertext)

function key(): Buffer {
    if (!config.KSEF_SECRET_KEY) {
        throw new Error('KSEF_SECRET_KEY is not set, cannot store or read KSeF tokens');
    }
    const buf = Buffer.from(config.KSEF_SECRET_KEY, 'base64');
    if (buf.length !== 32) {
        throw new Error(`KSEF_SECRET_KEY must be 32 bytes in base64, got ${buf.length} bytes`);
    }
    return buf;
}

export function encryptKsefToken(token: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map(b => b.toString('base64')).join('.');
}

export function decryptKsefToken(payload: string): string {
    const [iv, tag, encrypted] = payload.split('.').map(p => Buffer.from(p, 'base64'));
    if (!iv || !tag || !encrypted) throw new Error('Malformed encrypted KSeF token');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
