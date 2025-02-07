import {FastifyReply, FastifyRequest} from "fastify";
import {prisma} from "../../db";

export const listExchangeRates = async (
    req: FastifyRequest,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const exchanges = await prisma.exchangeRates.findMany({
        orderBy: {
            date: 'desc'
        },
        take: 10
    });

    return reply.send(exchanges);
}