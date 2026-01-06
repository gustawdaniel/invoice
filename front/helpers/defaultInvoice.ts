import type { Invoice } from "~/interfaces/Invoice";
import dayjs from "dayjs";
import { paymentForms } from "~/helpers/paymentForms";

export function defaultInvoice(): Invoice {
    return {
        id: '',
        type: 'invoice',
        number: '',
        client: { id: '', name: '', tin: '', post: '', city: '', street: '' },
        issueDate: dayjs().format('YYYY-MM-DD'), // YYYY-MM-DD
        saleDate: dayjs().format('YYYY-MM-DD'),
        deadlineDate: dayjs().add(14, 'days').format('YYYY-MM-DD'),
        issuePlace: 'Tbilisi',
        currency: 'PLN',
        lang: 'pl',
        paymentForm: paymentForms[2],
        items: [
            //     {
            //     name: 'New Advertising Campaign',
            //     priceNet: 100,
            //     vat: {
            //         name: 'zw.',
            //         value: 0,
            //     },
            //     quantity: 20,
            //     unit: "hour"
            // }
        ],
        issuerName: 'Daniel Gustaw',
        bankAccountNumber: "PLN Millennium (90 1160 2202 0000 0002 2859 6562)",
        publicNote: 'W zakresie ogólnych usług informatycznych organy podatkowe uznają, że wynagrodzenie z tytułu świadczenia usług informatycznych nie podlega podatkowi u źródła. Stanowisko takie zajął m.in. Dyrektora Krajowej Informacji Skarbowej w interpretacji z 2 stycznia 2020 r. (sygn. 0114-KDIP2-1.4010.399.2019.4.SP), w której potwierdził, że usługi wdrażania systemów informatycznych, monitorowanie sieci i zabezpieczeń, wsparcie technicznego nie będą podlegały podatkowi u źródła.',
        privateNote: '',
    }
}