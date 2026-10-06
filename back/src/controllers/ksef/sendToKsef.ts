import {FastifyReply, FastifyRequest} from "fastify";
import {KSeFInvoiceRejectedError} from "ksef-client-ts";
import {prisma} from "../../db";
import {buildFa3} from "../../services/ksef/buildFa3";
import {sendInvoiceToKsef} from "../../services/ksef/ksef";
import {getErrorMessage} from "../../helpers/getErrorMessage";

export type SendToKsefRoute = { Params: { id: string } };

export const sendToKsef = async (
    req: FastifyRequest<SendToKsefRoute>,
    reply: FastifyReply
): Promise<FastifyReply> => {
    const invoice = await prisma.invoices.findFirst({
        where: {id: req.params.id, companyId: req.companyId},
        include: {company: true, client: true},
    });

    if (!invoice) return reply.notFound('Invoice not found');
    if (invoice.ksefNumber) return reply.conflict(`Invoice is already in KSeF as ${invoice.ksefNumber}`);

    let xml: string;
    try {
        xml = buildFa3(invoice);
    } catch (error) {
        return reply.badRequest(getErrorMessage(error));
    }

    try {
        const {status, qrUrl} = await sendInvoiceToKsef(invoice.company, xml, invoice.issueDate);
        const updated = await prisma.invoices.update({
            where: {id: invoice.id},
            data: {
                ksefEnv: invoice.company.ksefEnv,
                ksefStatus: 'Accepted',
                ksefNumber: status.ksefNumber,
                ksefReferenceNumber: status.referenceNumber,
                ksefSentAt: new Date(),
                ksefXml: xml,
                ksefQrUrl: qrUrl,
                ksefError: null,
            },
            include: {client: true},
        });
        return reply.send(updated);
    } catch (error) {
        req.log.error(error);
        const rejected = error instanceof KSeFInvoiceRejectedError;
        const message = getErrorMessage(error);
        await prisma.invoices.update({
            where: {id: invoice.id},
            data: {ksefStatus: rejected ? 'Rejected' : invoice.ksefStatus, ksefError: message},
        });
        return rejected ? reply.unprocessableEntity(message) : reply.badGateway(message);
    }
};
