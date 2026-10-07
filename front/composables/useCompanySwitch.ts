import {useCompanyStore, type Country} from "~/store/company";
import {useClientStore} from "~/store/client";
import {useInvoiceStore} from "~/store/invoice";

// Switching the selected company must also swap its clients and invoices
export function useCompanySwitch() {
    const companyStore = useCompanyStore();
    const clientStore = useClientStore();
    const invoiceStore = useInvoiceStore();

    async function reloadCompanyData() {
        invoiceStore.invoice = null;
        invoiceStore.invoices = [];
        clientStore.clients = [];
        await Promise.all([clientStore.getClients(), invoiceStore.getInvoices()]);
    }

    async function switchCompany(id: string) {
        await companyStore.selectCompany(id);
        await reloadCompanyData();
    }

    async function createCompany(name: string, country: Country) {
        await companyStore.addCompany({name, country});
        await reloadCompanyData();
    }

    return {switchCompany, createCompany};
}
