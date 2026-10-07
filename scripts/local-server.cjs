#!/usr/bin/env node
const os = require('node:os');
const path = require('node:path');
const { chmodSync, closeSync, mkdirSync, openSync, readFileSync, writeFileSync } = require('node:fs');
const { randomBytes } = require('node:crypto');

const root = process.pkg ? path.dirname(process.execPath) : path.resolve(__dirname, '..');
const dataDir = path.resolve(process.env.PASSKEYS_DATA_DIR || path.join(os.homedir(), '.config', 'passkeys'));
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
if (!process.env.JWT_SECRET) {
    const secretFile = path.join(dataDir, '.jwt-secret');
    try { process.env.JWT_SECRET = readFileSync(secretFile, 'utf8').trim(); } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    if (!process.env.JWT_SECRET) {
        const secret = randomBytes(32).toString('hex');
        const fd = openSync(secretFile, 'wx', 0o600);
        writeFileSync(fd, `${secret}\n`, 'utf8');
        closeSync(fd);
        chmodSync(secretFile, 0o600);
        process.env.JWT_SECRET = secret;
    }
}
process.env.PASSKEYS_DATA_DIR = dataDir;
process.env.NODE_ENV ||= 'production';
process.env.HOST ||= '127.0.0.1';
process.env.PORT ||= '54123';
process.env.ORIGIN ||= `http://${process.env.HOST}:${process.env.PORT}`;
process.chdir(root);
require('../build/server.cjs');
