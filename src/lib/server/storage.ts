import settings from './server-settings.json';
import * as filesystemStorage from '$lib/server/filesystem-storage';
import * as googleDriveStorage from '$lib/server/google-drive-storage';

type StorageProvider = Pick<
    typeof filesystemStorage,
    'listVaults' | 'saveVault' | 'getVault' | 'getLatestVault' | 'deleteVault'
>;
const providerName = process.env.STORAGE_PROVIDER ?? settings.storage.provider ?? 'filesystem';
if (providerName !== 'filesystem' && providerName !== 'google-drive') {
    throw new Error(`Unsupported storage provider: ${providerName}`);
}
const provider: StorageProvider = providerName === 'google-drive'
    ? googleDriveStorage
    : filesystemStorage;

/**
 * Resolve the directory path for a user's vaults.
 *
 * Pure resolver — never creates anything on disk.  Every storage function
 * calls this first so they all benefit from the containment check.
 *
 * @throws if the resolved path would escape DATA_DIR (path traversal guard).
 */
export const getUserDir = filesystemStorage.getUserDir;

/**
 * Ensure the user's vault directory exists, creating it if necessary.
 * Called only from write operations (saveVault).
 */
export const ensureUserDir = async (username: string): Promise<string> => {
    if (providerName === 'google-drive') return googleDriveStorage.ensureUserFolder(username);
    return filesystemStorage.ensureUserDir(username);
};

/**
 * List vault metadata for a user, sorted newest-first.
 */
export const listVaults = async (username: string) => {
    return provider.listVaults(username);
};

/**
 * Save vault content.  Uses a random suffix to prevent same-millisecond
 * filename collisions (fixes report finding #17 / N10).
 */
export const saveVault = async (username: string, content: string): Promise<string> => {
    return provider.saveVault(username, content);
};

export const getVault = async (username: string, filename: string): Promise<string | null> => {
    return provider.getVault(username, filename);
};

export const getLatestVault = async (username: string): Promise<string | null> => {
    return provider.getLatestVault(username);
};

export const deleteVault = async (username: string, filename: string): Promise<void> => {
    return provider.deleteVault(username, filename);
};
