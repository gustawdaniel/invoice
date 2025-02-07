import type {Currency, Invoice} from "~/interfaces/Invoice";
import { useExchangeStore } from "~/store/exchange";

export function paid(invoice: Pick<Invoice, "paid" | "currency">): number {
    return Number.isFinite(invoice.paid) ? Number(invoice.paid) : 0;
}

export function total(invoice: Invoice): number {
    const subTotal = invoice.items.reduce((prev, item) => prev + item.quantity * item.priceNet, 0)
    const tax = invoice.items.reduce((prev, item) => prev + item.quantity * item.priceNet * item.vat.value, 0)
    return subTotal + tax
}

export function exchange(value: number, from: Currency, to: Currency) {
    if (from === to) return value;
    const exchangeStore = useExchangeStore();
    if (!exchangeStore.latestExchangeRate) return 0;
    const rate = exchangeStore.latestExchangeRate;
    return value * rate.rates[to] / rate.rates[from]
}
