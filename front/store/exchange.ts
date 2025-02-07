import {defineStore} from "pinia";
import type {Currency} from "~/interfaces/Invoice";
import {useUserStore} from "~/store/user";
import {ref} from 'vue';

interface ExchangeRate {
    base: 'EUR',
    date: string,
    rates: Record<Currency, number>
}

interface ExchangeRateResponse {
    EUR: number;
    USD: number;
    PLN: number;
    GBP: number;
    id: string;
    date: string;
    createdAt: string; // Date
}

export const useExchangeStore = defineStore('exchangeStore', (): {
    exchanges: Ref<ExchangeRate[]>,
    latestExchangeRate: Ref<ExchangeRate | null>,
    fetchExchanges: () => Promise<void>
    syncLatestExchangeRate: () => Promise<void>
} => {
    const exchanges = ref<ExchangeRate[]>([]);
    const latestExchangeRate = ref<ExchangeRate | null>(null);
    const userStore = useUserStore();

    const fetchExchanges = async () => {
        const response = await $fetch<ExchangeRateResponse[]>(
            `${import.meta.env.VITE_API_URL}/exchange-rates`, {
                headers: {
                    Authorization: `Bearer ${userStore.token}`,
                }
            });

        exchanges.value = response.map((exchange) => ({
            base: 'EUR',
            rates: {
                EUR: exchange.EUR,
                USD: exchange.USD,
                PLN: exchange.PLN,
                GBP: exchange.GBP,
            },
            date: exchange.date,
        }));
    }

    const syncLatestExchangeRate = async () => {
        const today = new Date().toISOString().split('T')[0];
        if(latestExchangeRate.value?.date === today) return;

        const response = await $fetch<ExchangeRateResponse>(
            `${import.meta.env.VITE_API_URL}/sync-exchange-rates`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${userStore.token}`,
                }
            });

        latestExchangeRate.value = {
            base: 'EUR',
            rates: {
                EUR: response.EUR,
                USD: response.USD,
                PLN: response.PLN,
                GBP: response.GBP,
            },
            date: response.date,
        };
    }

    return {
        exchanges,
        latestExchangeRate,
        fetchExchanges,
        syncLatestExchangeRate,
    }
}, {
    persist: true
})