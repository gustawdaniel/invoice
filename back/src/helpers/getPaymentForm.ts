import {PaymentForm} from "@prisma/client";

export function getPaymentForm(paymentForm: string): PaymentForm {
    switch(paymentForm) {
        case 'cash': return PaymentForm.cash;
        case 'prepaid': return PaymentForm.prepaid;
        case '14d': return PaymentForm.d14;
        case '7d': return PaymentForm.d7;
        case 'card': return PaymentForm.card;
        case 'delivery': return PaymentForm.delivery;
        case 'check': return PaymentForm.check;
        case 'dotpay': return PaymentForm.dotpay;
        case 'paypal': return PaymentForm.paypal;
        case 'payu': return PaymentForm.payu;
        case 'other': return PaymentForm.other;

        default: throw new Error(`PaymentForm ${paymentForm} not found`);
    }
}