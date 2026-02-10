import { i18n } from "$lib/stores/useI18n.svelte";

export class EncryptionKey {
    key: CryptoKey | null;

    constructor (key : CryptoKey) {
        this.key = key;
    }
    
    getEncryptionKey () {
        if ( this.key ) return this.key;
        throw new Error(i18n.t('no EncryptionKey'));
    };
    
    setEncryptionKey (key : CryptoKey) {
        this.key = key;
    }

    removeEncryptionKey () {
        this.key = null;
    }
}
