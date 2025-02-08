function numberWithSpaces(x: string) {
    const parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return parts.join(".");
}

import {useInvoiceStore} from "~/store/invoice";

export const displayCurrency = (value: number) => {
    const invoiceStore = useInvoiceStore();
    if(!invoiceStore.invoice) {
        return '';
    }
    return `${numberWithSpaces(value.toFixed(2))} ${invoiceStore.invoice.currency.toUpperCase()}`
}