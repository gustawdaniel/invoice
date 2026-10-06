import {ref} from "vue";
import {defineStore} from "pinia";
import {authHeaders} from "~/helpers/authHeaders";

interface Client {
    id: string,
    name: string,
    street: string,
    post: string,
    city: string,
    tin: string,
    country: string,
    tinName: string,
}

export const useClientStore = defineStore('clientStore', (): {
    clients: Ref<Client[]>,
    getClients: () => Promise<void>
    addClient: (client: Partial<Client>) => Promise<void>
    updateClient: (client: Partial<Client> & { id: string }) => Promise<void>
    deleteClient: (id: string) => Promise<void>
} => {
    const clients = ref<Client[]>([]);

    const getClients = async () => {
        const response = await $fetch<Client[]>(`${import.meta.env.VITE_API_URL}/clients`, {
            headers: {
                ...authHeaders()
            }
        });
        clients.value = response;
    }

    const addClient = async (clientData: Partial<Client>) => {
        const response = await $fetch<Client>(`${import.meta.env.VITE_API_URL}/clients`, {
            method: 'POST',
            body: JSON.stringify(clientData),
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
            }
        });
        clients.value.push(response);
    }

    const updateClient = async (clientData: Partial<Client> & { id: string }) => {
        const response = await $fetch<Client>(`${import.meta.env.VITE_API_URL}/clients/${clientData.id}`, {
            method: 'PUT',
            body: JSON.stringify(clientData),
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
            }
        });
        clients.value.splice(clients.value.findIndex(client => client.id === clientData.id), 1, response);
    }

    const deleteClient = async (id: string) => {
        const response = await $fetch<Client>(`${import.meta.env.VITE_API_URL}/clients/${id}`, {
            method: 'DELETE',
            headers: {
                ...authHeaders()
            }
        });
        clients.value.splice(clients.value.findIndex(client => client.id === id), 1);
    }

    return {
        clients,
        getClients,
        addClient,
        updateClient,
        deleteClient
    }
}, {
    persist: true,
})