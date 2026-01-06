import {FastifyReply, FastifyRequest} from "fastify";
import {getCurrency} from "../../helpers/getCurrency";
import {getLanguage} from "../../helpers/getLanguage";
import {getPaymentForm} from "../../helpers/getPaymentForm";
import {prisma} from "../../db";
import {getUnit} from "../../helpers/getUnit";
import {getVatRate} from "../../helpers/getVatRate";
import {z} from "zod";
import type {invoices} from "@prisma/client";

const UpdateInvoiceSchema = z.object({
    number: z.string(),
    clientId: z.string(),
    issueDate: z.string(),
    saleDate: z.string(),
    deadlineDate: z.string(),
    issuePlace: z.string(),
    currency: z.string(),
    lang: z.string(),
    paymentForm: z.string(),
    items: z.array(z.object({
        name: z.string(),
        priceNet: z.number(),
        vat: z.object({
            name: z.string(),
            value: z.number(),
        }),
        quantity: z.number(),
        unit: z.string(),
    })),
    issuerName: z.string(),
    bankAccountNumber: z.string(),
    publicNote: z.string(),
    privateNote: z.string(),
    paid: z.number().default(0),
    paymentDate: z.string().optional(),
});

export interface UpdateInvoiceRoute {
    Body: Partial<Omit<invoices,  'companyId'>>,
    Params: { id: string }
}

export const updateInvoice = async (
    req: FastifyRequest<UpdateInvoiceRoute>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const companyId = req.user?.companyId;
    if(!companyId) return reply.unauthorized('No company');

    const id = req.params.id;
    if(!id) return reply.badRequest('No id');

    const newInvoicePayload = UpdateInvoiceSchema.parse(req.body);

    const items = newInvoicePayload.items.map(item => ({
        ...item,
        vat: {
            name: getVatRate(item.vat.name),
            value: item.vat.value
        },
        unit: getUnit(item.unit)
    }))

    const invoice = await prisma.invoices.findFirst({
        where: {
            id: id
        },
        include: {
            client: true
        }
    });

    if(!invoice) return reply.notFound('Invoice not found');

    const invoiceData = {
        ...newInvoicePayload,
        currency: getCurrency(newInvoicePayload.currency),
        lang: getLanguage(newInvoicePayload.lang),
        paymentForm: getPaymentForm(newInvoicePayload.paymentForm),
        items,
        companyId: companyId,
    }

    await prisma.invoices.update({
        where: {
            id: invoice.id
        },
        data: invoiceData
    });

    return reply.send(invoice);
}