import {ref} from "vue";
import {defineStore} from "pinia";
import {useUserStore} from "~/store/user";

export interface Company {
    name: string,
    address: string,
    info: string,
    logo: string,
    signature: string,
}

export const useCompanyStore = defineStore('companyStore', (): {
    company: Ref<Company>,
    getCompany: () => Promise<void>
    setCompany: (company: Partial<Company>) => Promise<void>
} => {
    const company = ref<Company>({
        name: '',
        address: '',
        info: '',
        logo: '',
        signature: '',
    });

    const userStore = useUserStore();

    const getCompany = async () => {
        const response = await $fetch<Company>(`${import.meta.env.VITE_API_URL}/company`, {
            headers: {
                Authorization: `Bearer ${userStore.token}`
            }
        });
        company.value = response;
    }

    const setCompany = async (companyData: Partial<Company>) => {
        const response = await $fetch<Company>(`${import.meta.env.VITE_API_URL}/company`, {
            method: 'PUT',
            body: JSON.stringify(companyData),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userStore.token}`
            }
        });
        company.value = response;
    }

    return {
        company,
        getCompany,
        setCompany
    }
}, {
    persist: true
});