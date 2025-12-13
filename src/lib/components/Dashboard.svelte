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

    // Load vault on mount
    onMount(loadVault);

    async function loadVault() {
        try {
            const start = Date.now();
            const vaultContent = await api.getLatestVault();
            if (!vaultContent) {
                // New vault
                items = [];
            } else {
                // New format: { date: string, data: { iv, cipher } }
                const parsed = JSON.parse(vaultContent);

                let encryptedData;
                if (parsed.date && parsed.data) {
                    lastSavedDate = parsed.date;
                    encryptedData = parsed.data;
                } else {
                    // Backward compatibility for dev (or if format wasn't respected before)
                    encryptedData = parsed;
                }

                const jsonStr = await decrypt(
                    encryptedData.cipher,
                    encryptedData.iv,
                    encryptionKey,
                );
                items = JSON.parse(jsonStr);
                isDirty = false;
            }
            console.log(`Vault loaded in ${Date.now() - start}ms`);
        } catch (e) {
            console.error("Failed to load vault", e);
            alert("Failed to decrypt vault. Wrong password?");
            // In real app, redirect to unlock
        }
    }

    async function saveVault() {
        // Encrypt all items
        const jsonStr = JSON.stringify(items);
        const encrypted = await encrypt(jsonStr, encryptionKey);

        // Wrap with date
        const payload = {
            date: new Date().toISOString(),
            data: encrypted,
        };

        await api.saveVault(JSON.stringify(payload));
        lastSavedDate = payload.date;
        isDirty = false;
    }

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
            </div>
            {#if lastSavedDate}
                <small
                    >Last saved: {new Date(
                        lastSavedDate,
                    ).toLocaleString()}</small
                >
            {/if}
            <input type="text" placeholder="Filter..." bind:value={filter} />
        </div>
        <div class="list">
            {#each filteredFiles as item}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="list-item" onclick={() => selectItem(item)}>
                    <strong>{item.title}</strong>
                    {#if item.username}<small>{item.username}</small>{/if}
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
                <label>Site:</label>
                <a href={selectedItem.site} target="_blank"
                    >{selectedItem.site}</a
                >
            </div>
            <div class="field">
                <label>Username:</label>
                <span>{selectedItem.username}</span>
                <button onclick={() => copyToClipboard(selectedItem.username)}
                    >Copy</button
                >
            </div>
            <div class="field">
                <label>Password:</label>
                <span>********</span>
                <button onclick={() => copyToClipboard(selectedItem.password)}
                    >Copy</button
                >
            </div>
            <div class="field">
                <label>Tags:</label>
                <span>{selectedItem.tags?.join(", ")}</span>
            </div>
            <div class="field">
                <label>Notes:</label>
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
    .list-item:hover {
        background: #f9f9f9;
    }
    .field {
        margin-bottom: 1rem;
    }
    label {
        font-weight: bold;
        display: block;
    }
    .danger {
        background: red;
        color: white;
    }
    button {
        padding: 0.5rem 1rem;
        cursor: pointer;
    }
    button {
        margin-left: 10px;
    }
    .save-btn {
        background: #28a745;
        color: white;
        margin-left: 0;
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
</style>
