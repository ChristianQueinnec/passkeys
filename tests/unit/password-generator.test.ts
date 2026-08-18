import { describe, expect, it } from "vitest";
import { generatePassword } from "$lib/password-generator";

describe("generatePassword", () => {
    it("generates the requested alphanumeric format", () => {
        const password = generatePassword();

        expect(password).toMatch(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}\.[A-Za-z0-9]{4};[A-Za-z0-9]{4}=[A-Za-z0-9]{4}$/);
    });

    it("generates different values across calls", () => {
        expect(generatePassword()).not.toBe(generatePassword());
    });

    it("avoids easily confused characters", () => {
        for (let attempt = 0; attempt < 100; attempt += 1) {
            expect(generatePassword()).not.toMatch(/[O0oLlIi1]/);
        }
    });
});
