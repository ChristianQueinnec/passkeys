import { json, type RequestHandler } from '@sveltejs/kit';
import { listVaults, deleteVault } from '$lib/server/storage';

export const GET: RequestHandler = async ({ url }) => {
    const username = url.searchParams.get('username');
    if (!username) {
        return json({ error: 'Missing username' }, { status: 400 });
    }

    try {
        const vaults = listVaults(username);
        for (const vault of vaults) {
            deleteVault(username, vault.name);
        }
        return json({ success: true, count: vaults.length });
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ url }) => {
    const username = url.searchParams.get('username');
    if (!username) {
        return json({ error: 'Missing username' }, { status: 400 });
    }

    try {
        const vaults = listVaults(username);
        for (const vault of vaults) {
            deleteVault(username, vault.name);
        }
        return json({ success: true, count: vaults.length });
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
};
