import {KSeFInvoiceRejectedError} from "ksef-client-ts";
import {prisma} from "../../db";
import {getErrorMessage} from "../../helpers/getErrorMessage";
import {buildFa3} from "./buildFa3";
import {envForLivemode, sendInvoiceToKsef} from "./ksef";

export type SendFailure = 'notFound' | 'conflict' | 'invalid' | 'rejected' | 'unavailable';

export class SendInvoiceError extends Error {
    constructor(message: string, public readonly kind: SendFailure) {
        super(message);
    }
}

// Sends an invoice to KSeF and stores the result. The environment follows the invoice, never the request:
// live invoices go only to production, test mode invoices only to DEMO.
export async function sendStoredInvoice(invoiceId: string, companyId: string) {
    const invoice = await prisma.invoices.findFirst({
        where: {id: invoiceId, companyId},
        include: {company: true, client: true},
    });

    if (!invoice) throw new SendInvoiceError('Invoice not found', 'notFound');
    if (invoice.ksefNumber) throw new SendInvoiceError(`Invoice is already in KSeF as ${invoice.ksefNumber}`, 'conflict');
    if (invoice.outsideKsef) throw new SendInvoiceError('Invoice was issued outside KSeF (before it applied), it is never sent', 'conflict');

    let xml: string;
    try {
        xml = buildFa3(invoice);
    } catch (error) {
        throw new SendInvoiceError(getErrorMessage(error), 'invalid');
    }

    try {
        const env = envForLivemode(invoice.livemode);
        const {status, qrUrl} = await sendInvoiceToKsef(invoice.company, env, xml, invoice.issueDate);
        return await prisma.invoices.update({
            where: {id: invoice.id},
            data: {
                ksefEnv: env,
                ksefStatus: 'Accepted',
                ksefNumber: status.ksefNumber,
                ksefReferenceNumber: status.referenceNumber,
                ksefSentAt: new Date(),
                ksefXml: xml,
                ksefQrUrl: qrUrl,
                ksefError: null,
                ksefSendRequestedAt: null,
                ksefSendRequestedBy: null,
                ksefSendRequestNote: null,
            },
            include: {client: true},
        });
    } catch (error) {
        const rejected = error instanceof KSeFInvoiceRejectedError;
        const message = getErrorMessage(error);
        await prisma.invoices.update({
            where: {id: invoice.id},
            data: {ksefStatus: rejected ? 'Rejected' : invoice.ksefStatus, ksefError: message},
        });
        throw new SendInvoiceError(message, rejected ? 'rejected' : 'unavailable');
    }
}
