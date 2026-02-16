import { browser } from "$app/environment";
import fs from 'node:fs';
import path from 'node:path';
import lockfile from 'proper-lockfile';
import logger from './logger';
import settings from './server-settings.json';

const STATS_FILE = path.join(process.cwd(), settings.storage.dataDir, settings.storage.rateLimitFile);

interface IpStats {
    failures: number;
    lastAttempt: number;
    blockedUntil: number;
}

// In-memory cache
let inMemoryStats: Map<string, IpStats> | null = null;

function ensureDataDir() {
    if (browser) return;
    const dir = path.dirname(STATS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(STATS_FILE)) {
        try {
            fs.writeFileSync(STATS_FILE, '{}', 'utf8');
        } catch (e: any) {
            logger.error({ error: e.message, path: STATS_FILE }, 'Failed to initialize rate limiter stats file');
        }
    }
}

function loadStatsFromDisk(): Record<string, IpStats> {
    if (browser) return {};
    ensureDataDir();
    try {
        if (fs.existsSync(STATS_FILE)) {
            const data = fs.readFileSync(STATS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e: any) {
        logger.error({ error: e.message }, 'Failed to read rate limiter stats from disk');
    }
    return {};
}

function getInMemoryStats(): Map<string, IpStats> {
    if (inMemoryStats === null) {
        const stats = loadStatsFromDisk();
        inMemoryStats = new Map(Object.entries(stats));
    }
    return inMemoryStats;
}

async function persistStatsToDisk() {
    if (browser || !inMemoryStats) return;

    // We use lockfile to ensure only one process/thread writes to the file at a time
    // Even with in-memory cache, multiple SvelteKit processes might share the same data file
    let release;
    try {
        release = await lockfile.lock(STATS_FILE, { retries: 5 });
    } catch (e: any) {
        logger.error({ error: e.message }, 'Failed to acquire lock for rate limiter stats');
        return;
    }

    try {
        const statsObj = Object.fromEntries(inMemoryStats);
        fs.writeFileSync(STATS_FILE, JSON.stringify(statsObj, null, 2));
    } catch (e: any) {
        logger.error({ error: e.message }, 'Failed to write rate limiter stats to disk');
    } finally {
        await release();
    }
}

function normalizeIp(ip: string): string {
    if (!ip) return 'unknown';
    let normalized = ip;
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
        normalized = '127.0.0.1';
    } else if (ip.startsWith('::ffff:')) {
        normalized = ip.substring(7);
    }
    return normalized;
}

const MAX_FAILURES = settings.rateLimit.maxFailures;
let isTestMode = process.env.RATE_LIMIT_TEST_MODE === 'true';

const CONSTANTS = {
    PROD: {
        BLOCK_DURATION: settings.rateLimit.prod.blockDurationMs,
        MIN_DELAY: settings.rateLimit.prod.minDelayMs,
        MAX_DELAY: settings.rateLimit.prod.maxDelayMs,
    },
    TEST: {
        BLOCK_DURATION: settings.rateLimit.test.blockDurationMs,
        MIN_DELAY: settings.rateLimit.test.minDelayMs,
        MAX_DELAY: settings.rateLimit.test.maxDelayMs,
    }
};

function getConfig() {
    return isTestMode ? CONSTANTS.TEST : CONSTANTS.PROD;
}

export function setTestMode(enabled: boolean) {
    isTestMode = enabled;
}

// Prune stale entries from memory
const PRUNE_INTERVAL = settings.rateLimit.pruneIntervalMs;
const STALE_THRESHOLD = settings.rateLimit.staleThresholdMs;
if (!browser) {
    setInterval(() => {
        const stats = getInMemoryStats();
        const now = Date.now();
        let changed = false;
        for (const [ip, data] of stats.entries()) {
            if (now - data.lastAttempt > STALE_THRESHOLD && data.blockedUntil < now) {
                stats.delete(ip);
                changed = true;
            }
        }
        if (changed) {
            persistStatsToDisk().catch(e => logger.error({ error: e.message }, 'Failed to persist pruned stats'));
        }
    }, PRUNE_INTERVAL);
}

/**
 * Checks if an IP is currently blocked.
 */
export function isBlocked(ip: string): boolean {
    if (browser) return false;
    const normalizedIp = normalizeIp(ip);
    const stats = getInMemoryStats().get(normalizedIp);
    if (stats && stats.blockedUntil > Date.now()) {
        return true;
    }
    return false;
}

/**
 * Gets the calculated delay for an IP in milliseconds.
 */
export function getDelay(ip: string): number {
    if (browser) return 0;
    const normalizedIp = normalizeIp(ip);
    const stats = getInMemoryStats().get(normalizedIp);
    const failureCount = stats ? stats.failures : 0;

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
    const normalizedIp = normalizeIp(ip);
    const statsMap = getInMemoryStats();
    let stats = statsMap.get(normalizedIp);

    if (!stats) {
        stats = { failures: 0, lastAttempt: 0, blockedUntil: 0 };
    }

    stats.failures++;
    stats.lastAttempt = Date.now();

    if (stats.failures >= MAX_FAILURES) {
        stats.blockedUntil = Date.now() + getConfig().BLOCK_DURATION;
    }

    statsMap.set(normalizedIp, stats);
    await persistStatsToDisk();
}

/**
 * Resets the rate limiter for an IP (on success).
 */
export async function recordSuccess(ip: string) {
    if (browser) return;
    const normalizedIp = normalizeIp(ip);
    const statsMap = getInMemoryStats();
    if (statsMap.has(normalizedIp)) {
        statsMap.delete(normalizedIp);
        await persistStatsToDisk();
    }
}

/**
 * Clears all rate limiting stats.
 */
export async function clearAll() {
    if (browser) return;
    inMemoryStats = new Map();
    await persistStatsToDisk();
}
