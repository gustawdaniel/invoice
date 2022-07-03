import {ref} from "vue";
import {Invoice} from "~/interfaces/Invoice";
import dayjs from "dayjs";

export function useInvoice() {
    let invoice = ref<Invoice>(
        {
            type: 'invoice',
            number: '',
            client: {name: '', tin: '', post: '', city: '', street: ''},
            issueDate: dayjs().format('YYYY-MM-DD'), // YYYY-MM-DD
            saleDate: dayjs().format('YYYY-MM-DD'),
            deadlineDate : dayjs().add(14, 'days').format('YYYY-MM-DD'),
            issuePlace: 'Tbilisi',
            currency: 'pln',
            lang: 'pl',
            paymentForm: {
                name: 'Transfer 14 days',
                key: '14d'
            },
            items: [{
                name: 'New Advertising Campaign',
                priceNet: 100,
                vat: {
                    name: 'zw.',
                    value: 0,
                },
                quantity: 20,
                unit: "hour"
            }],
            issuerName: 'Daniel Gustaw',
            bankAccountNumber: 'PLN MBank (22 1140 2004 0000 3502 7991 1652)',
            publicNote: 'W zakresie ogólnych usług informatycznych organy podatkowe uznają, że wynagrodzenie z tytułu świadczenia usług informatycznych nie podlega podatkowi u źródła. Stanowisko takie zajął m.in. Dyrektora Krajowej Informacji Skarbowej w interpretacji z 2 stycznia 2020 r. (sygn. 0114-KDIP2-1.4010.399.2019.4.SP), w której potwierdził, że usługi wdrażania systemów informatycznych, monitorowanie sieci i zabezpieczeń, wsparcie technicznego nie będą podlegały podatkowi u źródła.',
            privateNote: '',
        }
    )

    return {
        invoice
    }
}