import {useSettings} from "~/composables/useSettings";
import {useClient} from "~/composables/useClient";
import {useInvoice} from "~/composables/useInvoice";
import {computed} from "vue";

const {settings} = useSettings();
const {clients} = useClient();
const {invoice, invoices} = useInvoice();

const subTotal = computed<number>(() => invoice.value.items.reduce((prev, item) => prev + item.quantity * item.priceNet, 0));
const tax = computed<number>(() => invoice.value.items.reduce((prev, item) => prev + item.quantity * item.priceNet * item.vat.value, 0));
const total = computed<number>(() => subTotal.value + tax.value)

export {
    settings,
    clients,
    invoice,
    invoices,

    subTotal,
    tax,
    total
};
