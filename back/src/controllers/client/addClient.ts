import {FastifyReply, FastifyRequest} from "fastify";
import type {clients} from "@prisma/client";
import {prisma} from "../../db";
import { z } from "zod";

export type AddClientBody = {
    Body: Partial<Pick<clients, 'name' | 'street' | 'post' | 'city' | 'tin' | 'country' | 'tinName'>>
};

const NewClientSchema = z.object({
    name: z.string(),
    street: z.string(),
    post: z.string(),
    city: z.string(),
    tin: z.string(),
    country: z.string().optional(),
    tinName: z.string().optional(),
});

export const addClient = async (
    req: FastifyRequest<AddClientBody>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const companyId = req.user?.companyId;
    if(!companyId) return reply.unauthorized('No company');

    const newClientPayload = NewClientSchema.parse(req.body);

    const client = await prisma.clients.create({
        data: {
            ...newClientPayload,
            companyId: companyId,
        }
    });

    return reply.send(client);
}