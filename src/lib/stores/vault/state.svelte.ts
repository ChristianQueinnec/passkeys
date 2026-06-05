import type { PasswordEntry, HistoryItem, CipheredVaultData } from "$lib/types";
import type { EncryptionKey } from "$lib/vaultkey";
import type { EasyUnlockChallenge } from "$lib/vault/easyUnlock";

export class VaultState {
    _items = $state<PasswordEntry[]>([]);
    selectedItem = $state<PasswordEntry | null>(null);
    editingItem = $state<PasswordEntry | null>(null);
    isCreating = $state(false);
    isDirty = $state(false);
    lastSavedDate = $state<string | null>(null);
    offlineMode = $state(false);
    isLoading = $state(false);
    isSyncing = $state(false);
    encryptedVaultData = $state<CipheredVaultData | null>(null);
    newerVersionAvailable = $state(false);
    showHistoryModal = $state(false);
    historyFiles = $state<HistoryItem[]>([]);
    dirtySecrets = $state<Map<string, PasswordEntry>>(new Map());
    clipboardRemainingTime = $state<number | null>(null);
    easyUnlockChallenge = $state<EasyUnlockChallenge | null>(null);
    encryptionKey: EncryptionKey;
    onLock: () => void;

    constructor(encryptionKey: EncryptionKey, onLock: () => void) {
        this.encryptionKey = encryptionKey;
        this.onLock = onLock;
    }
}
