import { nextInvoiceNumber } from "~/helpers/nextInvoiceNumber";
import { expect, it, beforeEach } from "vitest";
import { setActivePinia, createPinia } from 'pinia'

beforeEach(() => {
    setActivePinia(createPinia())
})

it('nextInvoiceNumber', () => {
    expect(nextInvoiceNumber('2023-12-01')).toEqual('0001/12/2023')
})
