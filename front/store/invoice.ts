import { ref } from "vue";
import { defineStore } from "pinia";
import type { Invoice } from "~/interfaces/Invoice";
import { useUserStore } from "~/store/user";
import { paymentForms } from "~/helpers/paymentForms";

export const useInvoiceStore = defineStore('invoiceStore', (): {
    invoices: Ref<Invoice[]>,
    invoice: Ref<Invoice | null>,
    getInvoices: () => Promise<void>
    addInvoice: (client: Partial<Invoice>) => Promise<void>
    updateInvoice: (client: Partial<Invoice> & { id: string }) => Promise<void>
    deleteInvoice: (id: string) => Promise<void>
    sendKsef: (id: string) => Promise<void>
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
        invoices.value = response.map((invoice: any) => ({
            ...invoice,
            paymentForm: paymentForms.find(p => p.key === invoice.paymentForm || (p.key === '14d' && invoice.paymentForm === 'd14') || (p.key === '7d' && invoice.paymentForm === 'd7'))
        }));
    }

    const addInvoice = async (invoiceData: Partial<Invoice>) => {
        if (!invoiceData.client) throw new Error('No client');

        const response = await $fetch<any>(`${import.meta.env.VITE_API_URL}/invoices`, {
            method: 'POST',
            body: JSON.stringify({
                ...invoiceData,
                clientId: invoiceData.client.id,
                paymentForm: invoiceData.paymentForm?.key,
            }),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userStore.token}`
            }
        });
        invoices.value.push({
            ...response,
            paymentForm: paymentForms.find(p => p.key === response.paymentForm)
        });
    }

    const updateInvoice = async (invoiceData: Partial<Invoice> & { id: string }) => {
        if (!invoiceData.client) throw new Error('No client');

        const response = await $fetch<any>(`${import.meta.env.VITE_API_URL}/invoices/${invoiceData.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...invoiceData,
                clientId: invoiceData.client.id,
                paymentForm: invoiceData.paymentForm?.key,
            }),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userStore.token}`
            }
        });
        invoices.value.splice(invoices.value.findIndex(invoice => invoice.id === invoiceData.id), 1, {
            ...response,
            paymentForm: paymentForms.find(p => p.key === response.paymentForm)
        });
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

    const sendKsef = async (id: string) => {
        await $fetch(`${import.meta.env.VITE_API_URL}/invoices/${id}/ksef`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${userStore.token}`
            }
        });
        await getInvoices();
    }

    return {
        invoices,
        invoice,
        getInvoices,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        sendKsef
    }
}, {
    persist: true,
})