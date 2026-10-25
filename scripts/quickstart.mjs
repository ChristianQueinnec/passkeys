#!/usr/bin/env node

/**
 * Passkeys Local Quickstart
 * Compatible with: Linux, macOS, Windows
 * Requirements: Node.js >= 18 (no npm install required to run this script)
 */

import os from 'node:os';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}`;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// 1. Synthesize username: <os_user>@<hostname> (sanitized, lowercase)
function getSynthesizedUsername() {
    let rawUser = 'user';
    try {
        rawUser = os.userInfo().username || process.env.USER || process.env.USERNAME || 'user';
    } catch {
        rawUser = process.env.USER || process.env.USERNAME || 'user';
    }
    const rawHost = os.hostname().split('.')[0] || 'localhost';

    const cleanUser = rawUser.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const cleanHost = rawHost.toLowerCase().replace(/[^a-z0-9.-]/g, '');
    return `${cleanUser}@${cleanHost}`;
}

// 2. Generate unambiguous random password (8 alphanumeric characters, avoiding 0, O, 1, l, I, i)
function generateRandomPassword(length = 8) {
    const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
    }
    return result;
}

// 3. Generate a secure random JWT_SECRET
function generateJwtSecret() {
    return crypto.randomBytes(32).toString('hex');
}

// ANSI colors (disabled if no TTY)
const useColor = Boolean(process.stdout.isTTY || process.stderr.isTTY);
const c = {
    red: (s) => (useColor ? `\x1b[31m${s}\x1b[0m` : s),
    green: (s) => (useColor ? `\x1b[32m${s}\x1b[0m` : s),
    cyan: (s) => (useColor ? `\x1b[36m${s}\x1b[0m` : s),
    yellow: (s) => (useColor ? `\x1b[33m${s}\x1b[0m` : s),
    bold: (s) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
    dim: (s) => (useColor ? `\x1b[2m${s}\x1b[0m` : s),
};

console.log('\n' + c.bold('===================================================='));
console.log(c.bold('             Passkeys Local Quickstart              '));
console.log(c.bold('====================================================\n'));

// Preflight check: Ensure quickstart is run from the root of a Passkeys workspace
const PKG_FILE = path.resolve(process.cwd(), 'package.json');
if (!fs.existsSync(PKG_FILE)) {
    console.error(c.bold(c.red('❌ Error: Passkeys repository not found in current directory.')));
    console.error(`Could not find ${c.bold('package.json')} in:\n  ${process.cwd()}\n`);
    console.error('quickstart.mjs requires the Passkeys codebase.');
    console.error('\n' + c.cyan('To clone and run Passkeys from scratch, run:') + '\n');
    console.error(c.bold('  git clone https://github.com/ChristianQueinnec/passkeys.git'));
    console.error(c.bold('  cd passkeys'));
    console.error(c.bold('  npm install'));
    console.error(c.bold('  ./scripts/quickstart.mjs\n'));
    console.error(c.dim('Or in a single command:\n'));
    console.error(c.bold('  git clone https://github.com/ChristianQueinnec/passkeys.git && cd passkeys && npm install && ./scripts/quickstart.mjs\n'));
    process.exit(1);
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
}

// Setup user credentials
let username;
let password;
let isNewUser = false;

if (fs.existsSync(USERS_FILE)) {
    try {
        const existing = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        if (Array.isArray(existing) && existing.length > 0) {
            username = existing[0].username;
            password = '(using existing credentials from data/users.json)';
        }
    } catch {
        // Fall back to generating new user if corrupted
    }
}

if (!username) {
    username = getSynthesizedUsername();
    password = generateRandomPassword(8);
    isNewUser = true;

    // Passkeys auto-hashes plaintext passwords on first server startup
    fs.writeFileSync(USERS_FILE, JSON.stringify([{ username, password }], null, 2), {
        mode: 0o600,
    });
}

const jwtSecret = generateJwtSecret();

// Explain what is created
console.log(c.cyan('What this script is doing:'));
console.log('  1. Generated secure session keys in memory (JWT secret).');
if (isNewUser) {
    console.log(`  2. Initialized ${c.bold('data/users.json')} with your synthesized local login.`);
    console.log('     (The server will automatically hash this password with PBKDF2 on first start).');
} else {
    console.log(`  2. Reusing existing credentials in ${c.bold('data/users.json')}.`);
}
console.log('  3. Starting the Passkeys web server.\n');

console.log(c.green('----------------------------------------------------'));
console.log(c.bold(' Your Login Credentials:'));
console.log(`   Login / Username :  ${c.bold(c.green(username))}`);
if (isNewUser) {
    console.log(`   Password         :  ${c.bold(c.yellow(password))}`);
    console.log(c.dim('   (Note: Save this password! You will need it to log in).'));
} else {
    console.log(`   Password         :  ${c.dim(password)}`);
}
console.log(`   Web Interface    :  ${c.bold(c.cyan(URL))}`);
console.log(c.green('----------------------------------------------------\n'));

// Display complete removal instructions
console.log(c.yellow('How to completely remove Passkeys and its data:'));
console.log('  1. Stop this server anytime with ' + c.bold('Ctrl+C') + '.');
console.log(`  2. Delete server data: ` + c.bold(process.platform === 'win32' ? 'rmdir /s /q data' : 'rm -rf data/'));
console.log('  3. Clear browser cache/storage for ' + c.bold(URL) + ' (removes offline vault copy).\n');

console.log(c.dim('Starting server...\n'));

// Launch the Passkeys server using npm run dev or preview
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const server = spawn(npmCmd, ['run', 'dev', '--', '--port', String(PORT)], {
    stdio: 'inherit',
    env: {
        ...process.env,
        PORT: String(PORT),
        JWT_SECRET: jwtSecret,
    },
});

server.on('error', (err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
});

// Handle graceful exit
function handleExit() {
    console.log('\n' + c.yellow('Shutting down Passkeys server...'));
    server.kill();
    process.exit(0);
}

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
