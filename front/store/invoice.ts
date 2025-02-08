import {ref} from "vue";
import {defineStore} from "pinia";
import type { Invoice } from "~/interfaces/Invoice";
import {useUserStore} from "~/store/user";

export const useInvoiceStore = defineStore('invoiceStore', (): {
    invoices: Ref<Invoice[]>,
    invoice: Ref<Invoice | null>,
    getInvoices: () => Promise<void>
    addInvoice: (client: Partial<Invoice>) => Promise<void>
    updateInvoice: (client: Partial<Invoice> & { id: string }) => Promise<void>
    deleteInvoice: (id: string) => Promise<void>
} => {
    const invoices = ref<Invoice[]>([]);
    const invoice = ref<Invoice | null>(null);
    const userStore = useUserStore();

    const getInvoices = async () => {
        const response = await $fetch<Invoice[]>(`${import.meta.env.VITE_API_URL}/invoices`, {
            headers: {
                Authorization: `Bearer ${userStore.token}`
            }
        });
        invoices.value = response;
    }

    const addInvoice = async (invoiceData: Partial<Invoice>) => {
        const response = await $fetch<Invoice>(`${import.meta.env.VITE_API_URL}/invoices`, {
            method: 'POST',
            body: JSON.stringify(invoiceData),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userStore.token}`
            }
        });
        invoices.value.push(response);
    }

    const updateInvoice = async (invoiceData: Partial<Invoice> & { id: string }) => {
        const response = await $fetch<Invoice>(`${import.meta.env.VITE_API_URL}/invoices/${invoiceData.id}`, {
            method: 'PUT',
            body: JSON.stringify(invoiceData),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userStore.token}`
            }
        });
        invoices.value.splice(invoices.value.findIndex(invoice => invoice.id === invoiceData.id), 1, response);
    }

    const deleteInvoice = async (id: string) => {
        const response = await $fetch<Invoice>(`${import.meta.env.VITE_API_URL}/invoices/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${userStore.token}`
            }
        });
        invoices.value.splice(invoices.value.findIndex(invoice => invoice.id === id), 1);
    }

    return {
        invoices,
        invoice,
        getInvoices,
        addInvoice,
        updateInvoice,
        deleteInvoice
    }
},{
    persist: true,
})