import { browser } from '$app/environment';
import type { CSRFTokenResponse, DeleteVaultResponse, ErrorResponse, LoginResponse, NewerVaultResponse, PasswordChangeResponse, SaveVaultResponse, VaultDescription } from './server/requestTypes';

// Client-side API wrapper (updated for SvelteKit relative paths)

export const api = {
    token: browser ? (window.localStorage.getItem('token') || window.sessionStorage.getItem('token')) : null,
    username: browser ? (window.localStorage.getItem('username') || window.sessionStorage.getItem('username')) : null,
    csrfToken: null as string | null,
    get storage() {
        if (!browser) return null;
        return window.localStorage.getItem('token') ? window.localStorage : window.sessionStorage;
    },

    // Internal helper for headers
    async _getHeaders(includeCsrf: boolean = false): Promise<HeadersInit> {
        const headers: Record<string, string> = {};
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        if (includeCsrf) {
            if (!this.csrfToken) {
                await this.getCSRFToken();
            }
            if (this.csrfToken) {
                headers['X-CSRF-Token'] = this.csrfToken;
            }
        }
        return headers;
    },

    // Internal helper for response handling
    async _handleResponse<T>(res: Response, errorMessage: string): Promise<T> {
        if (!res.ok) {
            let detail = '';
            try {
                const err = await res.json() as ErrorResponse;
                detail = err.error ? `: ${err.error}` : '';
            } catch {
                detail = `: HTTP ${res.status}`;
            }
            throw new Error(`${errorMessage}${detail}`);
        }
        return res.json() as Promise<T>;
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

        // Store CSRF token if provided in login response (optimization)
        if (data.csrfToken) {
            this.csrfToken = data.csrfToken;
        }

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

        // Only fetch if we didn't get it in the login response
        if (!this.csrfToken) {
            await this.getCSRFToken();
        }
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
            headers: await this._getHeaders()
        });
        if (res.status === 404) return null;
        return this._handleResponse<VaultDescription>(res, 'Failed to get vault');
    },

    async getLatestVaultMetadata() {
        if (!this.token) throw new Error('Not authenticated');
        const res = await fetch('/api/vault/metadata', {
            headers: await this._getHeaders()
        });
        return this._handleResponse<NewerVaultResponse>(res, 'Failed to get metadata');
    },

    async saveVault(content: string) {
        if (!this.token) throw new Error('Not authenticated');

        const headers = await this._getHeaders(true);
        const res = await fetch('/api/vault', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        return this._handleResponse<SaveVaultResponse>(res, 'Failed to save vault');
    },

    async getVaultHistory() {
        if (!this.token) throw new Error('Not authenticated');
        const res = await fetch('/api/vault/history', {
            headers: await this._getHeaders()
        });
        return this._handleResponse<VaultDescription[]>(res, 'Failed to list history');
    },

    async changePassword(oldPassword: string, newPassword: string) {
        if (!this.token) throw new Error('Not authenticated');

        const headers = await this._getHeaders(true);
        const res = await fetch('/api/user/password', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });

        const data = await this._handleResponse<PasswordChangeResponse>(res, 'Failed to update password');

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
            // If the server doesn't provide it in this response, fetch it
            await this.getCSRFToken();
        }
        return data;
    },

    async vaultExists(username: string, token?: string) {
        const t = token || this.token;
        if (!t) return false;

        const res = await fetch('/api/vault/metadata', {
            headers: { 'Authorization': `Bearer ${t}` }
        });

        if (res.status === 404) return false;

        const data = await this._handleResponse<NewerVaultResponse>(res, 'Failed to check vault existence');
        return !!data.mtime;
    },

    async deleteVault(filename: string) {
        if (!this.token) throw new Error('Not authenticated');

        const headers = await this._getHeaders(true);
        const res = await fetch(`/api/vault/history?filename=${encodeURIComponent(filename)}`, {
            method: 'DELETE',
            headers
        });
        return this._handleResponse<DeleteVaultResponse>(res, 'Failed to delete vault');
    }
};
