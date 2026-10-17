// obligations towards the authorities that the books keep track of
export const FILING_KINDS = [
    'CIT-8', // annual corporate income tax return
    'CIT-advance', // monthly or quarterly CIT advance payment
    'JPK_V7M', // monthly VAT return with the VAT register
    'JPK_V7K', // quarterly VAT return
    'VAT-R', // VAT registration (or restoring it)
    'VAT-UE', // EU VAT registration (import of services)
    'VAT-9M', // VAT on imported services for a company outside the VAT register
    'PIT-4R', // annual return of income tax withheld from people's pay
    'PIT-11', // yearly income statement for a person paid by the company
    'ZUS', // social security returns and payments
    'financial-statement', // annual financial statement filed with KRS and the tax office
    'KRS', // other court register filings
    'other',
] as const;

// missing: overdue according to the authority; todo: to prepare; check: unclear, to verify;
// filed: sent, waiting for confirmation; accepted: confirmed (UPO); not_required: nothing to file
export const FILING_STATUSES = ['missing', 'todo', 'check', 'filed', 'accepted', 'not_required'] as const;
