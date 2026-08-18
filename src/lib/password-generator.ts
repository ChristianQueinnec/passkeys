// Exclude characters commonly confused in printed or low-resolution fonts:
// O/0, I/l/1, and lowercase o/i/l.
const PASSWORD_CHARACTERS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const SEPARATORS = ["-", ".", ";", "="];

export function generatePassword(): string {
    const values = new Uint32Array(20);
    globalThis.crypto.getRandomValues(values);
    const limit = Math.floor(0x100000000 / PASSWORD_CHARACTERS.length) * PASSWORD_CHARACTERS.length;
    let index = 0;
    let result = "";
    for (let group = 0; group < 5; group += 1) {
        if (group > 0) result += SEPARATORS[group - 1];
        for (let character = 0; character < 4; character += 1) {
            let value = values[index++];
            while (value >= limit) {
                const extra = new Uint32Array(1);
                globalThis.crypto.getRandomValues(extra);
                value = extra[0];
            }
            result += PASSWORD_CHARACTERS[value % PASSWORD_CHARACTERS.length];
        }
    }
    return result;
}
