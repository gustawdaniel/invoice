import {FastifyReply, FastifyRequest} from "fastify";
import {prisma} from "../../db";
import {publicCompany} from "../../helpers/publicCompany";

export const getCompany = async (
    req: FastifyRequest,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const company = await prisma.companies.findUnique({
        where: {
            id: req.companyId
        }
    });

    if(!company) return reply.notFound('No company');

    return reply.send(publicCompany(company));
}
