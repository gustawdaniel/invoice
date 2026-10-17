import {authHeaders} from "~/helpers/authHeaders";
import {apiErrorMessage} from "~/helpers/apiErrorMessage";

export interface NipLookup {
    nip: string,
    name: string,
    street: string,
    post: string,
    city: string,
    address: string,
    statusVat: string,
}

// Polish taxpayer data from the MF White List (limited to ~10 lookups a day)
export async function lookupNip(nip: string): Promise<NipLookup> {
    try {
        return await $fetch<NipLookup>(`${import.meta.env.VITE_API_URL}/lookup/nip/${encodeURIComponent(nip.replace(/\D/g, ''))}`, {
            headers: authHeaders(),
        });
    } catch (error) {
        throw new Error(apiErrorMessage(error));
    }
}
