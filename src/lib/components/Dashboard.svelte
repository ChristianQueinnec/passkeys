<script lang="ts">
    import { onMount, tick } from "svelte";
    import { api } from "$lib/api";
    import { decrypt, encrypt } from "$lib/crypto";
    import Editor from "$lib/components/Editor.svelte";
    import Modal from "$lib/components/Modal.svelte";

    let { encryptionKey, username } = $props();

    let items = $state<any[]>([]);
    let filteredFiles = $state<any[]>([]);
    let filter = $state("");

    let selectedItem = $state<any>(null); // For details view
    let editingItem = $state<any>(null); // For editor
    let isCreating = $state(false);

    let isDirty = $state(false); // New dirty state
    let lastSavedDate = $state<string | null>(null);
    let offlineMode = $state(false); // Warning for offline/outdated

    let isLoading = false; // Prevent saves during load
    let isSyncing = $state(false); // Syncing state

    // History state
    let showHistoryModal = $state(false);
    let historyFiles = $state<any[]>([]);

    // Load vault on mount
    onMount(loadVault);

    async function loadVault() {
        isLoading = true; // Disable saves during load
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
                items = [];
            } else if (Array.isArray(vaultContent)) {
                items = vaultContent;
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
                    items = JSON.parse(jsonStr);
                    isDirty = false;
                } catch (e) {
                    alert("Failed to decrypt vault.");
                }
            }
        } finally {
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
            historyFiles = historyFiles.filter((f) => f.name !== filename);
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

    function selectItem(item: any) {
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

    function startEdit(item: any) {
        editingItem = JSON.parse(JSON.stringify(item)); // Deep copy
        isCreating = false;
        selectedItem = null; // Close detail modal
    }

    async function handleSave(updatedItem: any) {
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

    async function handleDelete(item: any) {
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
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="list-item">
                    <a href={item.url || "#"}>{item.title}</a>
                    <button class="small secondary" onclick={() => selectItem(item)}>View</button>
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
                    <button class="small" onclick={() => copyToClipboard(selectedItem.username)}
                        >Copy</button
                    >
                </div>
            </div>
            <div class="field">
                <strong>Password:</strong>
                <div class="field-content">
                    <span>********</span>
                    <button class="small" onclick={() => copyToClipboard(selectedItem.password)}
                        >Copy</button
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
                <button onclick={() => startEdit(selectedItem)}>Edit</button>
                <button
                    onclick={() => handleDelete(selectedItem)}
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
        padding: 1rem;
        border-bottom: 1px solid #eee;
        cursor: pointer;
    }
    .list-item button {
        float: right;
    }
    .list-item:hover {
        background: #f9f9f9;
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
