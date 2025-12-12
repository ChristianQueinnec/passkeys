<script lang="ts">
    import { onMount } from "svelte";
    import { api } from "../api";
    import { decrypt, encrypt } from "../crypto";
    import Editor from "./Editor.svelte";

    let { encryptionKey, username } = $props();

    let files = $state<any[]>([]);
    let filteredFiles = $state<any[]>([]);
    let filter = $state("");
    let selectedFile = $state<any>(null);
    let decryptedContent = $state<any>(null);
    let isEditing = $state(false);

    // Load files on mount
    onMount(loadFiles);

    async function loadFiles() {
        try {
            const list = await api.listFiles();
            files = list;
            applyFilter();
        } catch (e) {
            console.error(e);
        }
    }

    function applyFilter() {
        if (!filter) {
            filteredFiles = files;
            return;
        }
        // Filter logic (needs decrypted content to filter effectively?
        // The README says "The filter is a text that may appear in all the textual fields of an information."
        // But we only have encrypted files listed.
        // Wait, the README says: "Once deciphered, the information titles are displayed and may be filtered."
        // This implies we need to download and decrypt ALL files to filter them?
        // Or maybe the title is separate? README says "Information are made of a title...".
        // "Once deciphered... titles are displayed".
        // So we download all files and decrypt them? That might be heavy if there are many.
        // For MVP, lets assume we download all and decrypt titles.
        // Actually, `listFiles` only returns metadata (name, size).
        // We probably need to fetch content for all of them to filter?
        // Let's implement lazy loading: we list files. We only decrypt when needed?
        // "Once deciphered... titles are displayed". This suggests automatic decryption of everything upon unlock?
        // Let's try to fetch all files content and decrypt them for the list.

        // For now, simple filter on filename if we can't decrypt everything instantly.
        // But let's follow the requirement: display titles.
        // So we need to fetch all contents.
    }

    // Refined approach: fetch all files, decrypt, then show list.
    let items = $state<any[]>([]);

    async function loadAndDecryptAll() {
        const list = await api.listFiles();
        const decryptedItems = await Promise.all(
            list.map(async (file: any) => {
                try {
                    const res = await api.getFile(file.name);
                    const contentStr = res.content;
                    // contentStr is JSON { iv, cipher }
                    const encryptedData = JSON.parse(contentStr);
                    const jsonStr = await decrypt(
                        encryptedData.cipher,
                        encryptedData.iv,
                        encryptionKey,
                    );
                    const data = JSON.parse(jsonStr);
                    return { ...data, filename: file.name, original: file };
                } catch (e) {
                    console.error("Failed to decrypt", file.name, e);
                    return {
                        title: "Error Decrypting",
                        filename: file.name,
                        error: true,
                    };
                }
            }),
        );
        items = decryptedItems;
    }

    // We'll call loadAndDecryptAll instead of loadFiles
    onMount(loadAndDecryptAll);

    // Derived filtered items
    $effect(() => {
        if (!filter) {
            filteredFiles = items;
        } else {
            const lowerFilter = filter.toLowerCase();
            filteredFiles = items.filter((item) => {
                if (item.error) return false;
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
        selectedFile = item;
        isEditing = false;
    }

    function startEdit() {
        isEditing = true;
    }

    function startCreate() {
        selectedFile = {
            title: "",
            username: "",
            password: "",
            site: "",
            tags: [],
            notes: "",
        };
        isEditing = true;
    }

    async function handleSave(updatedItem: any) {
        // Encrypt and save
        const filename = updatedItem.filename || `entry-${Date.now()}.json`;
        // We don't save filename in content usually, but we need to track it.
        // Filter out filename from content to save
        const { filename: _, original: __, ...toSave } = updatedItem;
        const jsonStr = JSON.stringify(toSave);
        const encrypted = await encrypt(jsonStr, encryptionKey);

        await api.saveFile(filename, JSON.stringify(encrypted));

        isEditing = false;
        selectedFile = null;
        await loadAndDecryptAll();
    }

    async function handleDelete(item: any) {
        if (confirm("Delete " + item.title + "?")) {
            await api.deleteFile(item.filename);
            selectedFile = null;
            await loadAndDecryptAll();
        }
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
    }
</script>

<div class="dashboard">
    <div class="sidebar">
        <div class="controls">
            <input type="text" placeholder="Filter..." bind:value={filter} />
            <button onclick={startCreate}>+ New Entry</button>
        </div>
        <div class="list">
            {#each filteredFiles as item}
                <div
                    class="list-item"
                    class:selected={selectedFile === item}
                    onclick={() => selectItem(item)}
                >
                    <strong>{item.title}</strong>
                    {#if item.username}<small>{item.username}</small>{/if}
                </div>
            {/each}
        </div>
    </div>
    <div class="main">
        {#if isEditing}
            <Editor
                item={selectedFile}
                onSave={handleSave}
                onCancel={() => (isEditing = false)}
            />
        {:else if selectedFile}
            <div class="details">
                <h2>{selectedFile.title}</h2>
                <div class="field">
                    <label>Site:</label>
                    <a href={selectedFile.site} target="_blank"
                        >{selectedFile.site}</a
                    >
                </div>
                <div class="field">
                    <label>Username:</label>
                    <span>{selectedFile.username}</span>
                    <button
                        onclick={() => copyToClipboard(selectedFile.username)}
                        >Copy</button
                    >
                </div>
                <div class="field">
                    <label>Password:</label>
                    <span>********</span>
                    <button
                        onclick={() => copyToClipboard(selectedFile.password)}
                        >Copy</button
                    >
                </div>
                <div class="field">
                    <label>Tags:</label>
                    <span>{selectedFile.tags?.join(", ")}</span>
                </div>
                <div class="field">
                    <label>Notes:</label>
                    <pre>{selectedFile.notes}</pre>
                </div>

                <div class="actions">
                    <button onclick={startEdit}>Edit</button>
                    <button
                        onclick={() => handleDelete(selectedFile)}
                        class="danger">Delete</button
                    >
                </div>
            </div>
        {:else}
            <p class="placeholder">Select an item to view details</p>
        {/if}
    </div>
</div>

<style>
    .dashboard {
        display: flex;
        height: 100vh;
    }
    .sidebar {
        width: 300px;
        border-right: 1px solid #ccc;
        display: flex;
        flex-direction: column;
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
    .list-item.selected {
        background: #eef;
    }
    .main {
        flex: 1;
        padding: 2rem;
        overflow-y: auto;
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
    input {
        width: 100%;
        padding: 0.5rem;
    }
</style>
