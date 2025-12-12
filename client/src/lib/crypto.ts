
export const generateKey = async (): Promise<CryptoKey> => {
    return window.crypto.subtle.generateKey(
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
    return window.crypto.subtle.importKey(
        "raw",
        binaryKey,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
    );
};

export const exportKey = async (key: CryptoKey): Promise<string> => {
    const exported = await window.crypto.subtle.exportKey("raw", key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
};

export const encrypt = async (data: string, key: CryptoKey): Promise<{ iv: string, cipher: string }> => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);

    const ciphertext = await window.crypto.subtle.encrypt(
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

    const decrypted = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: binaryIv
        },
        key,
        binaryCipher
    );

    return new TextDecoder().decode(decrypted);
};

export const deriveKeyFromPassword = async (password: string): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    // For MVP we use a fixed salt. In production, salt should be unique per user/file.
    const salt = enc.encode("fixed-salt-for-mvp");

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
};
