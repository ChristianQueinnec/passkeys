const API_URL = 'http://localhost:3000/api';

export const api = {
    token: localStorage.getItem('token') || '',

    setToken(token: string) {
        this.token = token;
        localStorage.setItem('token', token);
    },

    async request(method: string, path: string, body?: any) {
        const headers: any = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const res = await fetch(`${API_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Request failed');
        }
        return data;
    },

    async login(username, password) {
        const data = await this.request('POST', '/login', { username, password });
        if (data.token) {
            this.setToken(data.token);
        }
        return data;
    },

    async getLatestVault() {
        const res = await this.request('GET', '/vault');
        // If content is null, it means new user. Return null.
        return res.content;
    },

    saveVault(content: string) {
        return this.request('POST', '/vault', { content });
    },

    getVaultHistory() {
        return this.request('GET', '/vault/history');
    }
};
