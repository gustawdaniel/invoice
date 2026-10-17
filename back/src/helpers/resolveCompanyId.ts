import {prisma} from "../db";
import {TokenPayload} from "../types/auth";

export async function resolveCompanyId(user: TokenPayload, requested?: string): Promise<string | null> {
    if (!requested || requested === user.companyId) return user.companyId;

    const dbUser = await prisma.users.findUnique({
        where: {id: user.id},
        select: {companyIds: true},
    });

    return dbUser?.companyIds.includes(requested) ? requested : null;
}
