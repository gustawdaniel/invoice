// Chart of accounts of a small Polish company (comparative profit and loss, costs by type in team 4) and where each
// account goes in the financial statement. Analytic accounts add a suffix after a dash: 130-1652 (a bank account),
// 220-VAT (VAT settlements), 240-WSP (settlements with a shareholder or board member).

export type AccountType = 'asset' | 'liability' | 'settlement' | 'equity' | 'cost' | 'revenue';

export const ACCOUNTS: Record<string, { name: string; type: AccountType }> = {
    '010': {name: 'Środki trwałe', type: 'asset'},
    '070': {name: 'Umorzenie środków trwałych', type: 'asset'},
    '130': {name: 'Rachunki bankowe', type: 'asset'},
    '141': {name: 'Środki pieniężne w drodze', type: 'asset'},
    '200': {name: 'Rozrachunki z odbiorcami', type: 'settlement'},
    '201': {name: 'Rozrachunki z dostawcami', type: 'settlement'},
    '220': {name: 'Rozrachunki publicznoprawne', type: 'settlement'},
    '230': {name: 'Rozrachunki z tytułu wynagrodzeń', type: 'settlement'},
    '240': {name: 'Pozostałe rozrachunki', type: 'settlement'},
    '249': {name: 'Rozrachunki do wyjaśnienia', type: 'settlement'},
    '290': {name: 'Odpisy aktualizujące należności', type: 'settlement'},
    '401': {name: 'Amortyzacja', type: 'cost'},
    '402': {name: 'Zużycie materiałów i energii', type: 'cost'},
    '403': {name: 'Usługi obce', type: 'cost'},
    '404': {name: 'Podatki i opłaty', type: 'cost'},
    '405': {name: 'Wynagrodzenia', type: 'cost'},
    '406': {name: 'Ubezpieczenia społeczne i inne świadczenia', type: 'cost'},
    '409': {name: 'Pozostałe koszty rodzajowe', type: 'cost'},
    '700': {name: 'Przychody ze sprzedaży', type: 'revenue'},
    '750': {name: 'Przychody finansowe', type: 'revenue'},
    '751': {name: 'Koszty finansowe', type: 'cost'},
    '760': {name: 'Pozostałe przychody operacyjne', type: 'revenue'},
    '761': {name: 'Pozostałe koszty operacyjne', type: 'cost'},
    '801': {name: 'Kapitał podstawowy', type: 'equity'},
    '820': {name: 'Rozliczenie wyniku finansowego (lata ubiegłe)', type: 'equity'},
    '870': {name: 'Podatek dochodowy', type: 'cost'},
};

export function synthetic(account: string): string {
    return account.split('-')[0];
}

export function accountName(account: string): string {
    return ACCOUNTS[synthetic(account)]?.name ?? '?';
}

export function isKnownAccount(account: string): boolean {
    return synthetic(account) in ACCOUNTS;
}

// profit and loss accounts: their turnover makes the result of the year, the balance never carries over
export function isResultAccount(account: string): boolean {
    const type = ACCOUNTS[synthetic(account)]?.type;
    return type === 'cost' || type === 'revenue';
}

// what a cost document is booked to, by its category (services/books/kinds.ts)
export const COST_ACCOUNT: Record<string, string> = {
    hosting: '403', software: '403', subcontractor: '403', accounting: '403', legal: '403', marketing: '403',
    telecom: '403', office: '403', equipment: '402', travel: '409', education: '409', other: '409',
};

// Profit and loss, comparative variant (załącznik nr 1 do ustawy o rachunkowości), element names of the MF schema
// JednostkaInna: each line is the sum of turnovers (Ct − Dt for revenue, Dt − Ct for costs) of its accounts
export const RZIS_LINES: { key: string; label: string; accounts: string[]; sign: 1 | -1 }[] = [
    {key: 'A_I', label: 'Przychody netto ze sprzedaży produktów', accounts: ['700'], sign: -1},
    {key: 'B_I', label: 'Amortyzacja', accounts: ['401'], sign: 1},
    {key: 'B_II', label: 'Zużycie materiałów i energii', accounts: ['402'], sign: 1},
    {key: 'B_III', label: 'Usługi obce', accounts: ['403'], sign: 1},
    {key: 'B_IV', label: 'Podatki i opłaty', accounts: ['404'], sign: 1},
    {key: 'B_V', label: 'Wynagrodzenia', accounts: ['405'], sign: 1},
    {key: 'B_VI', label: 'Ubezpieczenia społeczne i inne świadczenia', accounts: ['406'], sign: 1},
    {key: 'B_VII', label: 'Pozostałe koszty rodzajowe', accounts: ['409'], sign: 1},
    {key: 'D_IV', label: 'Inne przychody operacyjne', accounts: ['760'], sign: -1},
    {key: 'E_III', label: 'Inne koszty operacyjne', accounts: ['761'], sign: 1},
    {key: 'G_V', label: 'Inne przychody finansowe', accounts: ['750'], sign: -1},
    {key: 'H_IV', label: 'Inne koszty finansowe', accounts: ['751'], sign: 1},
    {key: 'J', label: 'Podatek dochodowy', accounts: ['870'], sign: 1},
];

// Balance sheet lines fed by account balances. Settlement accounts go to assets when their analytic balance is debit
// and to liabilities when it is credit (each analytic account on its own, as the law requires).
export type BalanceSide = 'debit' | 'credit';
export const BILANS_SOURCES: { key: string; label: string; account: string; side: BalanceSide | 'both' }[] = [
    {key: 'Aktywa_A_II_1', label: 'Środki trwałe', account: '010', side: 'both'},
    {key: 'Aktywa_A_II_1', label: 'Środki trwałe', account: '070', side: 'both'},
    {key: 'Aktywa_B_II_3_A_1', label: 'Należności z tytułu dostaw i usług do 12 miesięcy', account: '200', side: 'debit'},
    {key: 'Aktywa_B_II_3_A_1', label: 'Należności z tytułu dostaw i usług do 12 miesięcy', account: '290', side: 'both'},
    {key: 'Aktywa_B_II_3_C', label: 'Należności inne', account: '201', side: 'debit'},
    {key: 'Aktywa_B_II_3_B', label: 'Należności publicznoprawne', account: '220', side: 'debit'},
    {key: 'Aktywa_B_II_3_C', label: 'Należności inne', account: '230', side: 'debit'},
    {key: 'Aktywa_B_II_3_C', label: 'Należności inne', account: '240', side: 'debit'},
    {key: 'Aktywa_B_II_3_C', label: 'Należności inne', account: '249', side: 'debit'},
    {key: 'Aktywa_B_III_1_C_1', label: 'Środki pieniężne w kasie i na rachunkach', account: '130', side: 'debit'},
    {key: 'Aktywa_B_III_1_C_1', label: 'Środki pieniężne w kasie i na rachunkach', account: '141', side: 'both'},
    {key: 'Pasywa_A_I', label: 'Kapitał podstawowy', account: '801', side: 'both'},
    {key: 'Pasywa_A_V', label: 'Zysk (strata) z lat ubiegłych', account: '820', side: 'both'},
    {key: 'Pasywa_B_III_3_A', label: 'Kredyty i pożyczki', account: '240-WSP', side: 'credit'},
    {key: 'Pasywa_B_III_3_A', label: 'Kredyty i pożyczki', account: '130', side: 'credit'},
    {key: 'Pasywa_B_III_3_D_1', label: 'Zobowiązania z tytułu dostaw i usług do 12 miesięcy', account: '201', side: 'credit'},
    {key: 'Pasywa_B_III_3_E', label: 'Zaliczki otrzymane na dostawy i usługi', account: '200', side: 'credit'},
    {key: 'Pasywa_B_III_3_G', label: 'Zobowiązania z tytułu podatków, ceł, ubezpieczeń', account: '220', side: 'credit'},
    {key: 'Pasywa_B_III_3_H', label: 'Zobowiązania z tytułu wynagrodzeń', account: '230', side: 'credit'},
    {key: 'Pasywa_B_III_3_I', label: 'Zobowiązania inne', account: '240', side: 'credit'},
    {key: 'Pasywa_B_III_3_I', label: 'Zobowiązania inne', account: '249', side: 'credit'},
];

// parents of the balance sheet lines, summed bottom up (element names of JednostkaInna)
export const BILANS_TREE: Record<string, string[]> = {
    Aktywa: ['Aktywa_A', 'Aktywa_B'],
    Aktywa_A: ['Aktywa_A_II'],
    Aktywa_A_II: ['Aktywa_A_II_1'],
    Aktywa_B: ['Aktywa_B_II', 'Aktywa_B_III'],
    Aktywa_B_II: ['Aktywa_B_II_3'],
    Aktywa_B_II_3: ['Aktywa_B_II_3_A', 'Aktywa_B_II_3_B', 'Aktywa_B_II_3_C'],
    Aktywa_B_II_3_A: ['Aktywa_B_II_3_A_1'],
    Aktywa_B_III: ['Aktywa_B_III_1'],
    Aktywa_B_III_1: ['Aktywa_B_III_1_C'],
    Aktywa_B_III_1_C: ['Aktywa_B_III_1_C_1'],
    Pasywa: ['Pasywa_A', 'Pasywa_B'],
    Pasywa_A: ['Pasywa_A_I', 'Pasywa_A_V', 'Pasywa_A_VI'],
    Pasywa_B: ['Pasywa_B_III'],
    Pasywa_B_III: ['Pasywa_B_III_3'],
    Pasywa_B_III_3: ['Pasywa_B_III_3_A', 'Pasywa_B_III_3_D', 'Pasywa_B_III_3_E', 'Pasywa_B_III_3_G', 'Pasywa_B_III_3_H', 'Pasywa_B_III_3_I'],
    Pasywa_B_III_3_D: ['Pasywa_B_III_3_D_1'],
};

export const RZIS_TREE: Record<string, string[]> = {
    A: ['A_I'],
    B: ['B_I', 'B_II', 'B_III', 'B_IV', 'B_V', 'B_VI', 'B_VII'],
    D: ['D_IV'],
    E: ['E_III'],
    G: ['G_V'],
    H: ['H_IV'],
};
