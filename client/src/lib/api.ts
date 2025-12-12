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

    listFiles() {
        return this.request('GET', '/files');
    },

    saveFile(filename, content) {
        return this.request('POST', '/files', { filename, content });
    },

    getFile(filename) {
        return this.request('GET', `/files/${filename}`);
    },

    deleteFile(filename) {
        return this.request('DELETE', `/files/${filename}`);
    }
};
