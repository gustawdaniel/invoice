import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import type {agentKeys} from "@prisma/client";
import {prisma} from "../../db";
import {createAgentKey} from "../../services/agents/agentKeys";

function publicKey({hash, userId, ...key}: agentKeys) {
    return key;
}

export const listAgentKeys = async (req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    if (!req.user) return reply.unauthorized();
    const keys = await prisma.agentKeys.findMany({where: {userId: req.user.id}, orderBy: {createdAt: 'desc'}});
    return reply.send(keys.map(publicKey));
}

const NewKeySchema = z.object({name: z.string().trim().min(1).max(60)});
export type AddAgentKeyRoute = { Body: z.infer<typeof NewKeySchema> };

// the key is in the response only this one time
export const addAgentKey = async (req: FastifyRequest<AddAgentKeyRoute>, reply: FastifyReply): Promise<FastifyReply> => {
    if (!req.user) return reply.unauthorized();
    const {name} = NewKeySchema.parse(req.body);
    const {key, record} = await createAgentKey(req.user.id, name);
    return reply.send({...publicKey(record), key});
}

export type DeleteAgentKeyRoute = { Params: { id: string } };

export const deleteAgentKey = async (req: FastifyRequest<DeleteAgentKeyRoute>, reply: FastifyReply): Promise<FastifyReply> => {
    if (!req.user) return reply.unauthorized();
    const {count} = await prisma.agentKeys.deleteMany({where: {id: req.params.id, userId: req.user.id}});
    if (!count) return reply.notFound('Key not found');
    return reply.send({deleted: true});
}
