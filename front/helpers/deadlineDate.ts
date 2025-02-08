import dayjs from "dayjs";
import {useInvoiceStore} from "~/store/invoice";

export function deadlineDate(issueDate: unknown, paymentForm: unknown): string {
    const invoiceStore = useInvoiceStore();
    if(!invoiceStore.invoice) {
        return '';
    }

    switch (paymentForm) {
        case '14d':
            return dayjs(dayjs(invoiceStore.invoice.issueDate)).add(14, 'days').format('YYYY-MM-DD');
        case '7d':
            return dayjs(dayjs(invoiceStore.invoice.issueDate)).add(7, 'days').format('YYYY-MM-DD');
        default:
            return dayjs(dayjs(invoiceStore.invoice.issueDate)).add(0, 'days').format('YYYY-MM-DD');
    }
}