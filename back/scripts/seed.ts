import {prisma} from "../src/db";
import { Prisma} from "@prisma/client";

import db from "../../front/db.json";
import {getCurrency} from "../src/helpers/getCurrency";
import {getLanguage} from "../src/helpers/getLanguage";
import {getPaymentForm} from "../src/helpers/getPaymentForm";
import {getVatRate} from "../src/helpers/getVatRate";
import {getUnit} from "../src/helpers/getUnit";


async function main() {
    const companyId = '67a6051b2242599159b510a0';
    let index = 0;

    for (const invoice of db.invoices) {
        const client = await prisma.clients.findFirst({
            where: {
                name: invoice.client.name,
                tin: invoice.client.tin,
            }
        })

        if (!client) {
            throw new Error(`Client ${invoice.client.name} not found`)
        }

        index++;

        const currency = getCurrency(invoice.currency);
        const lang = getLanguage(invoice.lang);
        const paymentForm = getPaymentForm(invoice.paymentForm.key);

        const items: (Prisma.Without<Prisma.InvoiceItemListCreateEnvelopeInput, Prisma.InvoiceItemCreateInput> & Prisma.InvoiceItemCreateInput) | (Prisma.InvoiceItemListCreateEnvelopeInput) | Prisma.InvoiceItemCreateInput[] = [];

        for (const item of invoice.items) {
            const vatName = getVatRate(item.vat.name);
            const unit = getUnit(item.unit);

            items.push({
                name: item.name,
                quantity: item.quantity,
                priceNet: item.priceNet,
                vat: {
                    value: item.vat.value,
                    name: vatName,
                },
                unit
            })
        }

        console.log('i', invoice.id, client.id, index / db.invoices.length, currency, lang, paymentForm);


        await prisma.invoices.create({
            data: {
                companyId: companyId,
                clientId: client.id,
                number: invoice.number,
                issueDate: invoice.issueDate,
                saleDate: invoice.saleDate,
                deadlineDate: invoice.deadlineDate,
                issuePlace: invoice.issuePlace,
                currency,
                lang,
                paymentForm,
                items,
                issuerName: invoice.issuerName,
                receiverName: invoice.receiverName,
                publicNote: invoice.publicNote,
                privateNote: invoice.privateNote,
                bankAccountNumber: invoice.bankAccountNumber,
                vatBankAccountNumber: invoice.vatBankAccountNumber ?? '',
                paid: invoice.paid ?? 0,
                paymentDate: invoice.paymentDate,
            }
        })
    }
}

main().catch(console.error);