// what a bank operation was, for bookkeeping
export const TRANSACTION_KINDS = [
    'unclassified',
    // money in
    'sale_payment', // a client paid an invoice
    'refund', // money back from a supplier
    'shareholder_loan', // the shareholder lent money to the company
    'capital', // share capital paid in
    'interest', // interest from the bank
    // money out
    'cost_payment', // a supplier invoice or receipt paid
    'shareholder_repayment', // the company paid the shareholder loan back
    'salary', // pay for people (contracts of mandate, specific work, employment)
    'tax', // CIT, VAT, PIT paid to the tax office
    'zus', // social security
    'bank_fee', // account, card and transfer fees
    'private', // a private expense paid from the company account by mistake: owed by the shareholder
    // both ways
    'own_transfer', // between the company's own accounts (e.g. the VAT account)
    'other',
] as const;

export type TransactionKind = typeof TRANSACTION_KINDS[number];

export const STATUSES = ['auto', 'confirmed', 'review'] as const;

export const COST_CATEGORIES = [
    'hosting', 'software', 'equipment', 'office', 'travel', 'accounting', 'legal', 'marketing', 'education',
    'subcontractor', 'telecom', 'other',
] as const;
