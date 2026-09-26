import { browser } from '$app/environment';

export interface ClientSettings {
    pollForUpdatesInterval: number;
    pollForUpdatesIntervalTest: number;
    inactivityTimeout: number;
    inactivityTimeoutTest: number;
    quickUnlockTimeout: number;
    clipboardTimeout: number;
    masterPasswordSalt: string;
    pbkdf2Iterations: number;
    pbkdf2IterationsTest: number;
    minEmailCount: number;
}

const SECURITY_SETTINGS_KEY = "passkeys_security_delays";

const defaultSettings: ClientSettings = {
    pollForUpdatesInterval: 60000,
    pollForUpdatesIntervalTest: 1000,
    inactivityTimeout: 900000, // 15 minutes
    inactivityTimeoutTest: 3600000,
    quickUnlockTimeout: 3600000,
    clipboardTimeout: 10000,
    masterPasswordSalt: "mvp_salt_fixed",
    pbkdf2Iterations: 100000,
    pbkdf2IterationsTest: 100,
    minEmailCount: 3
};

function createSettingsStore() {
    let current = $state<ClientSettings>(defaultSettings);
    let loaded = $state(false);

    function isTrustedDevice() {
        return browser && localStorage.getItem("passkeys_device_preference") === "safe";
    }

    function loadPersistedSecurityDelays() {
        if (!isTrustedDevice()) return;
        try {
            const stored = localStorage.getItem(SECURITY_SETTINGS_KEY);
            if (!stored) return;
            const parsed = JSON.parse(stored);
            if (Number.isFinite(parsed.inactivityTimeout) && Number.isFinite(parsed.quickUnlockTimeout)) {
                current = { ...current, inactivityTimeout: parsed.inactivityTimeout, quickUnlockTimeout: parsed.quickUnlockTimeout };
            }
        } catch (e) {
            console.warn("Failed to load persisted security settings", e);
        }
    }

    function updateSecurityDelays(inactivityMinutes: number, quickUnlockMinutes: number) {
        current = { ...current, inactivityTimeout: inactivityMinutes * 60000, quickUnlockTimeout: quickUnlockMinutes * 60000 };
        if (isTrustedDevice()) {
            try {
                localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify({ inactivityTimeout: current.inactivityTimeout, quickUnlockTimeout: current.quickUnlockTimeout }));
            } catch (e) {
                console.warn("Failed to persist security settings", e);
            }
        }
    }

    async function load() {
        try {
            const res = await fetch('/client-settings.json');
            if (res.ok) {
                const data = await res.json();
                current = { ...defaultSettings, ...data };
                loadPersistedSecurityDelays();
                loaded = true;
                console.log('Client settings loaded:', $state.snapshot(current));
            }
        } catch (e) {
            console.error('Failed to load client settings, using defaults:', e);
            loaded = true; // Still mark as loaded to unblock app
        }
    }

    function reset() {
        current = defaultSettings;
        loaded = false;
    }

    return {
        get current() { return current; },
        get loaded() { return loaded; },
        load,
        reset,
        isTrustedDevice,
        updateSecurityDelays
    };
}

export const settings = createSettingsStore();
