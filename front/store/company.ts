import {ref, computed} from "vue";
import {defineStore} from "pinia";
import {authHeaders} from "~/helpers/authHeaders";
import {apiErrorMessage} from "~/helpers/apiErrorMessage";

export type Country = 'GE' | 'PL';
export type KsefEnv = 'test' | 'prod';

export interface Company {
    id: string,
    name: string,
    tin: string,
    address: string,
    info: string,
    logo: string,
    signature: string,
    country: Country,
    ksefEnv: KsefEnv | null,
    ksefConnected: boolean,
    vatExemptionBasis: string,
}

function emptyCompany(): Company {
    return {
        id: '', name: '', tin: '', address: '', info: '', logo: '', signature: '',
        country: 'GE', ksefEnv: null, ksefConnected: false, vatExemptionBasis: '',
    };
}

const api = (path: string) => `${import.meta.env.VITE_API_URL}${path}`;

async function call<T>(path: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    try {
        return await $fetch<T>(api(path), {...options, headers: {...authHeaders(), ...(options.headers as object)}});
    } catch (error) {
        throw new Error(apiErrorMessage(error));
    }
}

export const useCompanyStore = defineStore('companyStore', () => {
    const company = ref<Company>(emptyCompany());
    const companies = ref<Company[]>([]);
    // null = default company of the user
    const activeCompanyId = ref<string | null>(null);

    // KSeF is used only by Polish companies with a selected environment
    const usesKsef = computed(() => company.value.country === 'PL' && Boolean(company.value.ksefEnv));

    const getCompany = async () => {
        company.value = await call<Company>('/company');
    }

    const getCompanies = async () => {
        companies.value = await call<Company[]>('/companies');
        if (activeCompanyId.value && !companies.value.some(c => c.id === activeCompanyId.value)) {
            activeCompanyId.value = null;
        }
    }

    const selectCompany = async (id: string) => {
        activeCompanyId.value = id;
        await getCompany();
    }

    const addCompany = async (data: { name: string, country: Country }) => {
        const created = await call<Company>('/companies', {method: 'POST', body: data});
        companies.value.push(created);
        await selectCompany(created.id);
    }

    const replace = (updated: Company) => {
        company.value = updated;
        companies.value.splice(companies.value.findIndex(c => c.id === updated.id), 1, updated);
    }

    const setCompany = async (companyData: Partial<Company>) => {
        replace(await call<Company>('/company', {method: 'PUT', body: companyData}));
    }

    const connectKsefTest = async () => {
        replace(await call<Company>('/company/ksef/test-connect', {method: 'POST'}));
    }

    // XML with a 10 minute challenge, to be signed with Profil Zaufany
    const getKsefAuthRequest = async (): Promise<string> => {
        return await call<string>('/company/ksef/auth-request', {responseType: 'text'});
    }

    const sendKsefSignedRequest = async (signedXml: string) => {
        replace(await call<Company>('/company/ksef/auth-signed', {method: 'POST', body: {signedXml}}));
    }

    const disconnectKsef = async () => {
        replace(await call<Company>('/company/ksef', {method: 'DELETE'}));
    }

    return {
        company,
        companies,
        activeCompanyId,
        usesKsef,
        getCompany,
        getCompanies,
        selectCompany,
        addCompany,
        setCompany,
        connectKsefTest,
        getKsefAuthRequest,
        sendKsefSignedRequest,
        disconnectKsef,
    }
}, {
    persist: true
});
