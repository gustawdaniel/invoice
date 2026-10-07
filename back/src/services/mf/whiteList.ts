import {isValidNip} from 'ksef-client-ts';

// MF "Biała Lista" (wl-api.mf.gov.pl) - public register of Polish taxpayers.
// The search endpoint is limited to ~10 requests per day per IP, so it is used only on explicit user action.

export interface NipLookup {
    nip: string;
    name: string;
    street: string;
    post: string;
    city: string;
    address: string; // "Street 1/2, 00-000 City", the format of companies.address
    statusVat: string; // "Czynny" | "Zwolniony" | "Niezarejestrowany"
}

// "GRZYBOWSKA 85A/32" -> "Grzybowska 85A/32"; numbers and roman numerals (JANA PAWŁA II) stay uppercase
function titleCase(text: string): string {
    return text.split(' ').map(word => {
        if (/\d/.test(word) || /^[IVXLC]{1,6}$/.test(word)) return word;
        return word.toLowerCase().replace(/(^|[-.(])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
    }).join(' ');
}

// "GRZYBOWSKA 85A/32, 00-844 WARSZAWA" -> street, post, city
export function parseWhiteListAddress(raw: string): { street: string; post: string; city: string } {
    const match = raw.match(/^(.*),\s*(\d{2}-\d{3})\s+(.+)$/);
    if (!match) return {street: titleCase(raw.trim()), post: '', city: ''};
    const [, street, post, city] = match;
    const prettyStreet = titleCase(street.trim());
    return {
        street: /^(ul|al|pl|os)\.?\s/i.test(prettyStreet) ? prettyStreet : `ul. ${prettyStreet}`,
        post,
        city: titleCase(city.trim()),
    };
}

export async function lookupNip(nipInput: string): Promise<NipLookup> {
    const nip = nipInput.replace(/\D/g, '');
    if (!isValidNip(nip)) throw new Error(`"${nipInput}" is not a valid NIP`);

    const date = new Date().toISOString().slice(0, 10);
    const res = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${date}`);
    const body = await res.json().catch(() => null) as any;
    if (!res.ok) {
        throw new Error(`MF White List error ${res.status}: ${body?.message ?? 'no details'}`);
    }
    const subject = body?.result?.subject;
    if (!subject) throw new Error(`NIP ${nip} not found in the MF White List`);

    const rawAddress: string = subject.workingAddress ?? subject.residenceAddress ?? '';
    const {street, post, city} = parseWhiteListAddress(rawAddress);
    return {
        nip,
        name: subject.name,
        street,
        post,
        city,
        address: post ? `${street}, ${post} ${city}` : street,
        statusVat: subject.statusVat,
    };
}
