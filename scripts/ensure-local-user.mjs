import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomInt } from 'node:crypto';

const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const dataDir = path.resolve(
    process.env.PASSKEYS_DATA_DIR || path.join(os.homedir(), '.config', 'passkeys'),
);
const usersFile = path.join(dataDir, 'users.json');
const login = process.env.LOGIN || process.env.USER || process.env.USERNAME || os.userInfo().username;

await mkdir(dataDir, { recursive: true, mode: 0o700 });

try {
    await readFile(usersFile, 'utf8');
    console.log(`Passkeys users file already exists: ${usersFile}`);
} catch (error) {
    if (error.code !== 'ENOENT') throw error;

    const password = Array.from({ length: 8 }, () => LETTERS[randomInt(LETTERS.length)]).join('');
    const handle = await open(usersFile, 'wx', 0o600);
    try {
        await handle.writeFile(`${JSON.stringify([{ username: login, password }], null, 2)}\n`, 'utf8');
    } finally {
        await handle.close();
    }

    console.log('\n============================================================');
    console.log(' Passkeys local account created');
    console.log('============================================================');
    console.log(` Login:    ${login}`);
    console.log(` Password: ${password}`);
    console.log(` Stored in: ${usersFile}`);
    console.log('============================================================\n');
}
