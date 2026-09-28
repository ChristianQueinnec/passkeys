import { describe, expect, it } from 'vitest';
import { SensibleString } from '../../src/lib/sensible-string';

describe('SensibleString', () => {
    it('returns the original value, including Unicode text', () => {
        const value = new SensibleString('pāssw🚀rd');

        expect(value.erased).toBe(false);
        expect(value.get()).toBe('pāssw🚀rd');
    });

    it('erases the value and rejects subsequent reads', () => {
        const value = new SensibleString('secret');

        value.erase();

        expect(value.erased).toBe(true);
        expect(() => value.get()).toThrow('sensible string has been erased');
    });

    it('allows erase to be called more than once', () => {
        const value = new SensibleString('secret');

        expect(() => {
            value.erase();
            value.erase();
        }).not.toThrow();
    });
});
