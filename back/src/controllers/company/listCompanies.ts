import {FastifyReply, FastifyRequest} from "fastify";
import {prisma} from "../../db";
import {publicCompany} from "../../helpers/publicCompany";

export const listCompanies = async (
    req: FastifyRequest,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    if (!req.user) return reply.unauthorized();

    const user = await prisma.users.findUnique({where: {id: req.user.id}});
    if (!user) return reply.unauthorized('No user');

    const companies = await prisma.companies.findMany({
        where: {id: {in: [user.companyId, ...user.companyIds]}},
        orderBy: {createdAt: 'asc'},
    });

    return reply.send(companies.map(publicCompany));
}
