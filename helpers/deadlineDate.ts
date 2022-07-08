import {invoice} from "~/store";
import dayjs from "dayjs";

export function deadlineDate(issueDate, paymentForm): string {
    switch (paymentForm) {
        case '14d':
            return dayjs(dayjs(invoice.value.issueDate)).add(14, 'days').format('YYYY-MM-DD');
        case '7d':
            return dayjs(dayjs(invoice.value.issueDate)).add(7, 'days').format('YYYY-MM-DD');
        default:
            return dayjs(dayjs(invoice.value.issueDate)).add(0, 'days').format('YYYY-MM-DD');
    }
}