import type { PaymentForm } from "~/interfaces/Invoice";

export const paymentForms: PaymentForm[] = [
    { name: "Cash", key: 'cash' },
    { name: "Transfer (prepaid)", key: 'prepaid' },
    { name: "Transfer 14 days", key: '14d' },
    { name: "Transfer 7 days", key: '7d' },
    { name: "Payment card", key: 'card' },
    { name: "Cash on delivery", key: 'delivery' },
    { name: "Check", key: 'check' },
    { name: "DotPay", key: 'dotpay' },
    { name: "PayPal", key: 'paypal' },
    { name: "PayU", key: 'payu' },
    { name: "Other", key: 'other' },
];
