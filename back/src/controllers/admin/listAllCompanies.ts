import {FastifyReply, FastifyRequest} from "fastify";
import {prisma} from "../../db";

// every company in the app with the users who can open it, for admins
export const listAllCompanies = async (_req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const [companies, users, invoiceCounts, pendingRequests] = await Promise.all([
        prisma.companies.findMany({orderBy: {createdAt: 'desc'}}),
        prisma.users.findMany({select: {email: true, companyId: true, companyIds: true, lastVerifiedAt: true}}),
        prisma.invoices.groupBy({by: ['companyId'], _count: {_all: true}}),
        prisma.invoices.groupBy({by: ['companyId'], where: {ksefSendRequestedAt: {not: null}}, _count: {_all: true}}),
    ]);
    const count = (rows: typeof invoiceCounts, companyId: string) =>
        rows.find(row => row.companyId === companyId)?._count._all ?? 0;

    return reply.send(companies.map(company => ({
        id: company.id,
        name: company.name,
        country: company.country,
        tin: company.tin,
        ksefEnv: company.ksefEnv,
        ksefConnected: Boolean(company.ksefTokenEnc),
        createdAt: company.createdAt,
        users: users
            .filter(user => user.companyId === company.id || user.companyIds.includes(company.id))
            .map(user => ({email: user.email, lastVerifiedAt: user.lastVerifiedAt})),
        invoices: count(invoiceCounts, company.id),
        pendingKsefRequests: count(pendingRequests, company.id),
    })));
}
