import {FastifyReply, FastifyRequest} from "fastify";
import {prisma} from "../../db";

export type GetKsefXmlRoute = { Params: { id: string } };

// The FA(3) XML accepted by KSeF is the legally binding invoice
export const getKsefXml = async (req: FastifyRequest<GetKsefXmlRoute>, reply: FastifyReply): Promise<FastifyReply> => {
    const invoice = await prisma.invoices.findFirst({
        where: {id: req.params.id, companyId: req.companyId},
        select: {ksefXml: true, ksefNumber: true},
    });
    if (!invoice?.ksefXml || !invoice.ksefNumber) return reply.notFound('Invoice is not in KSeF');

    return reply
        .header('content-type', 'application/xml; charset=utf-8')
        .header('content-disposition', `attachment; filename="${invoice.ksefNumber}.xml"`)
        .send(invoice.ksefXml);
}
