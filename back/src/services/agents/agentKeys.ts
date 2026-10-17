import * as crypto from 'node:crypto';
import {prisma} from '../../db';

const PREFIX = 'oi_';

export function hashAgentKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
}

// the plain key is returned only once, the database keeps its hash
export async function createAgentKey(userId: string, name: string) {
    const key = PREFIX + crypto.randomBytes(32).toString('base64url');
    const record = await prisma.agentKeys.create({
        data: {userId, name, prefix: key.slice(0, PREFIX.length + 6), hash: hashAgentKey(key)},
    });
    return {key, record};
}

export function looksLikeAgentKey(token: string): boolean {
    return token.startsWith(PREFIX);
}

export async function findAgentKey(key: string) {
    const record = await prisma.agentKeys.findUnique({where: {hash: hashAgentKey(key)}, include: {user: true}});
    if (!record) return null;
    await prisma.agentKeys.update({where: {id: record.id}, data: {lastUsedAt: new Date()}});
    return record;
}
