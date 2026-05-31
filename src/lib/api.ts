import { browser } from '$app/environment';
import type { CSRFTokenResponse, DeleteVaultResponse, ErrorResponse, LoginResponse, NewerVaultResponse, PasswordChangeResponse, SaveVaultResponse, SessionResponse, VaultDescription } from './server/requestTypes';
import { i18n } from './stores/useI18n.svelte';

// Client-side API wrapper (updated for SvelteKit relative paths)

export const api = {
    username: browser ? (window.localStorage.getItem('username') || window.sessionStorage.getItem('username')) : null,
    csrfToken: null as string | null,
    onUnauthorized: null as (() => void) | null,
    get storage() {
        if (!browser) return null;
        return window.localStorage.getItem('username') ? window.localStorage : window.sessionStorage;
    },

    // Internal helper for headers
    async _getHeaders(includeCsrf: boolean = false): Promise<HeadersInit> {
        const headers: Record<string, string> = {};
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
        if (res.status === 401) {
            this.username = null;
            this.csrfToken = null;
            if (browser) {
                localStorage.removeItem('username');
                sessionStorage.removeItem('username');
            }
            if (this.onUnauthorized) {
                this.onUnauthorized();
            }
        }
        if (!res.ok) {
            let detail = '';
            try {
                const err = await res.json() as ErrorResponse;
                // If the error message from server is a translation key, translate it
                const serverError = err.error ? i18n.t(err.error) : '';
                detail = serverError ? `: ${serverError}` : '';
            } catch {
                detail = `: HTTP ${res.status}`;
            }
            throw new Error(`${errorMessage}${detail}`);
        }
        return res.json() as Promise<T>;
    },

    async getCSRFToken() {
        try {
            const res = await fetch('/api/csrf', {
                credentials: 'include'
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
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, trustDevice })
        });

        if (!res.ok) {
            const err = await res.json() as ErrorResponse;
            // Translate server error if possible
            const serverMsg = err.error ? i18n.t(err.error) : i18n.t('api.login_failed');
            throw new Error(serverMsg);
        }

        const data = await res.json() as LoginResponse;
        this.username = data.username;

        // Store CSRF token if provided in login response (optimization)
        if (data.csrfToken) {
            this.csrfToken = data.csrfToken;
        }

        if (browser) {
            const storage = trustDevice === true ? window.localStorage : window.sessionStorage;
            const other = trustDevice === true ? window.sessionStorage : window.localStorage;

            other.removeItem('username');

            if (this.username) storage.setItem('username', this.username);
        }

        // Only fetch if we didn't get it in the login response
        if (!this.csrfToken) {
            await this.getCSRFToken();
        }
        return data;
    },

    async renewToken() {
        const headers = await this._getHeaders(true);
        const res = await fetch('/api/renew', {
            method: 'POST',
            credentials: 'include',
            headers
        });

        if (!res.ok) {
            // If renewal fails, we might be truly unauthorized
            this.username = null;
            this.csrfToken = null;
            if (browser) {
                localStorage.removeItem('username');
                sessionStorage.removeItem('username');
            }
            if (res.status === 401 && this.onUnauthorized) {
                this.onUnauthorized();
            }
            return null;
        }

        const data = await res.json() as LoginResponse;
        this.username = data.username;
        if (data.csrfToken) {
            this.csrfToken = data.csrfToken;
        }
        return data;
    },

    async getSession() {
        try {
            const res = await fetch('/api/session', {
                credentials: 'include'
            });

            if (res.status === 404) return null; // No session is not an error here

            const data = await this._handleResponse<SessionResponse>(res, i18n.t('api.session_failed'));
            this.username = data.username;
            return data.username;
        } catch (e) {
            if (e instanceof Error && e.message.includes('HTTP 401')) {
                return null;
            }
            throw e;
        }
    },

    async logout() {
        this.username = null;
        this.csrfToken = null;
        if (browser) {
            localStorage.removeItem('username');
            sessionStorage.removeItem('username');
        }

        try {
            await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            console.error('Failed to logout cleanly:', e);
        }
    },

    async getLatestVault() {
        const res = await fetch('/api/vault', {
            credentials: 'include',
            headers: await this._getHeaders()
        });
        if (res.status === 404) return null;
        return this._handleResponse<VaultDescription>(res, i18n.t('api.vault_failed'));
    },

    async getLatestVaultMetadata() {
        const res = await fetch('/api/vault/metadata', {
            credentials: 'include',
            headers: await this._getHeaders()
        });
        return this._handleResponse<NewerVaultResponse>(res, i18n.t('api.metadata_failed'));
    },

    async saveVault(content: string) {
        const headers = await this._getHeaders(true);
        const res = await fetch('/api/vault', {
            method: 'POST',
            credentials: 'include',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        return this._handleResponse<SaveVaultResponse>(res, i18n.t('api.save_failed'));
    },

    async getVaultHistory() {
        const res = await fetch('/api/vault/history', {
            credentials: 'include',
            headers: await this._getHeaders()
        });
        return this._handleResponse<VaultDescription[]>(res, i18n.t('api.history_failed'));
    },

    async changePassword(oldPassword: string, newPassword: string) {
        const headers = await this._getHeaders(true);
        const res = await fetch('/api/user/password', {
            method: 'POST',
            credentials: 'include',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });

        const data = await this._handleResponse<PasswordChangeResponse>(res, i18n.t('api.password_failed'));
        await this.getCSRFToken();
        return data;
    },

    async vaultExists(username: string, token?: string) {
        const res = await fetch('/api/vault/metadata', {
            credentials: 'include'
        });

        if (res.status === 404) return false;

        const data = await this._handleResponse<NewerVaultResponse>(res, i18n.t('api.vault_exists_failed'));
        return !!data.mtime;
    },

    async deleteVault(filename: string) {
        const headers = await this._getHeaders(true);
        const res = await fetch(`/api/vault/history?filename=${encodeURIComponent(filename)}`, {
            method: 'DELETE',
            credentials: 'include',
            headers
        });
        return this._handleResponse<DeleteVaultResponse>(res, i18n.t('api.delete_failed'));
    }
};
