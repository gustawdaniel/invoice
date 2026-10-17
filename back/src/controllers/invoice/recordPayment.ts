import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {prisma} from "../../db";

// payment facts change after the invoice is issued, also for invoices in KSeF (their content cannot)
export const PaymentSchema = z.object({
    paid: z.number().min(0),
    paymentDate: z.string().nullable().optional(),
    // the part a foreign client withheld and paid to its tax office
    withholdingTax: z.number().min(0).optional(),
    privateNote: z.string().optional(),
});

export interface RecordPaymentRoute {
    Body: z.infer<typeof PaymentSchema>,
    Params: { id: string }
}

export const recordPayment = async (
    req: FastifyRequest<RecordPaymentRoute>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const body = PaymentSchema.parse(req.body);
    const invoice = await prisma.invoices.findFirst({where: {id: req.params.id, companyId: req.companyId}});
    if (!invoice) return reply.notFound('Invoice not found');

    const updated = await prisma.invoices.update({
        where: {id: invoice.id},
        data: body,
        include: {client: true},
    });
    return reply.send(updated);
}
