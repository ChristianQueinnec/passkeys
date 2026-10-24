import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, type ChildProcess } from 'node:child_process';

const SCRIPT_PATH = path.resolve('scripts/quickstart.mjs');

function createTempProject(): string {
    const tempDir = fs.mkdtempSync(path.join('/tmp', 'passkeys-test-quickstart-'));
    fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
            name: 'mock-passkeys-test',
            scripts: {
                dev: "node -e 'console.log(\"MOCK_DEV_SERVER_READY\"); setInterval(() => {}, 1000)'",
            },
        }, null, 2)
    );
    return tempDir;
}

function runQuickstart(
    cwd: string,
    port: number,
    onReady?: (child: ChildProcess, output: string) => void
): Promise<{ output: string; exitCode: number | null }> {
    return new Promise((resolve, reject) => {
        let output = '';
        const child = spawn(process.execPath, [SCRIPT_PATH], {
            cwd,
            env: {
                ...process.env,
                PORT: String(port),
            },
        });

        let readyTriggered = false;

        child.stdout?.on('data', (data) => {
            const chunk = data.toString();
            output += chunk;
            if (!readyTriggered && output.includes('MOCK_DEV_SERVER_READY')) {
                readyTriggered = true;
                if (onReady) {
                    onReady(child, output);
                } else {
                    child.kill('SIGINT');
                }
            }
        });

        child.stderr?.on('data', (data) => {
            output += data.toString();
        });

        const timeout = setTimeout(() => {
            child.kill('SIGKILL');
            reject(new Error(`Quickstart script timed out. Output captured:\n${output}`));
        }, 10000);

        child.on('exit', (code) => {
            clearTimeout(timeout);
            resolve({ output, exitCode: code });
        });

        child.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

describe('scripts/quickstart.mjs', () => {
    it('creates data/users.json with synthesized username and random password in a clean temp directory', async () => {
        const tempDir = createTempProject();
        const testPort = 45678;

        try {
            let capturedOutput = '';
            const result = await runQuickstart(tempDir, testPort, (child, output) => {
                capturedOutput = output;
                child.kill('SIGINT');
            });

            const combinedOutput = result.output || capturedOutput;

            // 1. Verify console outputs
            expect(combinedOutput).toContain('Passkeys Local Quickstart');
            expect(combinedOutput).toContain('What this script is doing:');
            expect(combinedOutput).toContain('Your Login Credentials:');
            expect(combinedOutput).toContain(`http://localhost:${testPort}`);
            expect(combinedOutput).toContain('How to completely remove Passkeys and its data:');

            // 2. Verify data/ directory and users.json creation
            const usersFile = path.join(tempDir, 'data', 'users.json');
            expect(fs.existsSync(usersFile)).toBe(true);

            const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
            expect(Array.isArray(users)).toBe(true);
            expect(users).toHaveLength(1);

            const { username, password } = users[0];
            expect(typeof username).toBe('string');
            expect(username).toContain('@');
            expect(username.endsWith(`@${os.hostname().split('.')[0].toLowerCase().replace(/[^a-z0-9.-]/g, '')}`)).toBe(true);

            expect(typeof password).toBe('string');
            expect(password).toHaveLength(8);
            // Verify no ambiguous characters (0, O, 1, l, I, i)
            expect(password).toMatch(/^[2-9a-km-zA-HJ-KM-Z]{8}$/);

            // Output displays the created credentials
            expect(combinedOutput).toContain(username);
            expect(combinedOutput).toContain(password);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('reuses existing credentials when data/users.json already exists without overwriting', async () => {
        const tempDir = createTempProject();
        const testPort = 45679;
        const dataDir = path.join(tempDir, 'data');
        fs.mkdirSync(dataDir, { recursive: true });

        const existingUser = {
            username: 'custom-admin@localdomain',
            password: 'SuperSecretCustomPassword99',
        };
        fs.writeFileSync(
            path.join(dataDir, 'users.json'),
            JSON.stringify([existingUser], null, 2)
        );

        try {
            let capturedOutput = '';
            const result = await runQuickstart(tempDir, testPort, (child, output) => {
                capturedOutput = output;
                child.kill('SIGINT');
            });

            const combinedOutput = result.output || capturedOutput;

            expect(combinedOutput).toContain('Reusing existing credentials in data/users.json');
            expect(combinedOutput).toContain('custom-admin@localdomain');
            expect(combinedOutput).toContain('(using existing credentials from data/users.json)');

            // Verify file content was not overwritten
            const users = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf-8'));
            expect(users).toEqual([existingUser]);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('gracefully handles SIGINT shutdown', async () => {
        const tempDir = createTempProject();
        const testPort = 45680;

        try {
            const result = await runQuickstart(tempDir, testPort, (child) => {
                child.kill('SIGINT');
            });

            expect(result.exitCode).toBe(0);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
});
