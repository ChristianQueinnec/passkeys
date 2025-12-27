<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { useVault } from "$lib/stores/useVault.svelte";
    import { useVaultSecurity } from "$lib/stores/useVaultSecurity.svelte";
    import { useVaultSync } from "$lib/stores/useVaultSync.svelte";
    import VaultControls from "$lib/components/VaultControls.svelte";
    import VaultModals from "$lib/components/VaultModals.svelte";
    import PasswordList from "$lib/components/PasswordList.svelte";
    import type { PasswordEntry } from '../types';
 
    let { encryptionKey, username, onToggleView } = $props();

    // Initialize composables
    const vault = useVault(encryptionKey, username);
    const security = useVaultSecurity(vault, encryptionKey, () => {
        displayedEntries = [];
    });
    useVaultSync(vault);

    // Load vault on mount
    onMount(async () => {
        await vault.loadVault();
        if (vault.items.length >= 0) {
            buildFolderTree();
        }
    });

    // Cleanup on destroy
    onDestroy(() => {
        vault.cleanup();
    });

 // View-specific state (folder logic)
 interface FolderNode {
        name: string;
        fullPath: string;
        isOpen: boolean;
        children: FolderNode[];
        entries: any[];
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

    // Build folder tree from items
    function buildFolderTree() {
        const root: FolderNode = {
            name: "Root",
            fullPath: "",
            isOpen: true,
            children: [],
            entries: [],
        };

        const sortedItems = [...vault.items].sort((a, b) => {
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

        if (!selectedFolder || selectedFolder === null) {
            selectedFolder = root;
            displayedEntries = root.entries;
        } else {
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
    }

    function toggleFolder(node: FolderNode) {
        node.isOpen = !node.isOpen;
        selectedFolder = node;
        displayedEntries = node.entries;
        folderTree = folderTree;
    }

    // Override startCreate to include folder
    function startCreateInFolder() {
        vault.startCreate({
            group: selectedFolder?.fullPath || "",
        });
    }

    // Expose synchronizeVault for parent component
    export async function synchronizeVault() {
        await vault.synchronizeVault();
    }
</script>

<div class="folder-dashboard">
    <div class="sidebar">
    <VaultControls
        {onToggleView}
        viewIcon={`<svg
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
        </svg>`}
        viewLabel="List View"
        onNewEntry={startCreateInFolder}
        onSave={vault.saveVault}
        onHistory={vault.openHistory}
        isDirty={vault.isDirty}
        offlineMode={vault.offlineMode}
        newerVersionAvailable={vault.newerVersionAvailable}
        lastSavedDate={vault.lastSavedDate}
        onSynchronize={vault.synchronizeVault}
    />

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
                isMemoryCleared={security.isMemoryCleared}
                onSelect={vault.selectItem}
                onCopyUsername={vault.copyToClipboard}
                onCopyPassword={vault.copyToClipboard}
            />
        </div>
    </div>
</div>

<VaultModals
    selectedItem={vault.selectedItem}
    editingItem={vault.editingItem}
    isCreating={vault.isCreating}
    showHistoryModal={vault.showHistoryModal}
    historyFiles={vault.historyFiles}
    onCloseModals={vault.closeModals}
    onEdit={vault.startEdit}
    onDelete={vault.handleDelete}
    onSave={vault.handleSave}
    onDeleteHistory={vault.deleteHistoryItem}
    onCopy={vault.copyToClipboard}
/>
    </div>

<style>
    .folder-dashboard {
        display: flex;
        height: 100vh;
    }
    .sidebar {
        width: 100%;
        max-width: 700px;
        border-right: 1px solid #ccc;
        display: flex;
        flex-direction: column;
        margin: 0 auto;
    }

    .main-content {
        display: grid;
        overflow: hidden;
        grid-template-columns: 1fr 2fr;
    }

    .folder-pane {
        width: 200px;
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
