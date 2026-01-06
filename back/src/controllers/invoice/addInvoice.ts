import {FastifyReply, FastifyRequest} from "fastify";
import {AddClientBody} from "../client/addClient";
import type {invoices} from "@prisma/client";
import {z} from "zod";
import {prisma} from "../../db";
import {getCurrency} from "../../helpers/getCurrency";
import {getLanguage} from "../../helpers/getLanguage";
import {getPaymentForm} from "../../helpers/getPaymentForm";
import {getVatRate} from "../../helpers/getVatRate";
import {getUnit} from "../../helpers/getUnit";

export interface AddInvoiceRoute {
    Body: Partial<Omit<invoices, 'id' | 'companyId'>>
}

const NewInvoiceSchema = z.object({
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

export const addInvoice = async (
    req: FastifyRequest<AddInvoiceRoute>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const companyId = req.user?.companyId;
    if(!companyId) return reply.unauthorized('No company');

    const newInvoicePayload = NewInvoiceSchema.parse(req.body);

    const items = newInvoicePayload.items.map(item => ({
        ...item,
        vat: {
            name: getVatRate(item.vat.name),
            value: item.vat.value
        },
        unit: getUnit(item.unit)
    }))

    const invoice = await prisma.invoices.create({
        data: {
            ...newInvoicePayload,
            currency: getCurrency(newInvoicePayload.currency),
            lang: getLanguage(newInvoicePayload.lang),
            paymentForm: getPaymentForm(newInvoicePayload.paymentForm),
            items,
            companyId: companyId,
        }
    });

    return reply.send(invoice);
}