import {useCompany} from "~/composables/useCompany";
import {useClient} from "~/composables/useClient";
import {useInvoice} from "~/composables/useInvoice";
import {computed} from "vue";

const {company} = useCompany();
const {clients} = useClient();
const {invoice, invoices} = useInvoice();

const subTotal = computed<number>(() => invoice.value.items.reduce((prev, item) => prev + item.quantity * item.priceNet, 0));
const tax = computed<number>(() => invoice.value.items.reduce((prev, item) => prev + item.quantity * item.priceNet * item.vat.value, 0));
const total = computed<number>(() => subTotal.value + tax.value)

export {
    company,
    clients,
    invoice,
    invoices,

    subTotal,
    tax,
    total
};