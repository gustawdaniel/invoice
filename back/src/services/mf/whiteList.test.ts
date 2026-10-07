import {describe, expect, it} from 'vitest';
import {parseWhiteListAddress} from './whiteList';

describe('parseWhiteListAddress', () => {
    it('splits and prettifies the MF address format', () => {
        expect(parseWhiteListAddress('GRZYBOWSKA 85A/32, 00-844 WARSZAWA'))
            .toEqual({street: 'ul. Grzybowska 85A/32', post: '00-844', city: 'Warszawa'});
        expect(parseWhiteListAddress('LONDYŃSKA 25, 03-921 WARSZAWA'))
            .toEqual({street: 'ul. Londyńska 25', post: '03-921', city: 'Warszawa'});
        expect(parseWhiteListAddress('AL. JANA PAWŁA II 12, 61-139 POZNAŃ'))
            .toEqual({street: 'Al. Jana Pawła II 12', post: '61-139', city: 'Poznań'});
        expect(parseWhiteListAddress('UL. KOŚCIUSZKI 1, 43-300 BIELSKO-BIAŁA'))
            .toEqual({street: 'Ul. Kościuszki 1', post: '43-300', city: 'Bielsko-Biała'});
    });

    it('keeps unparsable addresses as the street', () => {
        expect(parseWhiteListAddress('JAKAŚ WIEŚ 5').post).toBe('');
    });
});
