import type { Invoice, InvoiceStatus } from "~/interfaces/Invoice";
import dayjs from "dayjs";

export function status(invoice: Invoice): InvoiceStatus {
    if (invoice.wasCancelled) return 'cancelled'
    if (invoice.paid) return 'paid'
    if (invoice.wasSend && dayjs(invoice.deadlineDate).diff(dayjs()) < 0) return 'overdue'
    if (invoice.wasSend) return 'send'
    if (invoice.wasPrinted) return 'printed'
    return 'draft'
}