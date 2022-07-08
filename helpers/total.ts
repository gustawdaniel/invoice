import {Invoice} from "~/interfaces/Invoice";

export function total(invoice: Invoice): number {
    const subTotal = invoice.items.reduce((prev, item) => prev + item.quantity * item.priceNet, 0)
    const tax = invoice.items.reduce((prev, item) => prev + item.quantity * item.priceNet * item.vat.value, 0)
    return subTotal + tax
}
