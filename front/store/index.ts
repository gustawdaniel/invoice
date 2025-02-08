import {computed} from "vue";
import {useInvoiceStore} from "~/store/invoice";

const subTotal = computed<number>(() => {
    const invoiceStore = useInvoiceStore();

    return invoiceStore.invoice ? invoiceStore.invoice.items.reduce((prev, item) => prev + item.quantity * item.priceNet, 0) : 0
});
const tax = computed<number>(() => {
    const invoiceStore = useInvoiceStore();

    return invoiceStore.invoice ? invoiceStore.invoice.items.reduce((prev, item) => prev + item.quantity * item.priceNet * item.vat.value, 0) : 0
});
const total = computed<number>(() => subTotal.value + tax.value)

export {
    subTotal,
    tax,
    total
};
