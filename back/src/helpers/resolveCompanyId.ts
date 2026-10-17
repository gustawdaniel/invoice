import {prisma} from "../db";
import {TokenPayload} from "../types/auth";

// the selected company (x-company-id) if the user has it, otherwise their default company;
// the default is read from the database, the one in the token is stale after the user changes it
export async function resolveCompanyId(user: TokenPayload, requested?: string): Promise<string | null> {
    const dbUser = await prisma.users.findUnique({
        where: {id: user.id},
        select: {companyId: true, companyIds: true},
    });
    if (!dbUser) return null;
    if (!requested) return dbUser.companyId;

    return [dbUser.companyId, ...dbUser.companyIds].includes(requested) ? requested : null;
}
