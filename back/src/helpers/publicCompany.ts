import type {companies} from "@prisma/client";

// never send the encrypted KSeF token to the browser
export function publicCompany({ksefTokenEnc, ...company}: companies) {
    return {...company, ksefConnected: Boolean(ksefTokenEnc)};
}
