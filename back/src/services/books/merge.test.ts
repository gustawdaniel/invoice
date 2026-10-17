import {describe, expect, it} from 'vitest';
import {agentUpdate} from './merge';

describe('agentUpdate', () => {
    const facts = {amount: -19, description: 'OPŁATA'};
    it('classifies new and unconfirmed records', () => {
        expect(agentUpdate(null, facts, {kind: 'bank_fee', status: 'auto', note: undefined}))
            .toEqual({amount: -19, description: 'OPŁATA', kind: 'bank_fee', status: 'auto'});
        expect(agentUpdate({status: 'review'}, facts, {kind: 'bank_fee', status: 'auto'}))
            .toMatchObject({kind: 'bank_fee', status: 'auto'});
    });
    it('never overrides a human decision', () => {
        expect(agentUpdate({status: 'confirmed'}, facts, {kind: 'other', status: 'auto'})).toEqual(facts);
    });
});
