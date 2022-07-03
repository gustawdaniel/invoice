export type Unit =
    'piece'
    | 'hour'
    | 'pack.'
    | 'box'
    | 'palette'
    | 't.'
    | 'kg'
    | 'm2'
    | 'm3'
    | 'km'
    | 'mb'
    | 'l'
    | 'mh.';

export type VatOption = "23%" | "19%" | "8%" | "5%" | "0%" | "zw." | "np." | "np. EU" | "0% WDT" | "0% Exp." | "o.o.";

export interface Vat {
    value: number
    name: VatOption
}

// ['szt.', 'godz.', 'op.', 'karton', 'paleta', 't.', 'kg', 'm2', 'm3', 'km', 'mb', 'l', 'rg.']

export interface Item {
    name: string
    unit: Unit
    quantity: number
    priceNet: number
    vat: Vat
}