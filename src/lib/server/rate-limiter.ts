import { browser } from "$app/environment";
import fs from 'node:fs';
import path from 'node:path';
import lockfile from 'proper-lockfile';

const STATS_FILE = path.join(process.cwd(), 'data', 'rate-limiter-stats.json');

function ensureDataDir() {
    if (browser) return;
    const dir = path.dirname(STATS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(STATS_FILE)) {
        fs.writeFileSync(STATS_FILE, '{}', 'utf8');
    }
}

interface IpStats {
    failures: number;
    lastAttempt: number;
    blockedUntil: number;
}

function readStats(): Record<string, IpStats> {
    if (browser) return {};
    try {
        ensureDataDir();
        if (fs.existsSync(STATS_FILE)) {
            const data = fs.readFileSync(STATS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        // Silently ignore
    }
    return {};
}

async function writeStats(stats: Record<string, IpStats>) {
    if (browser) return;
    ensureDataDir();
    const release = await lockfile.lock(STATS_FILE);
    try {
        ensureDataDir();
        fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    } catch (e) {
        // Silently ignore
    } finally {
        release();
    }
}

function normalizeIp(ip: string): string {
    if (!ip) return 'unknown';
    let normalized = ip;
    if (ip === '::1') {
        normalized = '127.0.0.1';
    } else if (ip.startsWith('::ffff:')) {
        normalized = ip.substring(7);
    }
    return normalized;
}

const MAX_FAILURES = 5;
// Configuration with defaults
let isTestMode = process.env.RATE_LIMIT_TEST_MODE === 'true';

const CONSTANTS = {
    PROD: {
        BLOCK_DURATION: 15 * 60 * 1000, // 15m
        MIN_DELAY: 1000,                // 1s
        MAX_DELAY: 60000,               // 60s
    },
    TEST: {
        BLOCK_DURATION: 5000,           // 5s
        MIN_DELAY: 100,                 // 0.1s
        MAX_DELAY: 1000,                // 1s
    }
};

function getConfig() {
    return isTestMode ? CONSTANTS.TEST : CONSTANTS.PROD;
}

export function setTestMode(enabled: boolean) {
    isTestMode = enabled;
}




function getStats(ip: string): IpStats {
    const allStats = readStats();
    const normalizedIp = normalizeIp(ip);
    if (!allStats[normalizedIp]) {
        return { failures: 0, lastAttempt: 0, blockedUntil: 0 };
    }
    return allStats[normalizedIp];
}

async function saveStats(ip: string, stats: IpStats) {
    const normalizedIp = normalizeIp(ip);
    const allStats = readStats();
    allStats[normalizedIp] = stats;
    await writeStats(allStats);
}

/**
 * Checks if an IP is currently blocked.
 */
export function isBlocked(ip: string): boolean {
    if (browser) return false;
    const stats = getStats(ip);
    if (stats.blockedUntil > Date.now()) {
        return true;
    }
    return false;
}

/**
 * Gets the calculated delay for an IP in milliseconds.
 */
export function getDelay(ip: string): number {
    if (browser) return 0;
    const stats = getStats(ip);
    const failureCount = stats.failures;

    const config = getConfig();

    if (failureCount === 0) return 0;
    if (failureCount >= MAX_FAILURES) return config.MAX_DELAY;

    const delay = config.MIN_DELAY + (config.MAX_DELAY - config.MIN_DELAY) * ((failureCount - 1) / (MAX_FAILURES - 1));
    return Math.floor(delay);
}

/**
 * Records a failed login attempt for an IP.
 */
export async function recordFailure(ip: string) {
    if (browser) return;
    const stats = getStats(ip);
    stats.failures++;
    stats.lastAttempt = Date.now();

    if (stats.failures >= MAX_FAILURES) {
        stats.blockedUntil = Date.now() + getConfig().BLOCK_DURATION;
    }
    await saveStats(ip, stats);
}

/**
 * Resets the rate limiter for an IP (on success).
 */
export async function recordSuccess(ip: string) {
    if (browser) return;
    const normalizedIp = normalizeIp(ip);
    const allStats = readStats();
    if (allStats[normalizedIp]) {
        delete allStats[normalizedIp];
        await writeStats(allStats);
    }
}

/**
 * Clears all rate limiting stats.
 */
export async function clearAll() {
    if (browser) return;
    await writeStats({});
}
