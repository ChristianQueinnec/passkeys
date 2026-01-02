
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
    const uint8Array = new Uint8Array(exported);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
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

    // Convert IV to base64 without spread operator
    let ivBinary = '';
    for (let i = 0; i < iv.length; i++) {
        ivBinary += String.fromCharCode(iv[i]);
    }

    // Convert ciphertext to base64 without spread operator
    const cipherArray = new Uint8Array(ciphertext);
    let cipherBinary = '';
    for (let i = 0; i < cipherArray.length; i++) {
        cipherBinary += String.fromCharCode(cipherArray[i]);
    }

    return {
        iv: btoa(ivBinary),
        cipher: btoa(cipherBinary)
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

export const pbkdf2 = async (password: string, salt: Uint8Array, iterations: number = 100000): Promise<CryptoKey> => {
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
            iterations: iterations,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
};
