// The financial statement of a company that is not micro or small ("jednostka inna", załącznik nr 1 do ustawy
// o rachunkowości) as the XML the court register (KRS) accepts: the MF logical structure JednostkaInnaWZlotych.
// Version 1-2 is for years that began before 2024, 1-3 for 2024 (structures published by MF in November 2024); years
// from 2025 use the new template SFJINZ(2) with the amended profit and loss, not supported yet.
import {create} from "xmlbuilder2";

export interface StatementHeader {
    name: string;
    seat: { wojewodztwo: string; powiat: string; gmina: string; miejscowosc: string };
    address: {
        wojewodztwo: string; powiat: string; gmina: string; ulica?: string; nrDomu: string; nrLokalu?: string;
        miejscowosc: string; kodPocztowy: string; poczta: string;
    };
    pkd: string; // e.g. 6201Z
    nip: string;
    krs?: string;
}

export interface StatementInput {
    header: StatementHeader;
    from: string;
    to: string;
    preparedOn: string;
    // P_5: the statement assumes the company goes on; P_5B: nothing threatens that; P_5C: what threatens it
    goingConcern: { assumed: boolean; noThreats: boolean; threats?: string };
    // P_7: accounting policies, valuation, result, how the statement was made, other
    policies: { A: string[]; B: string; C: string; D?: string };
    current: { bilans: Record<string, number>; rzis: Record<string, number> };
    previous: { bilans: Record<string, number>; rzis: Record<string, number> };
    additionalInfo: { description: string; fileName: string; base64: string };
}

const NS = {
    '1-2': {
        root: 'http://www.mf.gov.pl/schematy/SF/DefinicjeTypySprawozdaniaFinansowe/2018/07/09/JednostkaInnaWZlotych',
        dtsf: 'http://www.mf.gov.pl/schematy/SF/DefinicjeTypySprawozdaniaFinansowe/2018/07/09/DefinicjeTypySprawozdaniaFinansowe/',
        jin: 'http://www.mf.gov.pl/schematy/SF/DefinicjeTypySprawozdaniaFinansowe/2018/07/09/JednostkaInnaStruktury',
        etd: 'http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2016/01/25/eD/DefinicjeTypy/',
        location: 'https://www.gov.pl/documents/2034621/2182793/JednostkaInnaWZlotych%281%29_v1-2.xsd',
        code: 'SFJINZ (1)',
    },
    '1-3': {
        root: 'http://www.mf.gov.pl/schematy/SF/DefinicjeTypySprawozdaniaFinansowe/2025/01/01/JednostkaInnaWZlotych',
        dtsf: 'http://www.mf.gov.pl/schematy/SF/DefinicjeTypySprawozdaniaFinansowe/2018/07/09/DefinicjeTypySprawozdaniaFinansowe/',
        jin: 'http://www.mf.gov.pl/schematy/SF/DefinicjeTypySprawozdaniaFinansowe/2025/01/01/JednostkaInnaStruktury',
        etd: 'http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2016/01/25/eD/DefinicjeTypy/',
        location: 'https://www.gov.pl/static/finanse/SF/DefinicjeTypySprawozdaniaFinansowe/2024/10/24/JednostkaInnaWZlotych(1)_v1-3.xsd',
        code: 'SFJINZ (1)',
    },
} as const;

export function schemaVersion(from: string): keyof typeof NS {
    if (from >= '2025-01-01') throw new Error('Years from 2025 use the MF template SFJINZ(2), not supported yet');
    return from >= '2024-01-01' ? '1-3' : '1-2';
}

const ROMAN: Record<string, number> = {I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10};

// element names in schema order: roman numerals by value, numbers by value, letters alphabetically
function compareSegments(a: string, b: string): number {
    const sa = a.split('_'), sb = b.split('_');
    for (let i = 0; i < Math.min(sa.length, sb.length); i++) {
        if (sa[i] === sb[i]) continue;
        const ra = ROMAN[sa[i]], rb = ROMAN[sb[i]];
        if (ra && rb) return ra - rb;
        const na = Number(sa[i]), nb = Number(sb[i]);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return sa[i] < sb[i] ? -1 : 1;
    }
    return sa.length - sb.length;
}

const amount = (value: number | undefined) => (value ?? 0).toFixed(2);

export function statementXml(input: StatementInput): string {
    const version = schemaVersion(input.from);
    const ns = NS[version];
    const doc = create({version: '1.0', encoding: 'UTF-8'});
    const root = doc.ele(ns.root, 'JednostkaInna', {
        'xmlns:dtsf': ns.dtsf, 'xmlns:etd': ns.etd, 'xmlns:jin': ns.jin,
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation': `${ns.root} ${ns.location}`,
    });
    const dtsf = (parent: ReturnType<typeof root.ele>, name: string, text?: string) => {
        const e = parent.ele(ns.dtsf, `dtsf:${name}`);
        return text === undefined ? e : e.txt(text);
    };

    const head = root.ele(ns.root, 'Naglowek');
    dtsf(head, 'OkresOd', input.from);
    dtsf(head, 'OkresDo', input.to);
    dtsf(head, 'DataSporzadzenia', input.preparedOn);
    head.ele(ns.jin, 'jin:KodSprawozdania', {kodSystemowy: ns.code, wersjaSchemy: version}).txt('SprFinJednostkaInnaWZlotych');
    head.ele(ns.jin, 'jin:WariantSprawozdania').txt('1');

    const intro = root.ele(ns.root, 'WprowadzenieDoSprawozdaniaFinansowego');
    const p1 = intro.ele(ns.root, 'P_1');
    const h = input.header;
    const p1a = p1.ele(ns.root, 'P_1A');
    dtsf(p1a, 'NazwaFirmy', h.name);
    const seat = dtsf(p1a, 'Siedziba');
    for (const [k, v] of [['Wojewodztwo', h.seat.wojewodztwo], ['Powiat', h.seat.powiat], ['Gmina', h.seat.gmina], ['Miejscowosc', h.seat.miejscowosc]]) dtsf(seat, k, v);
    const address = dtsf(p1.ele(ns.root, 'P_1B'), 'Adres');
    const a = h.address;
    for (const [k, v] of [['KodKraju', 'PL'], ['Wojewodztwo', a.wojewodztwo], ['Powiat', a.powiat], ['Gmina', a.gmina], ['Ulica', a.ulica],
        ['NrDomu', a.nrDomu], ['NrLokalu', a.nrLokalu], ['Miejscowosc', a.miejscowosc], ['KodPocztowy', a.kodPocztowy], ['Poczta', a.poczta]]) {
        if (v) dtsf(address, k!, v);
    }
    dtsf(p1.ele(ns.root, 'P_1C'), 'KodPKD', h.pkd);
    p1.ele(ns.root, 'P_1D').txt(h.nip);
    if (h.krs) p1.ele(ns.root, 'P_1E').txt(h.krs);
    const p3 = intro.ele(ns.root, 'P_3');
    dtsf(p3, 'DataOd', input.from);
    dtsf(p3, 'DataDo', input.to);
    intro.ele(ns.root, 'P_4').txt('false');
    const p5 = intro.ele(ns.root, 'P_5');
    p5.ele(ns.root, 'P_5A').txt(String(input.goingConcern.assumed));
    p5.ele(ns.root, 'P_5B').txt(String(input.goingConcern.noThreats));
    if (input.goingConcern.threats) p5.ele(ns.root, 'P_5C').txt(input.goingConcern.threats);
    const p7 = intro.ele(ns.root, 'P_7');
    for (const text of input.policies.A) p7.ele(ns.root, 'P_7A').txt(text);
    p7.ele(ns.root, 'P_7B').txt(input.policies.B);
    p7.ele(ns.root, 'P_7C').txt(input.policies.C);
    if (input.policies.D) p7.ele(ns.root, 'P_7D').txt(input.policies.D);

    // a line is written when it or a line under it has a value in either year; the totals always
    const writeTree = (parent: ReturnType<typeof root.ele>, key: string, keys: string[], cur: Record<string, number>, prev: Record<string, number>) => {
        const e = parent.ele(ns.jin, `jin:${key}`);
        dtsf(e, 'KwotaA', amount(cur[key]));
        dtsf(e, 'KwotaB', amount(prev[key]));
        const depth = key.split('_').length;
        const children = keys.filter((k) => k.startsWith(`${key}_`) && k.split('_').length === depth + 1).sort(compareSegments);
        for (const child of children) writeTree(e, child, keys, cur, prev);
    };
    const used = (values: Record<string, number>[]) => [...new Set(values.flatMap((v) => Object.keys(v).filter((k) => Math.round((v[k] ?? 0) * 100))))];
    const withParents = (keys: string[]) => {
        const all = new Set(keys);
        for (const k of keys) { const parts = k.split('_'); for (let i = 1; i < parts.length; i++) all.add(parts.slice(0, i).join('_')); }
        return [...all];
    };

    const bilans = root.ele(ns.root, 'Bilans');
    const bKeys = withParents([...used([input.current.bilans, input.previous.bilans]), 'Aktywa', 'Pasywa']);
    for (const top of ['Aktywa', 'Pasywa']) writeTree(bilans, top, bKeys, input.current.bilans, input.previous.bilans);

    // profit and loss, comparative variant: top lines A..L, each with its sub-lines
    const rzis = root.ele(ns.root, 'RZiS').ele(ns.jin, 'jin:RZiSPor');
    const rKeys = withParents([...used([input.current.rzis, input.previous.rzis]), 'A', 'B', 'C', 'F', 'I', 'L']);
    for (const top of rKeys.filter((k) => !k.includes('_')).sort(compareSegments)) writeTree(rzis, top, rKeys, input.current.rzis, input.previous.rzis);

    const info = root.ele(ns.root, 'DodatkoweInformacjeIObjasnieniaJednostkaInna').ele(ns.root, 'DodatkoweInformacjeIObjasnienia');
    dtsf(info, 'Opis', input.additionalInfo.description);
    const file = dtsf(info, 'Plik');
    dtsf(file, 'Nazwa', input.additionalInfo.fileName);
    dtsf(file, 'Zawartosc', input.additionalInfo.base64);

    return doc.end({prettyPrint: true});
}
