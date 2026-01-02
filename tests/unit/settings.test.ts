import { describe, it, expect, beforeEach, vi } from 'vitest';
import { settings } from '../../src/lib/stores/useSettings.svelte';

describe('Settings Store', () => {
    beforeEach(() => {
        settings.reset();
        vi.clearAllMocks();
    });

    it('should have default settings initially', () => {
        expect(settings.current.pollForUpdatesInterval).toBe(60000);
        expect(settings.current.masterPasswordSalt).toBe('mvp_salt_fixed');
    });

    it('should mock loading settings from server', async () => {
        const mockSettings = {
            pollForUpdatesInterval: 30000,
            inactivityTimeout: 120000
        };

        // Mock fetch
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockSettings)
        });

        await settings.load();

        expect(settings.current.pollForUpdatesInterval).toBe(30000);
        expect(settings.current.inactivityTimeout).toBe(120000);
        // Preserves other defaults
        expect(settings.current.masterPasswordSalt).toBe('mvp_salt_fixed');
        expect(settings.loaded).toBe(true);
    });

    it('should handle fetch error by keeping defaults', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        await settings.load();

        expect(settings.current.pollForUpdatesInterval).toBe(60000);
        expect(settings.loaded).toBe(true);
    });
});
