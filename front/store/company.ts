import {ref, computed} from "vue";
import {defineStore} from "pinia";
import {authHeaders} from "~/helpers/authHeaders";
import {apiFetch} from "~/helpers/apiFetch";
import {apiErrorMessage} from "~/helpers/apiErrorMessage";

export type Country = 'GE' | 'PL';
// prod: production KSeF (live mode), demo: KSeF DEMO (test mode, no legal effect)
export type KsefEnv = 'prod' | 'demo';

export interface Company {
    id: string,
    name: string,
    tin: string,
    address: string,
    info: string,
    logo: string,
    signature: string,
    country: Country,
    ksefConnected: boolean,
    ksefDemoConnected: boolean,
    vatExemptionBasis: string,
    // prefilled on new invoices
    defaultIssuePlace: string,
    defaultIssuerName: string,
    defaultBankAccountNumber: string,
    defaultPublicNote: string,
}

function emptyCompany(): Company {
    return {
        id: '', name: '', tin: '', address: '', info: '', logo: '', signature: '',
        country: 'GE', ksefConnected: false, ksefDemoConnected: false, vatExemptionBasis: '',
        defaultIssuePlace: '', defaultIssuerName: '', defaultBankAccountNumber: '', defaultPublicNote: '',
    };
}

const api = (path: string) => `${import.meta.env.VITE_API_URL}${path}`;

async function call<T>(path: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    try {
        return await apiFetch<T>(api(path), {...options, headers: {...authHeaders(), ...(options.headers as object)}});
    } catch (error) {
        throw new Error(apiErrorMessage(error));
    }
}

export const useCompanyStore = defineStore('companyStore', () => {
    const company = ref<Company>(emptyCompany());
    const companies = ref<Company[]>([]);
    // null = default company of the user
    const activeCompanyId = ref<string | null>(null);

    // like Stripe: test mode shows only test invoices and sends them to KSeF DEMO, live mode is the real thing
    const testMode = ref(false);
    const ksefEnv = computed<KsefEnv>(() => testMode.value ? 'demo' : 'prod');

    // KSeF is used by Polish companies; connected = connected in the environment of the current mode
    const usesKsef = computed(() => company.value.country === 'PL');
    const ksefConnected = computed(() =>
        testMode.value ? company.value.ksefDemoConnected : company.value.ksefConnected);

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

    // XML with a 10 minute challenge, to be signed with Profil Zaufany
    const getKsefAuthRequest = async (env: KsefEnv): Promise<string> => {
        return await call<string>(`/company/ksef/${env}/auth-request`, {responseType: 'text'});
    }

    const sendKsefSignedRequest = async (env: KsefEnv, signedXml: string) => {
        replace(await call<Company>(`/company/ksef/${env}/auth-signed`, {method: 'POST', body: {signedXml}}));
    }

    const connectKsefWithToken = async (env: KsefEnv, token: string) => {
        replace(await call<Company>(`/company/ksef/${env}/token`, {method: 'POST', body: {token}}));
    }

    const disconnectKsef = async (env: KsefEnv) => {
        replace(await call<Company>(`/company/ksef/${env}`, {method: 'DELETE'}));
    }

    return {
        company,
        companies,
        activeCompanyId,
        testMode,
        ksefEnv,
        usesKsef,
        ksefConnected,
        getCompany,
        getCompanies,
        selectCompany,
        addCompany,
        setCompany,
        getKsefAuthRequest,
        sendKsefSignedRequest,
        connectKsefWithToken,
        disconnectKsef,
    }
}, {
    persist: true
});
