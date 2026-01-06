import {FastifyReply, FastifyRequest} from "fastify";
import {prisma} from "../../db";

export const listInvoices = async (
    req: FastifyRequest,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const companyId = req.user?.companyId;
    if(!companyId) return reply.unauthorized('No company');

    const invoices = await prisma.invoices.findMany({
        where: {
            companyId: companyId
        },
        include: {
            client: true
        }
    });

    console.log('invoices', invoices);

    return reply.send(invoices);
}