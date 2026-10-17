import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {agentUpdate} from "../books/merge";
import {COST_CATEGORIES, TRANSACTION_KINDS} from "../books/kinds";
import {FILING_KINDS, FILING_STATUSES} from "../books/filings";
import type {companies, users} from "@prisma/client";
import dayjs from "dayjs";
import {z} from "zod/v4";
import {prisma} from "../../db";
import {getCurrency} from "../../helpers/getCurrency";
import {getLanguage} from "../../helpers/getLanguage";
import {getPaymentForm} from "../../helpers/getPaymentForm";
import {getUnit} from "../../helpers/getUnit";
import {getVatRate} from "../../helpers/getVatRate";
import {publicCompany} from "../../helpers/publicCompany";
import {buildFa3} from "../ksef/buildFa3";
import {sendStoredInvoice} from "../ksef/sendStoredInvoice";
import {lookupNip} from "../mf/whiteList";

// What an agent (MCP client with an agent key) may do on behalf of its user. Agents prepare data; anything that
// reaches production KSeF is only a request, the human sends it from the app. Agents cannot connect or disconnect
// KSeF, change the KSeF mode, delete anything or manage keys.

export interface AgentContext {
    user: users;
    keyName: string;
}

const VAT_RATES = {
    '23%': 0.23, '19%': 0.19, '18%': 0.18, '8%': 0.08, '5%': 0.05, '0%': 0,
    'zw.': 0, 'exempt.': 0, 'np.': 0, 'np. EU': 0, '0% WDT': 0, '0% Exp.': 0, 'o.o.': 0,
} as const;
const VAT_NAMES = Object.keys(VAT_RATES) as [keyof typeof VAT_RATES, ...(keyof typeof VAT_RATES)[]];
const UNITS = ['piece', 'service', 'hour', 'pack.', 'box', 'palette', 't.', 'kg', 'm2', 'm3', 'km', 'mb', 'l', 'mh.'] as const;
const PAYMENT_FORMS = ['cash', 'prepaid', '14d', '7d', 'card', 'delivery', 'check', 'dotpay', 'paypal', 'payu', 'other'] as const;
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const itemShape = z.object({
    name: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.enum(UNITS).default('service'),
    price_net: z.number().describe('Net unit price'),
    vat: z.enum(VAT_NAMES).describe('VAT rate; "zw." for VAT exempt (needs vat_exemption_basis on the company)'),
});

const invoiceFields = {
    client_id: z.string().describe('Id from list_clients or create_client'),
    number: z.string().min(1).describe('Invoice number, e.g. 0002/10/2026; check list_invoices for the last one'),
    issue_date: DATE,
    sale_date: DATE.optional().describe('Defaults to issue_date'),
    deadline_date: DATE.optional().describe('Payment deadline, defaults to issue_date + 14 days'),
    issue_place: z.string().default('').describe('Defaults to the company default'),
    currency: z.enum(['PLN', 'EUR', 'USD', 'GBP']).default('PLN'),
    lang: z.enum(['pl', 'en']).default('pl'),
    payment_form: z.enum(PAYMENT_FORMS).default('14d'),
    items: z.array(itemShape).min(1),
    issuer_name: z.string().optional().describe('Defaults to the company default, then the name of the user'),
    bank_account_number: z.string().default('').describe('Defaults to the company default'),
    public_note: z.string().default('').describe('Printed on the invoice, defaults to the company default'),
    private_note: z.string().default('').describe('Visible only in the app'),
};

function json(data: unknown) {
    return {content: [{type: 'text' as const, text: JSON.stringify(data, null, 2)}]};
}

function companyIdsOf(user: users): string[] {
    return [user.companyId, ...user.companyIds];
}

async function requireCompany(ctx: AgentContext, companyId: string): Promise<companies> {
    if (!companyIdsOf(ctx.user).includes(companyId)) throw new Error('No access to this company');
    const company = await prisma.companies.findUnique({where: {id: companyId}});
    if (!company) throw new Error('Company not found');
    return company;
}

async function requireDraft(companyId: string, invoiceId: string) {
    const invoice = await prisma.invoices.findFirst({
        where: {id: invoiceId, companyId},
        include: {company: true, client: true},
    });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.ksefNumber) throw new Error(`Invoice is already in KSeF as ${invoice.ksefNumber}, it cannot be changed`);
    return invoice;
}

// the stored XML is large and only useful to humans, agents get the rest
function agentInvoice<T extends { ksefXml?: string | null }>({ksefXml, ...invoice}: T) {
    return invoice;
}

function items(input: z.infer<typeof itemShape>[]) {
    return input.map(item => ({
        name: item.name,
        quantity: item.quantity,
        priceNet: item.price_net,
        unit: getUnit(item.unit),
        vat: {name: getVatRate(item.vat), value: VAT_RATES[item.vat]},
    }));
}

export function createMcpServer(ctx: AgentContext): McpServer {
    const server = new McpServer(
        {name: 'openinvoice', version: '1.0.0'},
        {
            instructions: 'Drafts invoices in openinvoice.in for the companies of the user who created the agent key. '
                + 'Like Stripe, every invoice is either live or in test mode (test_mode: true). Test mode invoices can '
                + 'be sent to KSeF DEMO (no legal effect) with send_to_ksef_demo, use them to check an invoice. Live '
                + 'invoices are only sent to production KSeF after a human approves them: call request_ksef_send and '
                + 'tell the user to approve it in the app. Never claim an invoice was sent to KSeF unless it has a '
                + 'ksefNumber.',
        },
    );

    server.registerTool('list_companies', {
        description: 'Companies the user can issue invoices for; isDefault: the one the user works in by default, '
            + 'ksefConnected: production KSeF, ksefDemoConnected: KSeF DEMO for test mode',
        annotations: {readOnlyHint: true},
    }, async () => {
        const companies = await prisma.companies.findMany({
            where: {id: {in: companyIdsOf(ctx.user)}},
            orderBy: {createdAt: 'asc'},
        });
        return json(companies.map(company => {
            const {logo, signature, ...rest} = publicCompany(company);
            return {...rest, isDefault: company.id === ctx.user.companyId};
        }));
    });

    server.registerTool('create_company', {
        description: 'Create a company for the user. Polish (PL) companies can later be connected to KSeF by the user '
            + 'in the app; agents cannot connect KSeF.',
        inputSchema: {
            name: z.string().min(1),
            country: z.enum(['PL', 'GE']).describe('PL: Polish invoices and KSeF; GE: Georgian, no KSeF'),
            tin: z.string().default('').describe('NIP for Polish companies (lookup_nip fills name and address)'),
            address: z.string().default(''),
            vat_exemption_basis: z.string().default('')
                .describe('For non-VAT payers, e.g. "Art. 113 ust. 1 ustawy o VAT"'),
        },
    }, async ({name, country, tin, address, vat_exemption_basis}) => {
        const company = await prisma.companies.create({
            data: {name, country, tin, address, vatExemptionBasis: vat_exemption_basis},
        });
        await prisma.users.update({where: {id: ctx.user.id}, data: {companyIds: {push: company.id}}});
        ctx.user.companyIds.push(company.id);
        return json(publicCompany(company));
    });

    server.registerTool('update_company', {
        description: 'Update company details. The NIP of a company connected to KSeF can only be changed by a human.',
        inputSchema: {
            company_id: z.string(),
            name: z.string().min(1).optional(),
            tin: z.string().optional(),
            address: z.string().optional(),
            info: z.string().optional().describe('Extra lines printed under the company, e.g. bank details'),
            vat_exemption_basis: z.string().optional(),
            krs: z.string().optional(),
            regon: z.string().optional(),
            default_issue_place: z.string().optional().describe('Prefilled on new invoices'),
            default_issuer_name: z.string().optional().describe('Prefilled on new invoices'),
            default_bank_account_number: z.string().optional().describe('Prefilled on new invoices'),
            default_public_note: z.string().optional().describe('Prefilled on new invoices, e.g. a note about VAT'),
        },
    }, async ({company_id, vat_exemption_basis, default_issue_place, default_issuer_name,
                  default_bank_account_number, default_public_note, ...fields}) => {
        const company = await requireCompany(ctx, company_id);
        if (fields.tin !== undefined && fields.tin !== company.tin && (company.ksefTokenEnc || company.ksefDemoTokenEnc)) {
            throw new Error('This company is connected to KSeF, ask the user to change the NIP in the app');
        }
        const updated = await prisma.companies.update({
            where: {id: company.id},
            data: {
                ...fields,
                vatExemptionBasis: vat_exemption_basis,
                defaultIssuePlace: default_issue_place,
                defaultIssuerName: default_issuer_name,
                defaultBankAccountNumber: default_bank_account_number,
                defaultPublicNote: default_public_note,
            },
        });
        return json(publicCompany(updated));
    });

    server.registerTool('lookup_nip', {
        description: 'Name, address and VAT status of a Polish taxpayer from the MF White List',
        inputSchema: {nip: z.string()},
        annotations: {readOnlyHint: true, openWorldHint: true},
    }, async ({nip}) => json(await lookupNip(nip)));

    server.registerTool('list_clients', {
        description: 'Clients (buyers) of a company',
        inputSchema: {company_id: z.string()},
        annotations: {readOnlyHint: true},
    }, async ({company_id}) => {
        await requireCompany(ctx, company_id);
        return json(await prisma.clients.findMany({where: {companyId: company_id}}));
    });

    server.registerTool('create_client', {
        description: 'Add a client (buyer) to a company',
        inputSchema: {
            company_id: z.string(),
            name: z.string().min(1),
            street: z.string(),
            post: z.string().describe('Postal code'),
            city: z.string(),
            tin: z.string().describe('Tax id of the buyer, NIP for Polish companies'),
            tin_name: z.string().default('NIP'),
            country: z.string().default('Poland'),
        },
    }, async ({company_id, tin_name, ...client}) => {
        await requireCompany(ctx, company_id);
        return json(await prisma.clients.create({data: {...client, tinName: tin_name, companyId: company_id}}));
    });

    server.registerTool('list_invoices', {
        description: 'Live or test mode invoices of a company, newest first. Invoices without ksefNumber are drafts '
            + 'that can be edited. Live and test mode have separate numbering.',
        inputSchema: {
            company_id: z.string(),
            test_mode: z.boolean().default(false),
            limit: z.number().int().min(1).max(200).default(20),
        },
        annotations: {readOnlyHint: true},
    }, async ({company_id, test_mode, limit}) => {
        await requireCompany(ctx, company_id);
        const invoices = await prisma.invoices.findMany({
            where: {companyId: company_id, livemode: !test_mode},
            include: {client: true},
            orderBy: {id: 'desc'},
            take: limit,
        });
        return json(invoices.map(agentInvoice));
    });

    server.registerTool('get_invoice', {
        description: 'One invoice with its client and KSeF status',
        inputSchema: {company_id: z.string(), invoice_id: z.string()},
        annotations: {readOnlyHint: true},
    }, async ({company_id, invoice_id}) => {
        await requireCompany(ctx, company_id);
        const invoice = await prisma.invoices.findFirst({
            where: {id: invoice_id, companyId: company_id},
            include: {client: true},
        });
        if (!invoice) throw new Error('Invoice not found');
        return json(agentInvoice(invoice));
    });

    server.registerTool('record_payment', {
        description: 'Record what the client paid, also on invoices already in KSeF. withholding_tax: the part a '
            + 'foreign client withheld for its tax office; paid + withholding_tax covering the gross amount settles it.',
        inputSchema: {
            company_id: z.string(),
            invoice_id: z.string(),
            paid: z.number().min(0).describe('Total received, in the invoice currency'),
            payment_date: DATE.optional(),
            withholding_tax: z.number().min(0).optional(),
        },
    }, async ({company_id, invoice_id, paid, payment_date, withholding_tax}) => {
        await requireCompany(ctx, company_id);
        const invoice = await prisma.invoices.findFirst({where: {id: invoice_id, companyId: company_id}});
        if (!invoice) throw new Error('Invoice not found');
        const updated = await prisma.invoices.update({
            where: {id: invoice.id},
            data: {paid, paymentDate: payment_date, withholdingTax: withholding_tax},
            include: {client: true},
        });
        return json(agentInvoice(updated));
    });

    // ---- bookkeeping: the agent keeps the books with the human, who confirms in the app ----

    const AGENT_STATUS = z.enum(['auto', 'review']).describe('auto: sure; review: the human should decide in the app');

    server.registerTool('upsert_bank_transactions', {
        description: 'Add bank operations of a company (idempotent by external_id). A classification the human '
            + 'confirmed is never changed. kinds: ' + TRANSACTION_KINDS.join(', '),
        inputSchema: {
            company_id: z.string(),
            transactions: z.array(z.object({
                external_id: z.string().min(1).describe('Stable id, e.g. a hash of account, date, amount, text and position'),
                bank: z.string(),
                account: z.string(),
                date: DATE,
                amount: z.number().describe('Positive in, negative out'),
                currency: z.string().default('PLN'),
                description: z.string(),
                bank_category: z.string().default(''),
                kind: z.enum(TRANSACTION_KINDS).optional(),
                status: AGENT_STATUS.optional(),
                invoice_id: z.string().optional(),
                cost_id: z.string().optional(),
                note: z.string().optional(),
            })).min(1).max(500),
        },
    }, async ({company_id, transactions}) => {
        await requireCompany(ctx, company_id);
        let created = 0, updated = 0, kept = 0;
        for (const t of transactions) {
            const key = {companyId_externalId: {companyId: company_id, externalId: t.external_id}};
            const current = await prisma.bankTransactions.findUnique({where: key, select: {status: true}});
            const facts = {bank: t.bank, account: t.account, date: t.date, amount: t.amount, currency: t.currency,
                description: t.description, bankCategory: t.bank_category};
            const data = agentUpdate(current, facts,
                {kind: t.kind, status: t.status, invoiceId: t.invoice_id, costId: t.cost_id, note: t.note});
            if (current) {
                await prisma.bankTransactions.update({where: key, data});
                if (current.status === 'confirmed') kept++; else updated++;
            } else {
                await prisma.bankTransactions.create({data: {...data, companyId: company_id, externalId: t.external_id}});
                created++;
            }
        }
        return json({created, updated, keptHumanDecisions: kept});
    });

    server.registerTool('list_bank_transactions', {
        description: 'Bank operations of a company, newest first, with their classification',
        inputSchema: {
            company_id: z.string(),
            status: z.enum(['auto', 'confirmed', 'review']).optional(),
            kind: z.enum(TRANSACTION_KINDS).optional(),
            from: DATE.optional(),
            to: DATE.optional(),
            limit: z.number().int().min(1).max(2000).default(500),
        },
        annotations: {readOnlyHint: true},
    }, async ({company_id, status, kind, from, to, limit}) => {
        await requireCompany(ctx, company_id);
        return json(await prisma.bankTransactions.findMany({
            where: {companyId: company_id, status, kind, date: {gte: from, lte: to}},
            orderBy: [{date: 'desc'}, {externalId: 'asc'}],
            take: limit,
        }));
    });

    server.registerTool('classify_bank_transactions', {
        description: 'Set what bank operations were. Operations the human confirmed are skipped. kinds: '
            + TRANSACTION_KINDS.join(', '),
        inputSchema: {
            company_id: z.string(),
            items: z.array(z.object({
                id: z.string(),
                kind: z.enum(TRANSACTION_KINDS),
                status: AGENT_STATUS,
                invoice_id: z.string().nullable().optional(),
                cost_id: z.string().nullable().optional(),
                note: z.string().optional(),
            })).min(1).max(500),
        },
    }, async ({company_id, items}) => {
        await requireCompany(ctx, company_id);
        let changed = 0, kept = 0;
        for (const item of items) {
            const current = await prisma.bankTransactions.findFirst({where: {id: item.id, companyId: company_id}});
            if (!current) throw new Error(`Transaction ${item.id} not found in this company`);
            if (current.status === 'confirmed') { kept++; continue; }
            await prisma.bankTransactions.update({
                where: {id: current.id},
                data: {kind: item.kind, status: item.status, invoiceId: item.invoice_id, costId: item.cost_id, note: item.note},
            });
            changed++;
        }
        return json({changed, keptHumanDecisions: kept});
    });

    server.registerTool('upsert_costs', {
        description: 'Add purchase documents (invoices, bills, receipts) of a company, idempotent by external_id. '
            + 'A cost the human confirmed keeps its classification. categories: ' + COST_CATEGORIES.join(', '),
        inputSchema: {
            company_id: z.string(),
            costs: z.array(z.object({
                external_id: z.string().min(1).describe('Stable id, e.g. a hash of the source file'),
                supplier_name: z.string().min(1),
                supplier_tin: z.string().default(''),
                supplier_country: z.string().default('PL'),
                number: z.string().default(''),
                issue_date: DATE,
                sale_date: DATE.optional(),
                currency: z.string().default('PLN'),
                net: z.number(),
                vat: z.number().default(0),
                gross: z.number(),
                category: z.enum(COST_CATEGORIES).optional(),
                reverse_charge: z.boolean().optional().describe('A service bought from abroad (import of services)'),
                file: z.string().default(''),
                status: AGENT_STATUS.optional(),
                note: z.string().optional(),
            })).min(1).max(200),
        },
    }, async ({company_id, costs}) => {
        await requireCompany(ctx, company_id);
        const ids: Record<string, string> = {};
        for (const c of costs) {
            const key = {companyId_externalId: {companyId: company_id, externalId: c.external_id}};
            const current = await prisma.costs.findUnique({where: key, select: {status: true}});
            const facts = {supplierName: c.supplier_name, supplierTin: c.supplier_tin, supplierCountry: c.supplier_country,
                number: c.number, issueDate: c.issue_date, saleDate: c.sale_date, currency: c.currency, net: c.net,
                vat: c.vat, gross: c.gross, file: c.file};
            const data = agentUpdate(current, facts,
                {category: c.category, reverseCharge: c.reverse_charge, status: c.status, note: c.note});
            const saved = current
                ? await prisma.costs.update({where: key, data})
                : await prisma.costs.create({data: {...data, companyId: company_id, externalId: c.external_id}});
            ids[c.external_id] = saved.id;
        }
        return json({saved: Object.keys(ids).length, ids});
    });

    server.registerTool('list_costs', {
        description: 'Purchase documents of a company, newest first',
        inputSchema: {company_id: z.string(), from: DATE.optional(), to: DATE.optional(), limit: z.number().int().min(1).max(2000).default(500)},
        annotations: {readOnlyHint: true},
    }, async ({company_id, from, to, limit}) => {
        await requireCompany(ctx, company_id);
        return json(await prisma.costs.findMany({
            where: {companyId: company_id, issueDate: {gte: from, lte: to}},
            orderBy: [{issueDate: 'desc'}, {externalId: 'asc'}],
            take: limit,
        }));
    });

    server.registerTool('upsert_filings', {
        description: 'Record what the company owes the authorities (tax returns, JPK, financial statements, registrations) '
            + 'and their state, one per kind and period (idempotent). kinds: ' + FILING_KINDS.join(', ')
            + '; statuses: ' + FILING_STATUSES.join(', '),
        inputSchema: {
            company_id: z.string(),
            filings: z.array(z.object({
                kind: z.enum(FILING_KINDS),
                period: z.string().default('').describe('"2025" for a year, "2025-09" for a month, "" for none'),
                authority: z.enum(['US', 'KRS', 'ZUS', 'other']).default('US'),
                due_date: DATE.optional(),
                status: z.enum(FILING_STATUSES),
                filed_at: DATE.optional(),
                reference: z.string().optional().describe('UPO number or another proof'),
                amount: z.number().optional().describe('Tax to pay, PLN'),
                note: z.string().optional(),
            })).min(1).max(200),
        },
    }, async ({company_id, filings}) => {
        await requireCompany(ctx, company_id);
        for (const f of filings) {
            const externalId = `${f.kind}:${f.period}`;
            const data = {kind: f.kind, period: f.period, authority: f.authority, dueDate: f.due_date, status: f.status,
                filedAt: f.filed_at, reference: f.reference, amount: f.amount, note: f.note};
            await prisma.filings.upsert({
                where: {companyId_externalId: {companyId: company_id, externalId}},
                create: {...data, companyId: company_id, externalId},
                update: data,
            });
        }
        return json({saved: filings.length});
    });

    server.registerTool('list_filings', {
        description: 'Tax returns, JPK files, financial statements and registrations of a company with their state',
        inputSchema: {company_id: z.string()},
        annotations: {readOnlyHint: true},
    }, async ({company_id}) => {
        await requireCompany(ctx, company_id);
        return json(await prisma.filings.findMany({where: {companyId: company_id}, orderBy: [{dueDate: 'asc'}, {externalId: 'asc'}]}));
    });

    server.registerTool('record_issued_invoice', {
        description: 'Record a sales invoice issued in the past outside KSeF (another program, before KSeF applied), '
            + 'as it was issued. It is final and never sent to KSeF. Idempotent by number within the company.',
        inputSchema: {
            company_id: z.string(),
            ...invoiceFields,
            paid: z.number().min(0).default(0),
            payment_date: DATE.optional(),
        },
    }, async ({company_id, paid, payment_date, ...input}) => {
        const company = await requireCompany(ctx, company_id);
        const client = await prisma.clients.findFirst({where: {id: input.client_id, companyId: company_id}});
        if (!client) throw new Error('Client not found in this company');
        const data = {
            companyId: company_id,
            clientId: client.id,
            number: input.number,
            issueDate: input.issue_date,
            saleDate: input.sale_date ?? input.issue_date,
            deadlineDate: input.deadline_date ?? dayjs(input.issue_date).add(14, 'day').format('YYYY-MM-DD'),
            issuePlace: input.issue_place || company.defaultIssuePlace,
            currency: getCurrency(input.currency),
            lang: getLanguage(input.lang),
            paymentForm: getPaymentForm(input.payment_form),
            items: items(input.items),
            issuerName: input.issuer_name || company.defaultIssuerName || ctx.user.full_name,
            bankAccountNumber: input.bank_account_number,
            publicNote: input.public_note,
            privateNote: input.private_note,
            paid,
            paymentDate: payment_date,
            livemode: true,
            outsideKsef: true,
        };
        const existing = await prisma.invoices.findFirst({where: {companyId: company_id, number: input.number, livemode: true}});
        if (existing && !existing.outsideKsef) throw new Error(`Invoice ${input.number} already exists and was not recorded as historical`);
        const invoice = existing
            ? await prisma.invoices.update({where: {id: existing.id}, data, include: {client: true}})
            : await prisma.invoices.create({data, include: {client: true}});
        return json(agentInvoice(invoice));
    });

    server.registerTool('create_invoice_draft', {
        description: 'Create an invoice draft. It is not sent anywhere; the user sees it in the app marked as made by '
            + 'this agent. With test_mode it is a test invoice, visible in the test mode of the app.',
        inputSchema: {
            company_id: z.string(),
            test_mode: z.boolean().default(false).describe('Test invoice: no legal effect, can go only to KSeF DEMO'),
            ...invoiceFields,
        },
    }, async ({company_id, test_mode, ...input}) => {
        const company = await requireCompany(ctx, company_id);
        const client = await prisma.clients.findFirst({where: {id: input.client_id, companyId: company_id}});
        if (!client) throw new Error('Client not found in this company');
        const invoice = await prisma.invoices.create({
            data: {
                companyId: company_id,
                clientId: client.id,
                number: input.number,
                issueDate: input.issue_date,
                saleDate: input.sale_date ?? input.issue_date,
                deadlineDate: input.deadline_date ?? dayjs(input.issue_date).add(14, 'day').format('YYYY-MM-DD'),
                issuePlace: input.issue_place || company.defaultIssuePlace,
                currency: getCurrency(input.currency),
                lang: getLanguage(input.lang),
                paymentForm: getPaymentForm(input.payment_form),
                items: items(input.items),
                issuerName: input.issuer_name || company.defaultIssuerName || ctx.user.full_name,
                bankAccountNumber: input.bank_account_number || company.defaultBankAccountNumber,
                publicNote: input.public_note || company.defaultPublicNote,
                privateNote: input.private_note,
                paid: 0,
                createdByAgent: ctx.keyName,
                livemode: !test_mode,
            },
            include: {client: true},
        });
        return json(agentInvoice(invoice));
    });

    server.registerTool('update_invoice_draft', {
        description: 'Change an invoice that is not in KSeF yet. Only the given fields change; items replace all items.',
        inputSchema: {
            company_id: z.string(),
            invoice_id: z.string(),
            ...Object.fromEntries(Object.entries(invoiceFields).map(([key, schema]) => [key, schema.optional()])) as {
                [K in keyof typeof invoiceFields]: z.ZodOptional<(typeof invoiceFields)[K]>
            },
        },
    }, async ({company_id, invoice_id, ...input}) => {
        await requireCompany(ctx, company_id);
        await requireDraft(company_id, invoice_id);
        if (input.client_id) {
            const client = await prisma.clients.findFirst({where: {id: input.client_id, companyId: company_id}});
            if (!client) throw new Error('Client not found in this company');
        }
        const invoice = await prisma.invoices.update({
            where: {id: invoice_id},
            data: {
                clientId: input.client_id,
                number: input.number,
                issueDate: input.issue_date,
                saleDate: input.sale_date,
                deadlineDate: input.deadline_date,
                issuePlace: input.issue_place,
                currency: input.currency && getCurrency(input.currency),
                lang: input.lang && getLanguage(input.lang),
                paymentForm: input.payment_form && getPaymentForm(input.payment_form),
                items: input.items && items(input.items),
                issuerName: input.issuer_name,
                bankAccountNumber: input.bank_account_number,
                publicNote: input.public_note,
                privateNote: input.private_note,
                // the human approves what is there now, an older request does not cover the changed invoice
                ksefSendRequestedAt: null,
                ksefSendRequestedBy: null,
                ksefSendRequestNote: null,
            },
            include: {client: true},
        });
        return json(agentInvoice(invoice));
    });

    server.registerTool('validate_ksef_invoice', {
        description: 'Build the KSeF FA(3) XML of a draft and validate it against the XSD, without sending anything',
        inputSchema: {company_id: z.string(), invoice_id: z.string()},
        annotations: {readOnlyHint: true},
    }, async ({company_id, invoice_id}) => {
        await requireCompany(ctx, company_id);
        const invoice = await requireDraft(company_id, invoice_id);
        return json({valid: true, xml: buildFa3(invoice)});
    });

    server.registerTool('request_ksef_send', {
        description: 'Ask the user to send a draft to production KSeF. Nothing is sent now: the user sees the request '
            + 'in the app and approves (sends) or dismisses it. Changing the draft afterwards cancels the request.',
        inputSchema: {
            company_id: z.string(),
            invoice_id: z.string(),
            note: z.string().default('').describe('Why or what to check, shown to the user next to the request'),
        },
    }, async ({company_id, invoice_id, note}) => {
        const company = await requireCompany(ctx, company_id);
        const invoice = await requireDraft(company_id, invoice_id);
        if (!invoice.livemode) throw new Error('This is a test mode invoice, send it to KSeF DEMO with send_to_ksef_demo');
        if (invoice.outsideKsef) throw new Error('This invoice was issued outside KSeF, it is never sent');
        if (!company.ksefTokenEnc) {
            throw new Error('Production KSeF is not connected for this company, ask the user to connect it');
        }
        buildFa3(invoice); // invalid invoices are rejected here, not after the human clicks
        const updated = await prisma.invoices.update({
            where: {id: invoice.id},
            data: {ksefSendRequestedAt: new Date(), ksefSendRequestedBy: ctx.keyName, ksefSendRequestNote: note},
            include: {client: true},
        });
        return json({
            requested: true,
            message: `Invoice ${updated.number} waits for the user to approve it in the app. It is NOT in KSeF yet.`,
            invoice: agentInvoice(updated),
        });
    });

    server.registerTool('send_to_ksef_demo', {
        description: 'Send a test mode invoice to KSeF DEMO (pre-production, no legal effect) to check it is accepted',
        inputSchema: {company_id: z.string(), invoice_id: z.string()},
        annotations: {openWorldHint: true},
    }, async ({company_id, invoice_id}) => {
        await requireCompany(ctx, company_id);
        const invoice = await requireDraft(company_id, invoice_id);
        if (invoice.livemode) {
            throw new Error('This is a live invoice, it can only go to production KSeF through request_ksef_send');
        }
        return json(agentInvoice(await sendStoredInvoice(invoice_id, company_id)));
    });

    return server;
}
