import {VatRate} from "@prisma/client";

export function getVatRate(vatRate: string): VatRate {
    switch(vatRate) {
        case '23%': return VatRate.VAT_23;
        case '19%': return VatRate.VAT_19;
        case '18%': return VatRate.VAT_18;
        case '8%': return VatRate.VAT_8;
        case '5%': return VatRate.VAT_5;
        case '0%': return VatRate.VAT_0;
        case 'zw.': return VatRate.VAT_zw;
        case 'exempt.': return VatRate.VAT_exempt;
        case 'np.': return VatRate.VAT_np;
        case 'np. EU': return VatRate.VAT_npEU;
        case '0% WDT': return VatRate.VAT_0_WDT;
        case '0% Exp.': return VatRate.VAT_0_EXP;
        case 'o.o.': return VatRate.VAT_oo;

        // Fallback for case when vat Rate is not mapped correctly
        case 'VAT_23': return VatRate.VAT_23;
        case 'VAT_19': return VatRate.VAT_19;
        case 'VAT_18': return VatRate.VAT_18;
        case 'VAT_8': return VatRate.VAT_8;
        case 'VAT_5': return VatRate.VAT_5;
        case 'VAT_0': return VatRate.VAT_0;
        case 'VAT_zw': return VatRate.VAT_zw;
        case 'VAT_exempt': return VatRate.VAT_exempt;
        case 'VAT_np': return VatRate.VAT_np;
        case 'VAT_npEU': return VatRate.VAT_npEU;
        case 'VAT_0_WDT': return VatRate.VAT_0_WDT;
        case 'VAT_0_EXP': return VatRate.VAT_0_EXP;
        case 'VAT_oo': return VatRate.VAT_oo;

        default: throw new Error(`VatRate ${vatRate} not found`);
    }
}