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

function writeStats(stats: Record<string, IpStats>) {
    if (browser) return;
    const release = await lockfile.lock(USERS_FILE);
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
const BLOCK_DURATION = process.env.RATE_LIMIT_TEST_MODE === 'true' ? 5000 : 15 * 60 * 1000; // 5s in test, 15m in prod
const MIN_DELAY = process.env.RATE_LIMIT_TEST_MODE === 'true' ? 100 : 1000; // 0.1s in test, 1s in prod
const MAX_DELAY = process.env.RATE_LIMIT_TEST_MODE === 'true' ? 1000 : 60000; // 1s in test, 60s in prod

function getStats(ip: string): IpStats {
    const allStats = readStats();
    const normalizedIp = normalizeIp(ip);
    if (!allStats[normalizedIp]) {
        return { failures: 0, lastAttempt: 0, blockedUntil: 0 };
    }
    return allStats[normalizedIp];
}

function saveStats(ip: string, stats: IpStats) {
    const normalizedIp = normalizeIp(ip);
    const allStats = readStats();
    allStats[normalizedIp] = stats;
    writeStats(allStats);
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

    if (failureCount === 0) return 0;
    if (failureCount >= MAX_FAILURES) return MAX_DELAY;

    const delay = MIN_DELAY + (MAX_DELAY - MIN_DELAY) * ((failureCount - 1) / (MAX_FAILURES - 1));
    return Math.floor(delay);
}

/**
 * Records a failed login attempt for an IP.
 */
export function recordFailure(ip: string) {
    if (browser) return;
    const stats = getStats(ip);
    stats.failures++;
    stats.lastAttempt = Date.now();

    if (stats.failures >= MAX_FAILURES) {
        stats.blockedUntil = Date.now() + BLOCK_DURATION;
    }
    saveStats(ip, stats);
}

/**
 * Resets the rate limiter for an IP (on success).
 */
export function recordSuccess(ip: string) {
    if (browser) return;
    const normalizedIp = normalizeIp(ip);
    const allStats = readStats();
    if (allStats[normalizedIp]) {
        delete allStats[normalizedIp];
        writeStats(allStats);
    }
}

/**
 * Clears all rate limiting stats.
 */
export function clearAll() {
    if (browser) return;
    writeStats({});
}
