import { i18n } from "$lib/stores/useI18n.svelte";

export class EncryptionKey {
    private _key: CryptoKey | null = null;

    constructor(key: CryptoKey | null = null) {
        this._key = key;
    }

    get get(): CryptoKey {
        if (this._key) return this._key;
        throw new Error(i18n.t('vault.no_encryption_key'));
    }

    set set(key: CryptoKey) {
        this._key = key;
    }

    remove() {
        this._key = null;
    }

    get isSet(): boolean {
        return this._key !== null;
    }
}
