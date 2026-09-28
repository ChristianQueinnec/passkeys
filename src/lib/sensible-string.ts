/**
 * Stores a string in mutable UTF-8 bytes so the backing storage can be
 * overwritten when the value is no longer needed.
 *
 * This is best-effort protection: JavaScript strings are immutable, and
 * callers should avoid retaining the value returned by {@link get} longer
 * than necessary.
 */
export class SensibleString {
    private static readonly encoder = new TextEncoder();
    private static readonly decoder = new TextDecoder();
    private static readonly randomChunkSize = 65_536;

    private bytes: Uint8Array | null;

    constructor(value: string) {
        this.bytes = SensibleString.encoder.encode(value);
    }

    /** Returns the value while it has not been erased. */
    get(): string {
        if (this.bytes === null) {
            throw new Error('sensible string has been erased');
        }

        return SensibleString.decoder.decode(this.bytes);
    }

    /** Whether the mutable backing storage has already been erased. */
    get erased(): boolean {
        return this.bytes === null;
    }

    /** Overwrites and releases the backing storage. This operation is idempotent. */
    erase(): void {
        if (this.bytes === null) {
            return;
        }

        for (let offset = 0; offset < this.bytes.length; offset += SensibleString.randomChunkSize) {
            const end = Math.min(offset + SensibleString.randomChunkSize, this.bytes.length);
            globalThis.crypto.getRandomValues(this.bytes.subarray(offset, end));
        }
        this.bytes.fill(0);
        this.bytes = null;
    }
}

    
