import {Currency, Invoice} from "~/interfaces/Invoice";
import {settings} from "~/store";

export function paid(invoice: Invoice): number {
    return Number.isFinite(invoice.paid) ? Number(invoice.paid) : 0;
}

export function total(invoice: Invoice): number {
    const subTotal = invoice.items.reduce((prev, item) => prev + item.quantity * item.priceNet, 0)
    const tax = invoice.items.reduce((prev, item) => prev + item.quantity * item.priceNet * item.vat.value, 0)
    return subTotal + tax
}

export function exchange(value: number, from: Currency, to: Currency) {
    if (from === to) return value;
    if (settings.value.exchanges.length === 0) return 0;
    const rate = settings.value.exchanges[settings.value.exchanges.length - 1];
    return value * rate.rates[to] / rate.rates[from]
}
