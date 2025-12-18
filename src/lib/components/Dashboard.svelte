<script lang="ts">
    import { onMount, tick } from "svelte";
    import { api } from "$lib/api";
    import { decrypt, encrypt } from "$lib/crypto";
    import Editor from "$lib/components/Editor.svelte";
    import Modal from "$lib/components/Modal.svelte";
    import type { PasswordEntry, HistoryItem } from "$lib/types";

    let { encryptionKey, username } = $props();

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

    // History state
    let showHistoryModal = $state(false);
    let historyFiles = $state<HistoryItem[]>([]);

    // Load vault on mount
    onMount(loadVault);

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
            }
        } catch (e) {
            console.error("Failed to load vault from server", e);
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
            if (!vaultContent) {
                unsortedItems = [];
            } else if (Array.isArray(vaultContent)) {
                unsortedItems = vaultContent;
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
        } finally {
            items = unsortedItems.sort((a: PasswordEntry, b: PasswordEntry) =>
                (a.site || "").localeCompare(b.site || ""),
            );
            isLoading = false;
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

    async function synchronizeVault() {
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
            await loadVault();
            alert("Vault synchronized successfully!");
        } catch (e) {
            alert("Failed to synchronize vault. Please try again.");
            console.error("Sync error:", e);
        } finally {
            isSyncing = false;
        }
    }

    // Export synchronizeVault for parent component
    export { synchronizeVault };

    // Derived filtered items
    $effect(() => {
        if (!filter) {
            filteredFiles = items;
        } else {
            const lowerFilter = filter.toLowerCase();
            filteredFiles = items.filter((item) => {
                return (
                    item.title?.toLowerCase().includes(lowerFilter) ||
                    item.username?.toLowerCase().includes(lowerFilter) ||
                    item.site?.toLowerCase().includes(lowerFilter) ||
                    item.notes?.toLowerCase().includes(lowerFilter) ||
                    item.tags?.some((t: string) =>
                        t.toLowerCase().includes(lowerFilter),
                    )
                );
            });
        }
    });

    function selectItem(item: PasswordEntry) {
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
        if (isCreating) {
            items = [...items, updatedItem];
        } else {
            const index = items.findIndex((i) => i.id === updatedItem.id);
            if (index !== -1) {
                items[index] = updatedItem;
            } else {
                items = [...items, updatedItem];
            }
        }
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

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
    }
</script>

<div class="dashboard">
    <div class="sidebar">
        <div class="controls">
            <div class="actions">
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
            {#if lastSavedDate}
                <small
                    >Last saved: {new Date(lastSavedDate).toISOString()}</small
                >
            {/if}
            <input type="text" placeholder="Filter..." bind:value={filter} />
        </div>
        <div class="list">
            {#each filteredFiles as item}
                <div class="list-item" data-testid="vault-item">
                    <a href={item.site} target="_blank" class="item-title"
                        >{item.title}</a
                    >
                    <div class="item-actions">
                        <button
                            class="icon-btn"
                            onclick={() => copyToClipboard(item.username)}
                            title="Copy Username"
                            aria-label="Copy Username"
                        >
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
                                ><path
                                    d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
                                /><circle cx="12" cy="7" r="4" /></svg
                            >
                        </button>
                        <button
                            class="icon-btn"
                            onclick={() => copyToClipboard(item.password)}
                            title="Copy Password"
                            aria-label="Copy Password"
                        >
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
                                ><path
                                    d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4c.9.1 1.8-.2 2.6-.8l4.3-4.3c.6-.6.8-1.5.7-2.4l-.2-2.1c-.1-.9-.9-1.6-1.8-1.7l-2.1-.2c-.9-.1-1.8.1-2.4.7l-4.3 4.3c-.6.8-.9 1.7-.8 2.6L11 15.2V17H8v3H5v-2H2Zm12-11a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z"
                                /></svg
                            >
                        </button>
                        <button
                            class="icon-btn"
                            onclick={() => selectItem(item)}
                            title="View Details"
                            aria-label="View Details"
                        >
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
                                ><path
                                    d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"
                                /><circle cx="12" cy="12" r="3" /></svg
                            >
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>

<!-- Details Modal -->
<Modal
    isOpen={!!selectedItem}
    onClose={closeModals}
    title={selectedItem?.title}
>
    {#if selectedItem}
        <div class="details">
            <div class="field">
                <strong>Site:</strong>
                <a href={selectedItem.site} target="_blank"
                    >{selectedItem.site}</a
                >
            </div>
            <div class="field">
                <strong>Username:</strong>
                <div class="field-content">
                    <span>{selectedItem.username}</span>
                    <button
                        class="small"
                        onclick={() =>
                            selectedItem &&
                            copyToClipboard(selectedItem.username)}>Copy</button
                    >
                </div>
            </div>
            <div class="field">
                <strong>Password:</strong>
                <div class="field-content">
                    <span>********</span>
                    <button
                        class="small"
                        onclick={() =>
                            selectedItem &&
                            copyToClipboard(selectedItem.password)}>Copy</button
                    >
                </div>
            </div>
            <div class="field">
                <strong>Tags:</strong>
                <span>{selectedItem.tags?.join(", ")}</span>
            </div>
            <div class="field">
                <strong>Notes:</strong>
                <pre>{selectedItem.notes}</pre>
            </div>

            <div class="actions">
                <button onclick={() => selectedItem && startEdit(selectedItem)}
                    >Edit</button
                >
                <button
                    onclick={() => selectedItem && handleDelete(selectedItem)}
                    class="danger">Delete</button
                >
            </div>
        </div>
    {/if}
</Modal>

<!-- Editor Modal -->
<Modal
    isOpen={!!editingItem}
    onClose={closeModals}
    title={isCreating ? "New Item" : "Edit Item"}
>
    {#if editingItem}
        <Editor item={editingItem} onSave={handleSave} onCancel={closeModals} />
    {/if}
</Modal>

<!-- History Modal -->
<Modal isOpen={showHistoryModal} onClose={closeModals} title="Vault History">
    <div class="history-list">
        {#if historyFiles.length === 0}
            <p>No history found.</p>
        {:else}
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Size</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each historyFiles as file}
                        <tr>
                            <td>{new Date(file.mtime).toLocaleString()}</td>
                            <td>{file.size} B</td>
                            <td>
                                <button
                                    class="danger small"
                                    onclick={() => deleteHistoryItem(file.name)}
                                    >Delete</button
                                >
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </div>
</Modal>
```

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
    .list {
        flex: 1;
        overflow-y: auto;
    }
    .list-item {
        padding: 0rem 0rem;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background 0.2s;
    }
    .list-item:hover {
        background: #f0f7ff;
    }
    .item-title {
        font-weight: 500;
        font-size: 0.95rem;
        color: #007bff;
        text-decoration: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        margin-right: 0.5rem;
    }
    .item-title:hover {
        text-decoration: underline;
    }
    .item-actions {
        display: flex;
        gap: 0.25rem;
        flex-shrink: 0;
    }
    .icon-btn {
        background: none;
        border: none;
        color: #666;
        padding: 0.4rem;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        box-shadow: none;
    }
    .icon-btn:hover {
        background: #e2e8f0;
        color: #007bff;
        transform: scale(1.1);
        box-shadow: none;
    }
    .field {
        margin-bottom: 1rem;
    }
    .field-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.25rem;
    }
    .field-content span {
        flex: 1;
    }
    strong {
        font-weight: bold;
        display: block;
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
    .warning {
        background: #fff3cd;
        color: #856404;
        padding: 0.5rem;
        border-radius: 4px;
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
        border: 1px solid #ffeeba;
    }
    table {
        width: 100%;
        border-collapse: collapse;
    }
    th,
    td {
        padding: 0.5rem;
        text-align: left;
        border-bottom: 1px solid #eee;
    }
    .small {
        font-size: 0.8rem;
        padding: 0.25rem 0.5rem;
    }
</style>
