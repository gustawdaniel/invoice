import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {prisma} from "../../db";
import {COST_CATEGORIES, STATUSES, TRANSACTION_KINDS} from "../../services/books/kinds";

// the bookkeeping of the selected company: bank operations and purchase documents

export const listBankTransactions = async (req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const transactions = await prisma.bankTransactions.findMany({
        where: {companyId: req.companyId},
        orderBy: [{date: 'desc'}, {externalId: 'asc'}],
    });
    return reply.send(transactions);
}

const ClassificationSchema = z.object({
    kind: z.enum(TRANSACTION_KINDS).optional(),
    status: z.enum(STATUSES).optional(),
    invoiceId: z.string().nullable().optional(),
    costId: z.string().nullable().optional(),
    note: z.string().optional(),
});

export interface ClassifyTransactionRoute {
    Params: { id: string };
    Body: z.infer<typeof ClassificationSchema>;
}

// a human decision: confirmed unless the body says otherwise
export const classifyTransaction = async (req: FastifyRequest<ClassifyTransactionRoute>, reply: FastifyReply): Promise<FastifyReply> => {
    const body = ClassificationSchema.parse(req.body);
    const transaction = await prisma.bankTransactions.findFirst({where: {id: req.params.id, companyId: req.companyId}});
    if (!transaction) return reply.notFound('Transaction not found');
    const updated = await prisma.bankTransactions.update({
        where: {id: transaction.id},
        data: {...body, status: body.status ?? 'confirmed'},
    });
    return reply.send(updated);
}

export const listCosts = async (req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const costs = await prisma.costs.findMany({
        where: {companyId: req.companyId},
        orderBy: [{issueDate: 'desc'}, {externalId: 'asc'}],
    });
    return reply.send(costs);
}

const CostUpdateSchema = z.object({
    category: z.enum(COST_CATEGORIES).optional(),
    reverseCharge: z.boolean().optional(),
    status: z.enum(STATUSES).optional(),
    note: z.string().optional(),
});

export interface UpdateCostRoute {
    Params: { id: string };
    Body: z.infer<typeof CostUpdateSchema>;
}

export const updateCost = async (req: FastifyRequest<UpdateCostRoute>, reply: FastifyReply): Promise<FastifyReply> => {
    const body = CostUpdateSchema.parse(req.body);
    const cost = await prisma.costs.findFirst({where: {id: req.params.id, companyId: req.companyId}});
    if (!cost) return reply.notFound('Cost not found');
    const updated = await prisma.costs.update({
        where: {id: cost.id},
        data: {...body, status: body.status ?? 'confirmed'},
    });
    return reply.send(updated);
}
