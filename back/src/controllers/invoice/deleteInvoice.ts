import {FastifyReply, FastifyRequest} from "fastify";
import type {invoices} from "@prisma/client";
import {prisma} from "../../db";

export type DeleteInvoiceRoute = {Params: {id: string}};

export const deleteInvoice = async (
    req: FastifyRequest<DeleteInvoiceRoute>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const companyId = req.user?.companyId;
    if(!companyId) return reply.unauthorized('No company');

    const client = await prisma.invoices.delete({
        where: {
            id: req.params.id,
            companyId: companyId,
        }
    });

    if(!client) return reply.notFound('No client');

    return reply.send(client);
}