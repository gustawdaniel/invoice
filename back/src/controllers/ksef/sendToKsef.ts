import {FastifyReply, FastifyRequest} from "fastify";
import {prisma} from "../../db";
import {SendInvoiceError, sendStoredInvoice} from "../../services/ksef/sendStoredInvoice";

export type SendToKsefRoute = { Params: { id: string } };

export const sendToKsef = async (
    req: FastifyRequest<SendToKsefRoute>,
    reply: FastifyReply
): Promise<FastifyReply> => {
    try {
        return reply.send(await sendStoredInvoice(req.params.id, req.companyId));
    } catch (error) {
        if (!(error instanceof SendInvoiceError)) throw error;
        req.log.error(error);
        switch (error.kind) {
            case 'notFound': return reply.notFound(error.message);
            case 'conflict': return reply.conflict(error.message);
            case 'invalid': return reply.badRequest(error.message);
            case 'rejected': return reply.unprocessableEntity(error.message);
            case 'unavailable': return reply.badGateway(error.message);
        }
    }
};

// a human dismisses the request of an agent to send the invoice to production KSeF
export const dismissKsefRequest = async (
    req: FastifyRequest<SendToKsefRoute>,
    reply: FastifyReply
): Promise<FastifyReply> => {
    const invoice = await prisma.invoices.findFirst({where: {id: req.params.id, companyId: req.companyId}});
    if (!invoice) return reply.notFound('Invoice not found');
    const updated = await prisma.invoices.update({
        where: {id: invoice.id},
        data: {ksefSendRequestedAt: null, ksefSendRequestedBy: null, ksefSendRequestNote: null},
        include: {client: true},
    });
    return reply.send(updated);
};
