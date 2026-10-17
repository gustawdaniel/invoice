import type {companies} from "@prisma/client";

// never send the encrypted KSeF tokens to the browser
export function publicCompany({ksefTokenEnc, ksefDemoTokenEnc, ksefEnv, ...company}: companies) {
    return {...company, ksefConnected: Boolean(ksefTokenEnc), ksefDemoConnected: Boolean(ksefDemoTokenEnc)};
}
