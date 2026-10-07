import {FastifyReply, FastifyRequest} from "fastify";
import {lookupNip as lookup} from "../../services/mf/whiteList";
import {getErrorMessage} from "../../helpers/getErrorMessage";

export type LookupNipRoute = { Params: { nip: string } };

export const lookupNip = async (req: FastifyRequest<LookupNipRoute>, reply: FastifyReply): Promise<FastifyReply> => {
    try {
        return reply.send(await lookup(req.params.nip));
    } catch (error) {
        return reply.badRequest(getErrorMessage(error));
    }
}
