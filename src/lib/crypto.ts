
const cryptoInstance = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : (typeof crypto !== 'undefined' ? crypto : null);

if (!cryptoInstance) {
    // In strict SSR without Node crypto, this might fail, but let's hope Node 20 environment provides it.
    // console.warn("Crypto not available");
}

export const generateKey = async (): Promise<CryptoKey> => {
    return cryptoInstance!.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
};

export const importKey = async (rawKey: string): Promise<CryptoKey> => {
    // rawKey is expected to be a base64 encoded string of the exported key
    const binaryKey = Uint8Array.from(atob(rawKey), c => c.charCodeAt(0));
    return cryptoInstance!.subtle.importKey(
        "raw",
        binaryKey,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
    );
};

export const exportKey = async (key: CryptoKey): Promise<string> => {
    const exported = await cryptoInstance!.subtle.exportKey("raw", key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
};

export const encrypt = async (data: string, key: CryptoKey): Promise<{ iv: string, cipher: string }> => {
    const iv = cryptoInstance!.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);

    const ciphertext = await cryptoInstance!.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encodedData
    );

    return {
        iv: btoa(String.fromCharCode(...iv)),
        cipher: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
    };
};

export const decrypt = async (cipher: string, iv: string, key: CryptoKey): Promise<string> => {
    const binaryCipher = Uint8Array.from(atob(cipher), c => c.charCodeAt(0));
    const binaryIv = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

    const decrypted = await cryptoInstance!.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: binaryIv
        },
        key,
        binaryCipher
    );

    return new TextDecoder().decode(decrypted);
};

export const pbkdf2 = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const keyMaterial = await cryptoInstance!.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    return cryptoInstance!.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as BufferSource,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
};
