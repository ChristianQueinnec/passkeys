import { describe, it, expect } from 'vitest';
import {
    createEasyUnlockChallenge,
    validateEasyUnlockAnswer,
    EASY_UNLOCK_WINDOW_MS,
} from '../../src/lib/vault/easyUnlock';

describe('Easy unlock helper', () => {
    it('uses a one-hour grace window', () => {
        expect(EASY_UNLOCK_WINDOW_MS).toBe(60 * 60 * 1000);
    });

    it('can generate a first-4 challenge deterministically', () => {
        const challenge = createEasyUnlockChallenge('SuperSecret123', () => 0);
        expect(challenge).toEqual({
            position: 'first',
            length: 3,
            answer: 'Sup',
        });
    });

    it('can generate a last-4 challenge deterministically', () => {
        const challenge = createEasyUnlockChallenge('SuperSecret123', () => 0.99);
        expect(challenge).toEqual({
            position: 'last',
            length: 4,
            answer: 't123',
        });
    });

    it('validates answers exactly', () => {
        const challenge = {
            position: 'first' as const,
            length: 4 as const,
            answer: 'Secr',
        };

        expect(validateEasyUnlockAnswer(challenge, 'Secr')).toBe(true);
        expect(validateEasyUnlockAnswer(challenge, 'secr')).toBe(false);
    });

    it("accepts longer valid prefixes and suffixes", () => {
        const first = { position: "first" as const, length: 3 as const, answer: "Sup" };
        const last = { position: "last" as const, length: 3 as const, answer: "123" };

        expect(validateEasyUnlockAnswer(first, "Super", "SuperSecret123")).toBe(true);
        expect(validateEasyUnlockAnswer(last, "t123", "SuperSecret123")).toBe(true);
        expect(validateEasyUnlockAnswer(first, "Sue", "SuperSecret123")).toBe(false);
        expect(validateEasyUnlockAnswer(first, "SuperSecret1234", "SuperSecret123")).toBe(false);
    });
});
