import fs from 'node:fs';
import path from 'node:path';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    let date = 'unknown';
    let version = 'unknown';

    try {
        const tagPath = path.resolve(process.cwd(), 'passkeys.tag');
        if (fs.existsSync(tagPath)) {
            date = fs.readFileSync(tagPath, 'utf-8').trim();
        }
    } catch (e) {
        // Ignore
    }

    try {
        const idPath = path.resolve(process.cwd(), 'passkeys.id');
        if (fs.existsSync(idPath)) {
            version = fs.readFileSync(idPath, 'utf-8').trim();
        }
    } catch (e) {
        // Ignore
    }

    return {
        date,
        version
    };
};
