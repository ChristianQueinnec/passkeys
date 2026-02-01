import { browser } from '$app/environment';
import type { CSRFTokenResponse, DeleteVaultResponse, ErrorResponse, LatestVaultResponse, LoginResponse, NewerVaultResponse, PasswordChangeResponse, SaveVaultResponse, VaultDescription } from './server/requestTypes';

// Client-side API wrapper (updated for SvelteKit relative paths)

export const api = {
    token: browser ? (window.localStorage.getItem('token') || window.sessionStorage.getItem('token')) : null,
    username: browser ? (window.localStorage.getItem('username') || window.sessionStorage.getItem('username')) : null,
    csrfToken: null as string | null,
    get storage() {
        if (!browser) return null;
        return window.localStorage.getItem('token') ? window.localStorage : window.sessionStorage;
    },

    async getCSRFToken() {
        if (!this.token) return null;
        try {
            const res = await fetch('/api/csrf', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) {
                const data = await res.json() as CSRFTokenResponse;
                this.csrfToken = data.csrfToken;
                return this.csrfToken;
            }
        } catch (e) {
            console.error('Failed to get CSRF token:', e);
        }
        return null;
    },

    async login(username: string, password: string, trustDevice: boolean = false) {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            const err = await res.json() as ErrorResponse;
            throw new Error(err.error || 'Login failed');
        }
        const data = await res.json() as LoginResponse;
        this.token = data.token;
        this.username = data.username;
        if (browser) {
            console.log('Login success, trustDevice:', trustDevice);
            const storage = trustDevice === true ? window.localStorage : window.sessionStorage;
            const other = trustDevice === true ? window.sessionStorage : window.localStorage;

            other.removeItem('token');
            other.removeItem('username');

            if (this.token) {
                storage.setItem('token', this.token);
                console.log('Token set in', trustDevice === true ? 'localStorage' : 'sessionStorage');
            }
            if (this.username) storage.setItem('username', this.username);
        }
        // Get CSRF token after login
        await this.getCSRFToken();
        return data;
    },

    logout() {
        this.token = null;
        this.username = null;
        this.csrfToken = null;
        if (browser) {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('username');
        }
    },

    async getLatestVault() {
        if (!this.token) throw new Error('Not authenticated');
        const res = await fetch('/api/vault', {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        if (res.status === 404) return null;
        if (!res.ok) {
            const err = await res.json() as ErrorResponse;
            throw new Error(err.error || 'Failed to get vault');
        }
        return res.json() as Promise<VaultDescription>;
    },

    async getLatestVaultMetadata() {
        if (!this.token) throw new Error('Not authenticated');
        const res = await fetch('/api/vault/metadata', {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to get metadata');
        }
        return res.json() as Promise<NewerVaultResponse>;
    },

    async saveVault(content: string) {
        if (!this.token) throw new Error('Not authenticated');

        // Ensure we have a CSRF token
        if (!this.csrfToken) {
            await this.getCSRFToken();
        }

        const res = await fetch('/api/vault', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                'X-CSRF-Token': this.csrfToken || ''
            },
            body: JSON.stringify({ content })
        });
        if (!res.ok) throw new Error('Failed to save vault');
        return res.json() as Promise<SaveVaultResponse>;
    },

    async getVaultHistory() {
        if (!this.token) throw new Error('Not authenticated');
        const res = await fetch('/api/vault/history', {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        if (!res.ok) throw new Error('Failed to list history');
        return res.json() as Promise<VaultDescription[]>;
    },

    async changePassword(oldPassword: string, newPassword: string) {
        if (!this.token) throw new Error('Not authenticated');

        // Ensure we have a CSRF token
        if (!this.csrfToken) {
            await this.getCSRFToken();
        }

        const res = await fetch('/api/user/password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                'X-CSRF-Token': this.csrfToken || ''
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update password');
        }
        const data = await res.json() as PasswordChangeResponse;
        if (data.token) {
            this.token = data.token;
            if (browser && this.token) {
                // Determine which storage was being used
                if (window.localStorage.getItem('token')) {
                    window.localStorage.setItem('token', this.token);
                } else if (window.sessionStorage.getItem('token')) {
                    window.sessionStorage.setItem('token', this.token);
                }
            }
            // Refresh CSRF token for the new auth token
            await this.getCSRFToken();
        }
        return data;
    },

    async vaultExists(username: string, token?: string) {
        const t = token || this.token;
        if (!t) return false;
        try {
            const res = await fetch('/api/vault/metadata', {
                headers: { 'Authorization': `Bearer ${t}` }
            });
            if (res.ok) {
                const data = await res.json() as NewerVaultResponse;
                return !!data.mtime;
            }
        } catch (e) {
            console.error('Failed to check vault existence:', e);
        }
        return false;
    },

    async deleteVault(filename: string) {
        if (!this.token) throw new Error('Not authenticated');

        // Ensure we have a CSRF token
        if (!this.csrfToken) {
            await this.getCSRFToken();
        }

        const res = await fetch(`/api/vault/history?filename=${encodeURIComponent(filename)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'X-CSRF-Token': this.csrfToken || ''
            }
        });
        if (!res.ok) {
            const err = await res.json() as ErrorResponse;
            throw new Error(err.error || 'Failed to delete vault');
        }
        return res.json() as Promise<DeleteVaultResponse>;
    }
};
