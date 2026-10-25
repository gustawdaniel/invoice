import {describe, expect, it} from "vitest";
import {schemaVersion, statementXml} from "./statementXml";

const input = {
    header: {name: 'Firma Testowa sp. z o.o.', seat: {wojewodztwo: 'Mazowieckie', powiat: 'm.st.Warszawa', gmina: 'Wola', miejscowosc: 'Warszawa'},
        address: {wojewodztwo: 'Mazowieckie', powiat: 'm.st.Warszawa', gmina: 'Wola', ulica: 'Prosta', nrDomu: '1', miejscowosc: 'Warszawa',
            kodPocztowy: '00-001', poczta: 'Warszawa'}, pkd: '6201Z', nip: '1111111111'},
    from: '2022-01-01', to: '2022-12-31', preparedOn: '2023-03-31',
    goingConcern: {assumed: true, noThreats: true},
    policies: {A: ['Zasady'], B: 'Wynik', C: 'Sposób'},
    current: {bilans: {Aktywa: 100, Aktywa_B: 100, Aktywa_B_III_1_C_1: 60, Aktywa_B_II_3_A_1: 40, Pasywa: 100, Pasywa_A_I: 100},
        rzis: {A_I: 10, B_III: 4, I: 6, L: 6}},
    previous: {bilans: {Aktywa: 50, Pasywa: 50}, rzis: {}},
    additionalInfo: {description: 'Informacja dodatkowa', fileName: 'info.pdf', base64: 'JVBERg=='},
};

describe('statementXml', () => {
    it('writes the lines with a value, their parents, and the totals, in schema order', () => {
        const xml = statementXml(input);
        expect(xml).toContain('wersjaSchemy="1-2"');
        const order = [...xml.matchAll(/<jin:(Aktywa[A-Z_0-9]*|Pasywa[A-Z_0-9]*)>/g)].map((m) => m[1]);
        expect(order).toEqual(['Aktywa', 'Aktywa_B', 'Aktywa_B_II', 'Aktywa_B_II_3', 'Aktywa_B_II_3_A', 'Aktywa_B_II_3_A_1',
            'Aktywa_B_III', 'Aktywa_B_III_1', 'Aktywa_B_III_1_C', 'Aktywa_B_III_1_C_1', 'Pasywa', 'Pasywa_A', 'Pasywa_A_I']);
        const rzis = [...xml.split('RZiSPor')[1].matchAll(/<jin:([A-L](?:_[IVX]+)?)>/g)].map((m) => m[1]);
        expect(rzis).toEqual(['A', 'A_I', 'B', 'B_III', 'C', 'F', 'I', 'L']);
        expect(xml).toMatch(/<jin:Aktywa>\s*<dtsf:KwotaA>100\.00<\/dtsf:KwotaA>\s*<dtsf:KwotaB>50\.00</);
    });

    it('uses the structure of the year and refuses the years of the new template', () => {
        expect(schemaVersion('2023-01-01')).toBe('1-2');
        const xml = statementXml({...input, from: '2024-01-01', to: '2024-12-31'});
        expect(xml).toContain('wersjaSchemy="1-3"');
        expect(xml).toContain('DefinicjeTypySprawozdaniaFinansowe/2025/01/01/JednostkaInnaWZlotych');
    });

    it('writes years from 2025 as the SFJINZ(2) document: envelope, legal form, head count, choices as 1/2', () => {
        expect(schemaVersion('2025-01-01')).toBe('2');
        const xml = statementXml({...input, from: '2025-01-01', to: '2025-12-31'});
        expect(xml).toMatch(/^<\?xml[^>]*>\s*<Dokument xmlns="http:\/\/crd.gov.pl\/wzor\/2025\/08\/07\/13817\/"/);
        expect(xml).toContain('kodSystemowy="SFJINZ (2)" wersjaSchemy="1-0E"');
        expect(xml).toMatch(/<P_1B>\s*<FormaPrawna>17</);
        expect(xml).toMatch(/<dtsf:AdresPol>\s*<dtsf:KodKraju>PL</);
        expect(xml).not.toContain('Poczta');
        expect(xml).toContain('<P_5A>1</P_5A>');
        expect(xml).toContain('<P_8>0.00</P_8>');
        expect(xml).toContain('<jin:Aktywa_B_III_1_C_1>');
    });
});
