import type { Invoice } from "~/interfaces/Invoice";
import dayjs from "dayjs";
import { paymentForms } from "~/helpers/paymentForms";
import { useInvoiceStore } from "~/store/invoice";
import { useCompanyStore } from "~/store/company";

// Seller-side defaults come from the company settings, then from the latest invoice of the selected company
export function defaultInvoice(): Invoice {
    const invoiceStore = useInvoiceStore();
    const company = useCompanyStore().company;
    const previous = [...invoiceStore.invoices]
        .sort((a, b) => b.issueDate.localeCompare(a.issueDate))[0];

    return {
        id: '',
        type: 'invoice',
        number: '',
        client: { id: '', name: '', tin: '', post: '', city: '', street: '' },
        issueDate: dayjs().format('YYYY-MM-DD'), // YYYY-MM-DD
        saleDate: dayjs().format('YYYY-MM-DD'),
        deadlineDate: dayjs().add(14, 'days').format('YYYY-MM-DD'),
        issuePlace: company.defaultIssuePlace || (previous?.issuePlace ?? ''),
        currency: previous?.currency ?? 'PLN',
        lang: previous?.lang ?? 'pl',
        paymentForm: previous?.paymentForm ?? paymentForms[2],
        items: [],
        issuerName: company.defaultIssuerName || (previous?.issuerName ?? ''),
        bankAccountNumber: company.defaultBankAccountNumber || (previous?.bankAccountNumber ?? ''),
        publicNote: company.defaultPublicNote || (previous?.publicNote ?? ''),
        privateNote: '',
    }
}
