import {Currency} from "@prisma/client";

export function getCurrency(currency: string):Currency {
    switch(currency) {
        case 'PLN': return Currency.PLN;
        case 'EUR': return Currency.EUR;
        case 'USD': return Currency.USD;
        case 'GBP': return Currency.GBP;
        default: throw new Error(`Currency ${currency} not found`);
    }
}