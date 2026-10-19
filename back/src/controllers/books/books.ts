import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {prisma} from "../../db";
import {COST_CATEGORIES, STATUSES, TRANSACTION_KINDS} from "../../services/books/kinds";
import {FILING_STATUSES} from "../../services/books/filings";

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
    costIds: z.array(z.string()).optional(),
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

export const listFilings = async (req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const filings = await prisma.filings.findMany({
        where: {companyId: req.companyId},
        orderBy: [{dueDate: 'asc'}, {externalId: 'asc'}],
    });
    return reply.send(filings);
}

const FilingUpdateSchema = z.object({
    status: z.enum(FILING_STATUSES).optional(),
    filedAt: z.string().nullable().optional(),
    reference: z.string().optional(),
    amount: z.number().nullable().optional(),
    note: z.string().optional(),
});

export interface UpdateFilingRoute {
    Params: { id: string };
    Body: z.infer<typeof FilingUpdateSchema>;
}

export const updateFiling = async (req: FastifyRequest<UpdateFilingRoute>, reply: FastifyReply): Promise<FastifyReply> => {
    const body = FilingUpdateSchema.parse(req.body);
    const filing = await prisma.filings.findFirst({where: {id: req.params.id, companyId: req.companyId}});
    if (!filing) return reply.notFound('Filing not found');
    return reply.send(await prisma.filings.update({where: {id: filing.id}, data: body}));
}
