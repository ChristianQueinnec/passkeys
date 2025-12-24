<script lang="ts">
    import { onMount, tick, onDestroy } from "svelte";
    import { api } from "$lib/api";
    import { decrypt, encrypt } from "$lib/crypto";
    import Editor from "$lib/components/Editor.svelte";
    import Modal from "$lib/components/Modal.svelte";
    import HistoryModal from "$lib/components/HistoryModal.svelte";
    import DetailsModal from "$lib/components/DetailsModal.svelte";
    import EditorModal from "$lib/components/EditorModal.svelte";
    import PasswordList from "$lib/components/PasswordList.svelte";
    import {
        sortPasswordEntries,
        filterPasswordEntries,
        normalizeVaultItems,
    } from "$lib/vault";
    import {
        type PasswordEntry,
        type HistoryItem,
        type CipheredVaultData,
    } from "$lib/types";
    import { browser } from "$app/environment";

    let { encryptionKey, username, onToggleView } = $props();

    let items = $state<PasswordEntry[]>([]);
    let filteredFiles = $state<PasswordEntry[]>([]);
    let filter = $state("");

    let selectedItem = $state<PasswordEntry | null>(null); // For details view
    let editingItem = $state<PasswordEntry | null>(null); // For editor
    let isCreating = $state(false);

    let isDirty = $state(false); // New dirty state
    let lastSavedDate = $state<string | null>(null);
    let offlineMode = $state(false); // Warning for offline/outdated

    let isLoading = false; // Prevent saves during load
    let isSyncing = $state(false); // Syncing state

    let encryptedVaultData = $state<CipheredVaultData | null>(null);
    let newerVersionAvailable = $state(false);
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    let isMemoryCleared = $state(false);
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    let restorePromise: Promise<void> | null = null;

    // History state
    let showHistoryModal = $state(false);
    let historyFiles = $state<HistoryItem[]>([]);

    // Load vault on mount
    onMount(loadVault);

    let clipboardTimeout: ReturnType<typeof setTimeout> | null = null;

    onMount(() => {
        resetTimer();
        window.addEventListener("mousemove", resetTimer);
        window.addEventListener("keydown", resetTimer);
        window.addEventListener("click", resetTimer);
        window.addEventListener("scroll", resetTimer);
        window.addEventListener("touchstart", resetTimer);
    });

    onDestroy(() => {
        if (clipboardTimeout) {
            clearTimeout(clipboardTimeout);
        }
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
        }
        if (pollTimer) {
            clearInterval(pollTimer);
        }
        if (browser) {
            window.removeEventListener("mousemove", resetTimer);
            window.removeEventListener("keydown", resetTimer);
            window.removeEventListener("click", resetTimer);
            window.removeEventListener("scroll", resetTimer);
            window.removeEventListener("touchstart", resetTimer);
        }
    });

    function resetTimer() {
        if (inactivityTimer) clearTimeout(inactivityTimer);

        if (isMemoryCleared) {
            // Avoid multiple restores firing at once
            if (!restorePromise) {
                restorePromise = restoreSensitiveData().finally(() => {
                    restorePromise = null;
                });
            }
        }

        inactivityTimer = setTimeout(() => {
            clearSensitiveData();
        }, 60000); // 1 minute
    }

    function clearSensitiveData() {
        items = items.map((item) => ({ id: item.id, title: item.title }));
        filteredFiles = [];
        selectedItem = null;
        editingItem = null;
        historyFiles = [];
        isMemoryCleared = true;
    }

    async function restoreSensitiveData() {
        if (!isMemoryCleared) return;
        if (!encryptedVaultData || !encryptionKey) {
            alert("No encrypted vault data or encryption key");
            return;
        }
        try {
            const jsonStr = await decrypt(
                encryptedVaultData.cipher,
                encryptedVaultData.iv,
                encryptionKey,
            );
            const unsorted = JSON.parse(jsonStr);
            items = sortPasswordEntries(unsorted);
            isMemoryCleared = false;
        } catch (e) {
            console.log("Failed to restore vault from memory", e);
            alert("Failed to restore vault from memory");
            // Should probably force logout or full reload if this fails
        }
    }

    async function loadVault() {
        isLoading = true; // Disable saves during load
        let unsortedItems: PasswordEntry[] = [];
        let vaultContent = null;
        try {
            const start = Date.now();
            vaultContent = await api.getLatestVault();
            if (vaultContent) {
                offlineMode = false;
                if (!Array.isArray(vaultContent)) {
                    // Save to localStorage for offline use
                    localStorage.setItem(
                        "offline_vault",
                        JSON.stringify(vaultContent),
                    );
                }
                console.log(
                    `Vault loaded from server in ${Date.now() - start}ms`,
                );
                newerVersionAvailable = false;
            }
        } catch (e) {
            console.log("Failed to load vault from server", e);
            // Try offline
            const offline = localStorage.getItem("offline_vault");
            if (offline) {
                vaultContent = JSON.parse(offline);
                offlineMode = true; // Flag as offline/potentially out of date
            } else {
                alert("Failed to decrypt vault and no offline copy found.");
                isLoading = false;
                return;
            }
        }

        try {
            unsortedItems = [];
            if (vaultContent) {
                if (Array.isArray(vaultContent)) {
                    unsortedItems = normalizeVaultItems(vaultContent);
                    // Be sure to remind the user to save the vault
                    isDirty = true;
                } else {
                    try {
                        // New format: { date: string, data: { iv, cipher } }
                        const parsed = vaultContent;

                        let encryptedData;
                        if (parsed.date && parsed.data) {
                            lastSavedDate = parsed.date;
                            encryptedData = parsed.data;
                        } else {
                            encryptedData = parsed;
                        }

                        // Store encrypted data for restoration
                        encryptedVaultData = encryptedData;

                        const jsonStr = await decrypt(
                            encryptedData.cipher,
                            encryptedData.iv,
                            encryptionKey,
                        );
                        unsortedItems = JSON.parse(jsonStr);
                        isDirty = false;
                    } catch (e) {
                        alert("Failed to decrypt vault.");
                    }
                }
            }
        } finally {
            items = sortPasswordEntries(unsortedItems);
            isLoading = false;
            startPolling();
        }
        return true;
    }

    function startPolling() {
        if (pollTimer) clearInterval(pollTimer);
        const interval = browser && (window as any).__TESTING__ ? 1000 : 60000;
        pollTimer = setInterval(pollForUpdates, interval);
    }

    async function pollForUpdates() {
        if (!api.token) return;
        try {
            const metadata = await api.getLatestVaultMetadata();
            offlineMode = false;
            if (metadata.mtime && lastSavedDate) {
                const serverTime = new Date(metadata.mtime).getTime();
                const localTime = new Date(lastSavedDate).getTime();
                // Add a small buffer (1s) to avoid race conditions with save
                if (serverTime > localTime + 1000) {
                    newerVersionAvailable = true;
                }
            }
        } catch (e) {
            console.log("Polling failed (server unreachable?)");
            offlineMode = true;
        }
    }

    async function saveVault() {
        if (isLoading) return; // Don't save during load
        // Encrypt all items
        const jsonStr = JSON.stringify(items);
        const encrypted = await encrypt(jsonStr, encryptionKey);

        // Wrap with date
        const payload = {
            date: new Date().toISOString(),
            data: encrypted,
        };

        try {
            await api.saveVault(JSON.stringify(payload));
            lastSavedDate = payload.date;

            // Update encryptedVaultData in memory
            encryptedVaultData = payload.data;

            isDirty = false;
            offlineMode = false;
            // Update offline copy
            localStorage.setItem("offline_vault", JSON.stringify(payload));
        } catch (e) {
            alert("Failed to save vault to server. Please check connection.");
        }
    }

    // History Functions
    async function openHistory() {
        try {
            historyFiles = await api.getVaultHistory();
            showHistoryModal = true;
        } catch (e) {
            alert("Failed to load history.");
        }
    }

    async function deleteHistoryItem(filename: string) {
        if (!confirm(`Delete version ${filename}?`)) return;
        try {
            await api.deleteVault(filename);
            historyFiles = await api.getVaultHistory(); // Refresh from server
        } catch (e) {
            alert("Failed to delete item.");
        }
    }

    export async function synchronizeVault() {
        if (isDirty) {
            if (
                !confirm(
                    "You have unsaved changes. Synchronizing will discard them. Continue?",
                )
            ) {
                return;
            }
        }

        isSyncing = true;
        try {
            if (await loadVault()) {
                alert("Vault synchronized successfully!");
            }
        } catch (e) {
            alert("Failed to synchronize vault. Please try again.");
            console.error("Sync error:", e);
        } finally {
            isSyncing = false;
        }
    }

    // Derived filtered items
    $effect(() => {
        filteredFiles = sortPasswordEntries(
            filterPasswordEntries(items, filter),
        );
    });

    async function selectItem(item: PasswordEntry) {
        await restoreSensitiveData();
        selectedItem = item;
    }

    function startCreate() {
        // Temporary ID for new item, will be replaced or kept
        editingItem = {
            id: crypto.randomUUID(),
            title: "",
            username: "",
            password: "",
            site: "",
            tags: [],
            notes: "",
        };
        isCreating = true;
    }

    function startEdit(item: PasswordEntry) {
        editingItem = JSON.parse(JSON.stringify(item)); // Deep copy
        isCreating = false;
        selectedItem = null; // Close detail modal
    }

    async function handleSave(updatedItem: PasswordEntry) {
        let newItems;
        if (isCreating) {
            newItems = [...items, updatedItem];
        } else {
            const index = items.findIndex((i) => i.id === updatedItem.id);
            if (index !== -1) {
                newItems = [...items];
                newItems[index] = updatedItem;
            } else {
                newItems = [...items, updatedItem];
            }
        }
        items = sortPasswordEntries(newItems);
        isCreating = false;
        editingItem = null;
        isDirty = true; // Mark as dirty
    }

    async function handleDelete(item: PasswordEntry) {
        if (confirm("Delete " + item.title + "?")) {
            items = items.filter((i) => i.id !== item.id);
            selectedItem = null;
            isDirty = true; // Mark as dirty
        }
    }

    function closeModals() {
        selectedItem = null;
        editingItem = null;
        showHistoryModal = false;
    }

    async function copyToClipboard(text: string) {
        if (clipboardTimeout) {
            clearTimeout(clipboardTimeout);
        }
        await navigator.clipboard.writeText(text);
        clipboardTimeout = setTimeout(async () => {
            await navigator.clipboard.writeText("");
            clipboardTimeout = null;
        }, 10000);
    }
</script>

<div class="dashboard">
    <div class="sidebar">
        <div class="controls">
            <div class="actions">
                <button onclick={onToggleView} title="Switch to folder view">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path
                            d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
                        />
                    </svg>
                    Folder View
                </button>
                <button onclick={startCreate}>+ New Entry</button>
                {#if isDirty}
                    <button class="save-btn" onclick={saveVault}
                        >Save Vault</button
                    >
                {/if}
                <button onclick={openHistory}>History</button>
            </div>
            {#if offlineMode}
                <div class="warning">
                    ⚠️ Offline Mode: Vault may be out of date
                </div>
            {/if}

            {#if newerVersionAvailable}
                <div class="warning sync-warning">
                    📦 A newer version is available on the server.
                    <button class="small" onclick={synchronizeVault}
                        >Sync Now</button
                    >
                </div>
            {/if}
            {#if lastSavedDate}
                <small
                    >Last saved: {new Date(lastSavedDate).toISOString()}</small
                >
            {/if}

            <div class="filter-container">
                <input
                    type="text"
                    placeholder="Filter..."
                    bind:value={filter}
                    data-testid="filter-input"
                />
                {#if filter}
                    <button
                        class="reset-filter"
                        onclick={() => (filter = "")}
                        title="Reset filter"
                        aria-label="Reset filter"
                    >
                        ×
                    </button>
                {/if}
            </div>
        </div>
        <PasswordList
            items={filteredFiles}
            {isMemoryCleared}
            onSelect={selectItem}
            onCopyUsername={copyToClipboard}
            onCopyPassword={copyToClipboard}
        />
    </div>
</div>

<!-- Details Modal -->
<DetailsModal
    isOpen={!!selectedItem}
    item={selectedItem}
    onClose={closeModals}
    onEdit={startEdit}
    onDelete={handleDelete}
    onCopy={copyToClipboard}
/>

<!-- Editor Modal -->
<EditorModal
    isOpen={!!editingItem}
    item={editingItem}
    {isCreating}
    onClose={closeModals}
    onSave={handleSave}
/>

<!-- History Modal -->
<HistoryModal
    isOpen={showHistoryModal}
    {historyFiles}
    onClose={closeModals}
    onDelete={deleteHistoryItem}
/>

<style>
    .dashboard {
        display: flex;
        height: 100vh;
    }
    .sidebar {
        width: 100%;
        max-width: 400px;
        border-right: 1px solid #ccc;
        display: flex;
        flex-direction: column;
        margin: 0 auto;
    }
    .controls {
        padding: 1rem;
        border-bottom: 1px solid #eee;
    }

    .actions {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }
    small {
        display: block;
        margin-bottom: 0.5rem;
        color: #666;
        font-size: 0.8rem;
    }
    input {
        width: 100%;
        padding: 0.5rem;
    }
    .filter-container {
        position: relative;
        display: flex;
        align-items: center;
    }
    .filter-container input {
        padding-right: 2rem;
    }
    .reset-filter {
        position: absolute;
        right: 0.25rem;
        top: 0.25rem;
        background: none;
        border: none;
        color: #666;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        line-height: 1;
        box-shadow: none;
        transition: color 0.2s;
    }
    .reset-filter:hover {
        color: #007bff;
        background: none;
        box-shadow: none;
    }
    .warning {
        background: #fff3cd;
        color: #856404;
        padding: 0.5rem;
        border-radius: 4px;
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
        border: 1px solid #ffeeba;
    }
</style>
