import {defineStore} from 'pinia';
import {ref} from 'vue';
import {authHeaders} from "~/helpers/authHeaders";
import {apiFetch} from "~/helpers/apiFetch";
import {apiErrorMessage} from "~/helpers/apiErrorMessage";

export interface AgentKey {
    id: string;
    name: string;
    prefix: string;
    createdAt: string;
    lastUsedAt: string | null;
}

const api = (path: string) => `${import.meta.env.VITE_API_URL}${path}`;

async function call<T>(path: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    try {
        return await apiFetch<T>(api(path), {...options, headers: authHeaders()});
    } catch (error) {
        throw new Error(apiErrorMessage(error));
    }
}

export const useAgentKeysStore = defineStore('agentKeysStore', () => {
    const keys = ref<AgentKey[]>([]);

    const getKeys = async () => {
        keys.value = await call<AgentKey[]>('/agent-keys');
    }

    // returns the plain key, the server never shows it again
    const createKey = async (name: string): Promise<string> => {
        const {key, ...created} = await call<AgentKey & { key: string }>('/agent-keys', {method: 'POST', body: {name}});
        keys.value.unshift(created);
        return key;
    }

    const deleteKey = async (id: string) => {
        await call(`/agent-keys/${id}`, {method: 'DELETE'});
        keys.value = keys.value.filter(key => key.id !== id);
    }

    return {keys, getKeys, createKey, deleteKey};
});
