import {Language} from "@prisma/client";

export function getLanguage(lang: string): Language {
    switch(lang) {
        case 'pl': return Language.pl;
        case 'en': return Language.en;
        default: throw new Error(`Language ${lang} not found`);
    }
}