<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { api } from "$lib/api";
    import { decrypt, encrypt } from "$lib/crypto";
    import HistoryModal from "$lib/components/HistoryModal.svelte";
    import DetailsModal from "$lib/components/DetailsModal.svelte";
    import EditorModal from "$lib/components/EditorModal.svelte";
    import PasswordList from "$lib/components/PasswordList.svelte";
    import {
        sortPasswordEntries,
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
    let selectedItem = $state<PasswordEntry | null>(null);
    let editingItem = $state<PasswordEntry | null>(null);
    let isCreating = $state(false);

    let isDirty = $state(false);
    let lastSavedDate = $state<string | null>(null);
    let offlineMode = $state(false);

    let isLoading = false;
    let isSyncing = $state(false);
    let isBuilding = false;

    let encryptedVaultData = $state<CipheredVaultData | null>(null);
    let newerVersionAvailable = $state(false);
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    let isMemoryCleared = $state(false);
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    let restorePromise: Promise<void> | null = null;

    // History state
    let showHistoryModal = $state(false);
    let historyFiles = $state<HistoryItem[]>([]);

    // Folder tree state
    interface FolderNode {
        name: string;
        fullPath: string;
        isOpen: boolean;
        children: FolderNode[];
        entries: PasswordEntry[];
    }

    let folderTree = $state<FolderNode>({
        name: "Root",
        fullPath: "",
        isOpen: true,
        children: [],
        entries: [],
    });

    let selectedFolder = $state<FolderNode | null>(null);
    let displayedEntries = $state<PasswordEntry[]>([]);

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
            if (!restorePromise) {
                restorePromise = restoreSensitiveData().finally(() => {
                    restorePromise = null;
                });
            }
        }

        inactivityTimer = setTimeout(() => {
            clearSensitiveData();
        }, 60000);
    }

    function clearSensitiveData() {
        items = items.map((item) => ({ id: item.id, title: item.title }));
        displayedEntries = [];
        selectedItem = null;
        editingItem = null;
        historyFiles = [];
        isMemoryCleared = true;
        buildFolderTree();
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
            buildFolderTree();
        } catch (e) {
            console.log("Failed to restore vault from memory", e);
            alert("Failed to restore vault from memory");
        }
    }

    async function loadVault() {
        isLoading = true;
        let unsortedItems: PasswordEntry[] = [];
        let vaultContent = null;
        try {
            const start = Date.now();
            vaultContent = await api.getLatestVault();
            if (vaultContent) {
                offlineMode = false;
                if (!Array.isArray(vaultContent)) {
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
            const offline = localStorage.getItem("offline_vault");
            if (offline) {
                vaultContent = JSON.parse(offline);
                offlineMode = true;
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
                    isDirty = true;
                } else {
                    try {
                        const parsed = vaultContent;

                        let encryptedData;
                        if (parsed.date && parsed.data) {
                            lastSavedDate = parsed.date;
                            encryptedData = parsed.data;
                        } else {
                            encryptedData = parsed;
                        }

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
            buildFolderTree();
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
        if (isLoading) return;
        const jsonStr = JSON.stringify(items);
        const encrypted = await encrypt(jsonStr, encryptionKey);

        const payload = {
            date: new Date().toISOString(),
            data: encrypted,
        };

        try {
            await api.saveVault(JSON.stringify(payload));
            lastSavedDate = payload.date;

            encryptedVaultData = payload.data;

            isDirty = false;
            offlineMode = false;
            localStorage.setItem("offline_vault", JSON.stringify(payload));
        } catch (e) {
            alert("Failed to save vault to server. Please check connection.");
        }
    }

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
            historyFiles = await api.getVaultHistory();
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

    // Build folder tree from items
 function buildFolderTree() {
     if ( isBuilding ) return;
     try {
         isBuilding = true;
         const root: FolderNode = {
             name: "Root",
             fullPath: "",
             isOpen: true,
             children: [],
             entries: [],
         };

         // Sort items first
         const sortedItems = [...items].sort((a, b) => {
             const groupA = a.group || "";
             const groupB = b.group || "";
             if (groupA !== groupB) return groupA.localeCompare(groupB);
             return a.title.localeCompare(b.title);
         });

         for (const item of sortedItems) {
             const group = item.group || "";
             if (!group) {
                 root.entries.push(item);
                 continue;
             }

             const parts = group.split("/").filter((p) => p.trim());
             let currentNode = root;

             for (let i = 0; i < parts.length; i++) {
                 const part = parts[i];
                 const fullPath =
                     currentNode.fullPath +
                     (currentNode.fullPath ? "/" : "") +
                     part;

                 let childNode = currentNode.children.find(
                     (c) => c.name === part,
                 );
                 if (!childNode) {
                     childNode = {
                         name: part,
                         fullPath: fullPath,
                         isOpen: false,
                         children: [],
                         entries: [],
                     };
                     currentNode.children.push(childNode);
                 }

                 if (i === parts.length - 1) {
                     childNode.entries.push(item);
                 }

                 currentNode = childNode;
             }
         }

         folderTree = root;

         // Set initial selection to root
         if (!selectedFolder || selectedFolder === null) {
             selectedFolder = root;
             displayedEntries = root.entries;
         } else {
             // Try to maintain selection
             const findNode = (
                 node: FolderNode,
                 path: string,
             ): FolderNode | null => {
                 if (node.fullPath === path) return node;
                 for (const child of node.children) {
                     const found = findNode(child, path);
                     if (found) return found;
                 }
                 return null;
             };
             const newSelected = findNode(root, selectedFolder.fullPath);
             if (newSelected) {
                 selectedFolder = newSelected;
                 displayedEntries = newSelected.entries;
             } else {
                 selectedFolder = root;
                 displayedEntries = root.entries;
             }
         }
     } finally {
         isBuilding = false;
     }
 }

    function toggleFolder(node: FolderNode) {
        node.isOpen = !node.isOpen;
        selectedFolder = node;
        displayedEntries = node.entries;
        folderTree = folderTree; // Trigger reactivity
    }

    function selectFolder(node: FolderNode) {
        selectedFolder = node;
        displayedEntries = node.entries;
    }

    async function selectItem(item: PasswordEntry) {
        await restoreSensitiveData();
        selectedItem = item;
    }

    function startCreate() {
        editingItem = {
            id: crypto.randomUUID(),
            title: "",
            username: "",
            password: "",
            site: "",
            tags: [],
            notes: "",
            group: selectedFolder?.fullPath || "",
        };
        isCreating = true;
    }

    function startEdit(item: PasswordEntry) {
        editingItem = JSON.parse(JSON.stringify(item));
        isCreating = false;
        selectedItem = null;
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
        buildFolderTree();
        isCreating = false;
        editingItem = null;
        isDirty = true;
    }

    async function handleDelete(item: PasswordEntry) {
        if (confirm("Delete " + item.title + "?")) {
            items = items.filter((i) => i.id !== item.id);
            buildFolderTree();
            selectedItem = null;
            isDirty = true;
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

    // Rebuild when items change
    $effect(() => {
        //if (items.length > 0) {
            //buildFolderTree();
        //}
    });
</script>

<div class="folder-dashboard">
    <div class="controls-header">
        <div class="actions">
            <button onclick={onToggleView} title="Switch to list view">
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
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                List View
            </button>
            <button onclick={startCreate}>+ New Entry</button>
            {#if isDirty}
                <button class="save-btn" onclick={saveVault}>Save Vault</button>
            {/if}
            <button onclick={openHistory}>History</button>
        </div>
        {#if offlineMode}
            <div class="warning">⚠️ Offline Mode: Vault may be out of date</div>
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
            <small>Last saved: {new Date(lastSavedDate).toISOString()}</small>
        {/if}
    </div>

    <div class="main-content">
        <div class="folder-pane">
            <h3>Folders</h3>
            <div class="folder-tree">
                {#snippet renderFolder(node: FolderNode, level: number)}
                    <div
                        class="folder-item"
                        class:selected={selectedFolder === node}
                        style="padding-left: {level * 1.5}rem"
                    >
                        <button
                            class="folder-button"
                            onclick={() => toggleFolder(node)}
                        >
                            <span class="folder-icon">
                                {#if node.children.length > 0}
                                    {#if node.isOpen}
                                        📂
                                    {:else}
                                        📁
                                    {/if}
                                {:else}
                                    📄
                                {/if}
                            </span>
                            <span class="folder-name">{node.name}</span>
                            <span class="entry-count"
                                >({node.entries.length})</span
                            >
                        </button>
                    </div>
                    {#if node.isOpen}
                        {#each node.children as child}
                            {@render renderFolder(child, level + 1)}
                        {/each}
                    {/if}
                {/snippet}

                {@render renderFolder(folderTree, 0)}
            </div>
        </div>

        <div class="entries-pane">
            <h3>
                {selectedFolder
                    ? selectedFolder.fullPath || "Root"
                    : "Entries"}
            </h3>
            <PasswordList
                items={displayedEntries}
                {isMemoryCleared}
                onSelect={selectItem}
                onCopyUsername={copyToClipboard}
                onCopyPassword={copyToClipboard}
            />
        </div>
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
    .folder-dashboard {
        display: flex;
        flex-direction: column;
        height: 100vh;
    }

    .controls-header {
        padding: 1rem;
        border-bottom: 1px solid #eee;
    }

    .actions {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        flex-wrap: wrap;
    }

    small {
        display: block;
        margin-bottom: 0.5rem;
        color: #666;
        font-size: 0.8rem;
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

    .main-content {
        display: flex;
        flex: 1;
        overflow: hidden;
    }

    .folder-pane {
        width: 300px;
        border-right: 1px solid #ccc;
        overflow-y: auto;
        padding: 1rem;
        background: #f8f9fa;
    }

    .folder-pane h3 {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
        color: #333;
    }

    .entries-pane {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
    }

    .entries-pane h3 {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
        color: #333;
    }

    .folder-tree {
        display: flex;
        flex-direction: column;
    }

    .folder-item {
        margin-bottom: 0.25rem;
    }

    .folder-item.selected {
        background: #e3f2fd;
        border-radius: 4px;
    }

    .folder-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.5rem;
        background: none;
        border: none;
        text-align: left;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s;
        box-shadow: none;
    }

    .folder-button:hover {
        background: #e2e8f0;
        box-shadow: none;
    }

    .folder-icon {
        font-size: 1.2rem;
        line-height: 1;
    }

    .folder-name {
        flex: 1;
        font-weight: 500;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .entry-count {
        font-size: 0.85rem;
        color: #666;
        font-weight: normal;
    }
</style>
