import {FastifyReply, FastifyRequest} from "fastify";
import type {clients, companies} from "@prisma/client";
import {prisma} from "../../db";
import {z} from "zod";

export type UpdateClientRoute = {
    Body: Partial<Pick<clients, 'name' | 'street' | 'post' | 'city' | 'tin' | 'country' | 'tinName'>>,
    Params: {id: string}
};

const UpdateClientSchema = z.object({
    name: z.string(),
    street: z.string(),
    post: z.string(),
    city: z.string(),
    tin: z.string(),
    country: z.string().optional(),
    tinName: z.string().optional(),
});

export const updateClient = async (
    req: FastifyRequest<UpdateClientRoute>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const companyId = req.user?.companyId;
    if(!companyId) return reply.unauthorized('No company');

    const body = UpdateClientSchema.parse(req.body);

    const client = await prisma.clients.update({
        where: {
            id: req.params.id,
            companyId: companyId,
        },
        data: body
    });

    if(!client) return reply.notFound('No client');

    return reply.send(client);
}