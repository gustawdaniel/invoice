import dayjs from "dayjs";
import {invoices} from "~/store";

export function nextInvoiceNumber(issueDate: string): string {
    const yearMonth = dayjs(issueDate).format('YYYY-MM');
    const number = invoices.value.filter(inv => inv.issueDate.startsWith(yearMonth)).length
    return `${String(number + 1).padStart(4, '0')}/${dayjs(issueDate).format('MM/YYYY')}`;
}
