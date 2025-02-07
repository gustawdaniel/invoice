import {beforeAll, describe, expect, it} from "@jest/globals";
import {exchange} from "~/helpers/total";
import dayjs from "dayjs";
import { setActivePinia, createPinia } from 'pinia'
import {useExchangeStore} from "~/store/exchange";

describe('exchange', () => {
    beforeAll(() => {
        setActivePinia(createPinia());

        useExchangeStore().latestExchangeRate = {
            date: dayjs().format('YYYY-MM-DD'),
            base: 'EUR',
            rates: {
                PLN: 4.46,
                USD: 1.12,
                EUR: 1,
                GBP: 0.85
            }
        }
    })

    it('from pln to pln', () => {
        expect(exchange(1, 'PLN', 'PLN')).toEqual(1)
    })

    it('from pln to eur', () => {
        expect(exchange(1, 'PLN', 'EUR')).toEqual(1 / 4.46)
    })

    it('from eur to pln', () => {
        expect(exchange(1, 'EUR', 'PLN')).toEqual(4.46)
    })

    it('from eur to usd', () => {
        expect(exchange(1, 'EUR', "USD")).toEqual(1.12)
    })

    it('from pln to usd', () => {
        expect(exchange(1, 'PLN', "USD")).toEqual(1.12/4.46)
    })
})
