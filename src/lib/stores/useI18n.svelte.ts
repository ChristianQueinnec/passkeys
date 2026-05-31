import { browser } from '$app/environment';
import { translations, type Language } from '$lib/i18n/translations';

class I18nStore {
    language = $state<Language>('en');

    constructor() {
        if (browser) {
            const stored = localStorage.getItem('app_language') as Language;
            if (stored && translations[stored]) {
                this.language = stored;
            } else {
                const navLang = navigator.language.split('-')[0] as Language;
                if (translations[navLang]) {
                    this.language = navLang;
                }
            }
        }
    }

    setLanguage(lang: Language) {
        if (translations[lang]) {
            this.language = lang;
            if (browser) {
                try {
                    localStorage.setItem('app_language', lang);
                } catch (e) {
                    console.warn('Failed to save language preference', e);
                }
            }
        }
    }

    t(key: string, params: Record<string, string> = {}): string {
        const dict = translations[this.language];
        let text = (dict as any)[key] || key;

        for (const [pKey, pValue] of Object.entries(params)) {
            text = text.replace(`{${pKey}}`, pValue);
        }

        return text;
    }
}

export const i18n = new I18nStore();
