import { browser } from '$app/environment';

// Client-side API wrapper (updated for SvelteKit relative paths)

export const api = {
    token: browser ? localStorage.getItem('token') : null,
    username: browser ? localStorage.getItem('username') : null,

    async login(username: string, password: string) {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) throw new Error('Login failed');
        const data = await res.json();
        this.token = data.token;
        this.username = data.username;
        if (browser) {
            if (this.token) localStorage.setItem('token', this.token);
            if (this.username) localStorage.setItem('username', this.username);
        }
        return data;
    },

    logout() {
        this.token = null;
        this.username = null;
        if (browser) {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
        }
    },

    async getLatestVault() {
        if (!this.token) throw new Error('Not authenticated');
        const res = await fetch('/api/vault', {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        if (res.status === 404) return null;
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to get vault');
        }
        return res.json();
    },

    async saveVault(content: string) {
        if (!this.token) throw new Error('Not authenticated');
        const res = await fetch('/api/vault', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({ content })
        });
        if (!res.ok) throw new Error('Failed to save vault');
        return res.json();
    },

    async getVaultHistory() {
        if (!this.token) throw new Error('Not authenticated');
        const res = await fetch('/api/vault/history', {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        if (!res.ok) throw new Error('Failed to list history');
        return res.json();
    },

    async changePassword(oldPassword: string, newPassword: string) {
        if (!this.token) throw new Error('Not authenticated');
        const res = await fetch('/api/user/password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update password');
        }
        return res.json();
    }
};
