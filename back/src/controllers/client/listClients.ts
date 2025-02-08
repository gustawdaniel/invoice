import {FastifyReply, FastifyRequest} from "fastify";
import {prisma} from "../../db";

export const listClients = async (
    req: FastifyRequest,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const companyId = req.user?.companyId;
    if(!companyId) return reply.unauthorized('No company');

    const clients = await prisma.clients.findMany({
        where: {
            companyId: companyId
        }
    });

    return reply.send(clients);
}