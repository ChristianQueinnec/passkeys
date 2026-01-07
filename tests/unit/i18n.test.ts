import { describe, it, expect, beforeEach, vi } from 'vitest';
import { i18n } from '../../src/lib/stores/useI18n.svelte';
import { translations } from '../../src/lib/i18n/translations';

describe('I18n Store', () => {
    beforeEach(() => {
        i18n.setLanguage('en');
    });

    it('should default to English', () => {
        expect(i18n.language).toBe('en');
    });

    it('should change language', () => {
        i18n.setLanguage('fr');
        expect(i18n.language).toBe('fr');
    });

    it('should translate keys correctly in English', () => {
        i18n.setLanguage('en');
        expect(i18n.t('app.title')).toBe('Passkeys - Secure Vault');
        expect(i18n.t('auth.login')).toBe('Sign In');
    });

    it('should translate keys correctly in French', () => {
        i18n.setLanguage('fr');
        expect(i18n.t('app.title')).toBe('Passkeys - Coffre Sécurisé');
        expect(i18n.t('auth.login')).toBe('Se connecter');
    });

    it('should fallback to key if translation is missing', () => {
        expect(i18n.t('missing.key')).toBe('missing.key');
    });

    it('should interpolate parameters', () => {        
        expect(i18n.t('vault.history.delete_confirm', {
            filename: 'ABCD' })).toBe('Delete history snapshot ABCD?');
    });
});
