import crypto from 'node:crypto';
import { sanitizeUsername } from '$lib/server/sanitizer';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

type DriveFile = {
    id: string;
    name: string;
    size?: string;
    modifiedTime?: string;
    mimeType?: string;
};

type DriveListResponse = { files?: DriveFile[]; nextPageToken?: string };

let cachedToken: { value: string; expiresAt: number } | null = null;
let tokenRequest: Promise<string> | null = null;

function escapeQueryValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function requireConfiguration(name: string, value: string | undefined): string {
    if (!value) throw new Error(`Missing Google Drive configuration: ${name}`);
    return value;
}

async function getAccessToken(): Promise<string> {
    const staticToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN;
    if (staticToken) return staticToken;

    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
        return cachedToken.value;
    }
    if (tokenRequest) return tokenRequest;

    tokenRequest = (async () => {
        const clientId = requireConfiguration('GOOGLE_DRIVE_CLIENT_ID', process.env.GOOGLE_DRIVE_CLIENT_ID);
        const clientSecret = requireConfiguration('GOOGLE_DRIVE_CLIENT_SECRET', process.env.GOOGLE_DRIVE_CLIENT_SECRET);
        const refreshToken = requireConfiguration('GOOGLE_DRIVE_REFRESH_TOKEN', process.env.GOOGLE_DRIVE_REFRESH_TOKEN);
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        });
        if (!response.ok) throw new Error(`Google OAuth token request failed: HTTP ${response.status}`);
        const data = await response.json() as { access_token?: string; expires_in?: number };
        const value = requireConfiguration('access_token', data.access_token);
        cachedToken = { value, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
        return value;
    })();

    try {
        return await tokenRequest;
    } finally {
        tokenRequest = null;
    }
}

async function driveRequest(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${await getAccessToken()}`);
    const response = await fetch(`${DRIVE_API}${path}`, { ...init, headers });

    if (response.status === 401 && retry && !process.env.GOOGLE_DRIVE_ACCESS_TOKEN) {
        cachedToken = null;
        return driveRequest(path, init, false);
    }
    return response;
}

async function readError(response: Response): Promise<string> {
    try {
        const body = await response.text();
        return body.slice(0, 500);
    } catch {
        return `HTTP ${response.status}`;
    }
}

async function listFiles(query: string): Promise<DriveFile[]> {
    const files: DriveFile[] = [];
    let pageToken: string | undefined;
    do {
        const params = new URLSearchParams({
            q: query,
            spaces: 'drive',
            fields: 'nextPageToken,files(id,name,size,modifiedTime,mimeType)',
            pageSize: '1000',
        });
        if (pageToken) params.set('pageToken', pageToken);
        const response = await driveRequest(`/files?${params}`);
        if (!response.ok) throw new Error(`Google Drive list failed: ${await readError(response)}`);
        const data = await response.json() as DriveListResponse;
        files.push(...(data.files ?? []));
        pageToken = data.nextPageToken;
    } while (pageToken);
    return files;
}

async function ensureUserFolder(username: string): Promise<string> {
    const safeUsername = sanitizeUsername(username);
    const parentQuery = ROOT_FOLDER_ID
        ? `'${escapeQueryValue(ROOT_FOLDER_ID)}' in parents`
        : "'root' in parents";
    const query = `${parentQuery} and name = '${escapeQueryValue(safeUsername)}' and mimeType = '${FOLDER_MIME}' and trashed = false`;
    const existing = await listFiles(query);
    if (existing[0]?.id) return existing[0].id;

    const response = await driveRequest('/files?fields=id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: safeUsername,
            mimeType: FOLDER_MIME,
            parents: [ROOT_FOLDER_ID ?? 'root'],
        }),
    });
    if (!response.ok) throw new Error(`Google Drive folder creation failed: ${await readError(response)}`);
    const data = await response.json() as { id?: string };
    return requireConfiguration('created user folder id', data.id);
}

async function findUserFolder(username: string): Promise<string | null> {
    const safeUsername = sanitizeUsername(username);
    const parentQuery = ROOT_FOLDER_ID
        ? `'${escapeQueryValue(ROOT_FOLDER_ID)}' in parents`
        : "'root' in parents";
    const files = await listFiles(`${parentQuery} and name = '${escapeQueryValue(safeUsername)}' and mimeType = '${FOLDER_MIME}' and trashed = false`);
    return files[0]?.id ?? null;
}

async function findVaultFile(username: string, filename: string): Promise<DriveFile | null> {
    if (!filename.endsWith('.vault') || filename.includes('/') || filename.includes('\\')) return null;
    const folderId = await findUserFolder(username);
    if (!folderId) return null;
    const files = await listFiles(`'${escapeQueryValue(folderId)}' in parents and name = '${escapeQueryValue(filename)}' and trashed = false`);
    return files[0] ?? null;
}

async function downloadFile(fileId: string): Promise<string> {
    const response = await driveRequest(`/files/${encodeURIComponent(fileId)}?alt=media`);
    if (!response.ok) throw new Error(`Google Drive download failed: ${await readError(response)}`);
    return response.text();
}

async function uploadFile(folderId: string, filename: string, content: string): Promise<void> {
    const boundary = `passkeys-${crypto.randomBytes(16).toString('hex')}`;
    const metadata = JSON.stringify({ name: filename, parents: [folderId], mimeType: 'application/octet-stream' });
    const body = [
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
        `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n${content}\r\n`,
        `--${boundary}--\r\n`,
    ].join('');
    const response = await driveRequest(`${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
    });
    if (!response.ok) throw new Error(`Google Drive upload failed: ${await readError(response)}`);
}

export async function listVaults(username: string) {
    const folderId = await findUserFolder(username);
    if (!folderId) return [];
    const files = await listFiles(`'${escapeQueryValue(folderId)}' in parents and trashed = false and name contains '.vault'`);
    const vaults = await Promise.all(files.filter(file => file.name.endsWith('.vault')).map(async file => {
        const content = await downloadFile(file.id);
        return {
            name: file.name,
            size: Number(file.size ?? Buffer.byteLength(content, 'utf8')),
            mtime: new Date(file.modifiedTime ?? 0),
            isCiphered: content.trimStart().startsWith('{'),
        };
    }));
    return vaults.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

export async function saveVault(username: string, content: string): Promise<string> {
    const folderId = await ensureUserFolder(username);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${crypto.randomBytes(4).toString('hex')}.vault`;
    await uploadFile(folderId, filename, content);
    return filename;
}

export async function getVault(username: string, filename: string): Promise<string | null> {
    const file = await findVaultFile(username, filename);
    return file ? downloadFile(file.id) : null;
}

export async function getLatestVault(username: string): Promise<string | null> {
    const vaults = await listVaults(username);
    return vaults[0] ? getVault(username, vaults[0].name) : null;
}

export async function deleteVault(username: string, filename: string): Promise<void> {
    const file = await findVaultFile(username, filename);
    if (!file) return;
    const response = await driveRequest(`/files/${encodeURIComponent(file.id)}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 404) {
        throw new Error(`Google Drive delete failed: ${await readError(response)}`);
    }
}

export { ensureUserFolder };
