import {ref} from "vue";
import type {Currency} from "~/interfaces/Invoice";

interface ExchangeRate {
    base: 'EUR',
    date: string,
    rates: Record<Currency, number>
}

export function useSettings() {
    let settings = ref<{ exchanges: ExchangeRate[] }>({
        exchanges: [],
    })

    return {
        settings
    }
}
