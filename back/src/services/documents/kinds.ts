export const DOCUMENT_KINDS = [
    'contract',
    'tax',
    'invoice',
    'accounting',
    'other',
] as const;

export type DocumentKind = typeof DOCUMENT_KINDS[number];

export const DOCUMENT_MAX_BYTES = 8 * 1024 * 1024;

export const DOCUMENT_MIME = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
    contract: 'Contract',
    tax: 'Tax / authority',
    invoice: 'Invoice',
    accounting: 'Accounting',
    other: 'Other',
};
