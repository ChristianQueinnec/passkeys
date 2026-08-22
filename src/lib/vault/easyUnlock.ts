export type EasyUnlockPosition = "first" | "last";
export type EasyUnlockLength = 3 | 4;

export interface EasyUnlockChallenge {
    position: EasyUnlockPosition;
    length: EasyUnlockLength;
    answer: string;
}

export const EASY_UNLOCK_WINDOW_MS = 60 * 60 * 1000;

export function createEasyUnlockChallenge(
    password: string,
    random: () => number = Math.random,
): EasyUnlockChallenge | null {
    if (password.length < 3) return null;

    const lengths: EasyUnlockLength[] = password.length >= 4 ? [3, 4] : [3];
    const length = lengths[Math.floor(random() * lengths.length)] ?? 3;
    const position: EasyUnlockPosition = random() < 0.5 ? "first" : "last";
    const answer =
        position === "first"
            ? password.slice(0, length)
            : password.slice(-length);

    return { position, length, answer };
}

export function validateEasyUnlockAnswer(
    challenge: EasyUnlockChallenge,
    answer: string,
    password?: string,
) {
    if (!password) return challenge.answer === answer;
    if (answer.length < challenge.length || answer.length > password.length) return false;

    const expected = challenge.position === "first"
        ? password.slice(0, answer.length)
        : password.slice(-answer.length);
    return expected === answer;
}
