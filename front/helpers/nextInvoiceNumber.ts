import dayjs from "dayjs";
import {useInvoiceStore} from "~/store/invoice";

export function nextInvoiceNumber(issueDate: string): string {
    const invoiceStore = useInvoiceStore();

    const yearMonth = dayjs(issueDate).format('YYYY-MM');
    const number = invoiceStore.invoices.filter(inv => inv.issueDate.startsWith(yearMonth)).length
    return `${String(number + 1).padStart(4, '0')}/${dayjs(issueDate).format('MM/YYYY')}`;
}
