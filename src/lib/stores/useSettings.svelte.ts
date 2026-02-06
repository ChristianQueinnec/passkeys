import { browser } from '$app/environment';

export interface ClientSettings {
    pollForUpdatesInterval: number;
    pollForUpdatesIntervalTest: number;
    inactivityTimeout: number;
    inactivityTimeoutTest: number;
    clipboardTimeout: number;
    masterPasswordSalt: string;
    pbkdf2Iterations: number;
    pbkdf2IterationsTest: number;
}

const defaultSettings: ClientSettings = {
    pollForUpdatesInterval: 60000,
    pollForUpdatesIntervalTest: 1000,
    inactivityTimeout: 60000,
    inactivityTimeoutTest: 1000,
    clipboardTimeout: 10000,
    masterPasswordSalt: "mvp_salt_fixed",
    pbkdf2Iterations: 100000,
    pbkdf2IterationsTest: 100
};

function createSettingsStore() {
    let current = $state<ClientSettings>(defaultSettings);
    let loaded = $state(false);

    async function load() {
        try {
            const res = await fetch('/client-settings.json');
            if (res.ok) {
                const data = await res.json();
                current = { ...defaultSettings, ...data };
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
        reset
    };
}

export const settings = createSettingsStore();
