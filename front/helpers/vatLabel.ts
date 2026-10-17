// API returns enum names (VAT_zw), the editor uses labels (zw.)
const LABELS: Record<string, string> = {
    VAT_23: '23%', VAT_19: '19%', VAT_18: '18%', VAT_8: '8%', VAT_5: '5%', VAT_0: '0%',
    VAT_zw: 'zw.', VAT_exempt: 'exempt.', VAT_np: 'np.', VAT_npEU: 'np. EU',
    VAT_0_WDT: '0% WDT', VAT_0_EXP: '0% Exp.', VAT_oo: 'o.o.',
};

export function vatLabel(name: string): string {
    return LABELS[name] ?? name;
}

export function isVatExempt(name: string): boolean {
    return ['zw.', 'exempt.'].includes(vatLabel(name));
}

const PL_UNITS: Record<string, string> = {
    piece: 'szt.', service: 'usł.', hour: 'godz.', 'pack.': 'opak.', pack: 'opak.', box: 'karton',
    palette: 'paleta', 't.': 't', mh: 'rbh', 'mh.': 'rbh',
};

export function unitLabel(unit: string, pl: boolean): string {
    return pl ? (PL_UNITS[unit] ?? unit) : unit;
}
