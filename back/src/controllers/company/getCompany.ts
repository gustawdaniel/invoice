import {FastifyReply, FastifyRequest} from "fastify";
import {prisma} from "../../db";

export const getCompany = async (
    req: FastifyRequest,
    reply: FastifyReply,
): Promise<FastifyReply> => {

    console.log('req.user', req.user);

    const companyId = req.user?.companyId;
    if(!companyId) return reply.unauthorized('No company');

    const company = await prisma.companies.findFirst({
        where: {
            id: companyId
        }
    });

    if(!company) return reply.notFound('No company');

    return reply.send(company);
}