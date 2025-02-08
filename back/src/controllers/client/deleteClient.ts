import {FastifyReply, FastifyRequest} from "fastify";
import type {clients} from "@prisma/client";
import {prisma} from "../../db";

export type DeleteClientRoute = {Params: {id: string}};

export const deleteClient = async (
    req: FastifyRequest<DeleteClientRoute>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const companyId = req.user?.companyId;
    if(!companyId) return reply.unauthorized('No company');

    const client = await prisma.clients.delete({
        where: {
            id: req.params.id,
            companyId: companyId,
        }
    });

    if(!client) return reply.notFound('No client');

    return reply.send(client);
}