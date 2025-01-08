import {nextInvoiceNumber} from "~/helpers/nextInvoiceNumber";
import {expect} from "@jest/globals";

it('nextInvoiceNumber', () => {
    expect(nextInvoiceNumber('2023-12-01')).toEqual('0001/12/2023')
})
