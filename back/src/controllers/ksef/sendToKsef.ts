import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../db";
import { XmlGenerator } from "../../services/ksef/XmlGenerator";
import { KsefClient } from "../../services/ksef/KsefClient";

export const sendToKsef = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) => {
    const { id } = request.params;

    try {
        // 1. Fetch Invoice
        const invoice = await prisma.invoices.findUnique({
            where: { id },
            include: {
                company: true,
                client: true,
            },
        });

        if (!invoice) {
            return reply.notFound('Invoice not found');
        }

        // 2. Generate XML
        const xml = XmlGenerator.generate(invoice);

        // 3. Send to KSeF
        const ksefClient = new KsefClient();
        // await ksefClient.initSession(); // TODO: Enable when real auth is ready
        const ksefRef = await ksefClient.sendInvoice(xml);

        // 4. Update Database
        await prisma.invoices.update({
            where: { id },
            data: {
                ksefReferenceNumber: ksefRef,
                ksefStatus: 'Sent'
            }
        });

        return reply.send({
            message: 'Invoice sent to KSeF successfully',
            ksefReferenceNumber: ksefRef,
            xmlPreview: xml // Optional: for debugging
        });

    } catch (error) {
        request.log.error(error);
        return reply.internalServerError('Failed to send invoice to KSeF');
    }
};
