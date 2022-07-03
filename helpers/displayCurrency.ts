function numberWithSpaces(x: string) {
    const parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return parts.join(".");
}

import {invoice} from "~/store";

export const displayCurrency = (value: number) => `${numberWithSpaces(value.toFixed(2))} ${invoice.value.currency.toUpperCase()}`