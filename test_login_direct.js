import { POST } from './src/routes/api/login/+server.ts';

async function test() {
    console.log('Starting login test...');
    const body = { username: 'auth_test', password: 'q' };
    const req = {
        json: async () => body,
        headers: new Map(),
        method: 'POST'
    };

    try {
        const res = await POST({ request: req });
        const data = await res.json();
        console.log('Result:', data);
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
