import {FastifyReply, FastifyRequest} from "fastify";
import {prisma} from "../../db";
import {syncExchangeRate} from "./syncExchangeRate";

export const latestExchangeRate = async (
    req: FastifyRequest,
    reply: FastifyReply,
): Promise<FastifyReply> => {

    let exchangeRates = await prisma.exchangeRates.findFirst({
        orderBy: {
            date: 'desc'
        }
    });

    if (!exchangeRates) {
        return syncExchangeRate(req, reply);
    }

    return reply.send(exchangeRates);
}