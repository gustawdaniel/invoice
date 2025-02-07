import type {Client} from "~/interfaces/Client";
import type {Item} from "~/interfaces/Item";

export type InvoiceType = 'invoice' | 'proforma' | 'advance' | 'final';
// Faktura, Proforma, Zaliczkowa, Końcowa

export type Currency = 'PLN' | 'EUR' | 'USD' | 'GBP';

export type Language = 'pl';

export type PaymentFormOption = "cash" | "prepaid" | "14d" | "7d" | "card" | "delivery" | "check" | "dotpay" | "paypal" | "payu" | "other";

export type InvoiceStatus = 'send' | 'draft' | 'cancelled' | 'printed' | 'paid' | 'overdue'

export interface PaymentForm {
    name: string,
    key: PaymentFormOption
}

//
// [
//     "Cash",
//     "Transfer (prepaid)",
//     "Transfer 14 days",
//     "Transfer 7 days",
//     "Payment card",
//     "Cash on delivery",
//     "Check",
//     "DotPay",
//     "PayPal",
//     "PayU",
//     "Other"
// ]

// [
//     "Gotówka",
//     "Przelew (przedpłata)",
//     "Przelew 14 dni",
//     "Przelew 7 dni",
//     "Karta płatnicza",
//     "Za pobraniem",
//     "Czek",
//     "DotPay",
//     "PayPal",
//     "PayU",
//     "Inny"
// ]

export interface Invoice {
    id: string,
    type: InvoiceType,
    number: string,
    client: Client,
    receiver?: Client,
    issueDate: string, // YYYY-MM-DD
    saleDate: string,
    deadlineDate: string,
    paymentDate?: string,
    issuePlace: string,
    paymentForm: PaymentForm,
    currency: Currency
    lang: Language,
    secondLanguage?: Language,
    items: Item[],
    issuerName: string,
    receiverName?: string,
    bankAccountNumber: string,
    vatBankAccountNumber?: string,
    publicNote: string,
    privateNote: string,
    paid?: number,
    wasPrinted?: boolean,
    wasSend?: boolean,
    wasCancelled?: boolean
}
