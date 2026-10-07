import os from 'node:os';
import path from 'node:path';
import settings from './server-settings.json';

const isPackaged = Boolean((process as NodeJS.Process & { pkg?: unknown }).pkg);

/** Resolve the server state directory for development, Docker, or the local package. */
export function resolveDataDir(
    env: NodeJS.ProcessEnv = process.env,
    cwd: string = process.cwd(),
    homeDir: string = os.homedir(),
): string {
    if (env.PASSKEYS_DATA_DIR) {
        return path.resolve(env.PASSKEYS_DATA_DIR.replace(/^~(?=$|[\\/])/, homeDir));
    }

    if (isPackaged) {
        return path.join(homeDir, '.config', 'passkeys');
    }

    return path.resolve(cwd, settings.storage.dataDir);
}

export const DATA_DIR = resolveDataDir();
