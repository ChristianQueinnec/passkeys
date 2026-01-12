<script lang="ts">
    import { onMount, untrack } from "svelte";
    import VaultControls from "$lib/components/VaultControls.svelte";
    import VaultModals from "$lib/components/VaultModals.svelte";
    import PasswordList from "$lib/components/PasswordList.svelte";
    import ListIcon from "$lib/icons/ListIcon.svelte";
    import { i18n } from "$lib/stores/useI18n.svelte";

    import type { PasswordEntry, FolderNode } from "$lib/types";
    import type { Vault } from "$lib/stores/useVault.svelte";

    let { onToggleView, vault, security } = $props();

    let folderTree = $state<FolderNode>({
        name: i18n.t("vault.root"),
        fullPath: "",

        isOpen: true,
        children: [],
        entries: [],
    });

    let selectedFolder = $state<FolderNode | null>(null);
    let displayedEntries = $state<PasswordEntry[]>([]);
    let dragTargetNode = $state<FolderNode | null>(null);

    // Load vault on mount
    onMount(async () => {
        // Assume vault is already loaded or will be loaded by parent
        // Just build tree if items exist
        if (vault.items.length > 0) {
            buildFolderTree();
        }
    });

    // Build folder tree from items
    // Reactive update when items change
    $effect(() => {
        // Access current items to track dependency
        const _ = vault.items;
        untrack(() => {
            buildFolderTree();
        });
    });

    function buildFolderTree() {
        const root: FolderNode = {
            name: i18n.t("vault.root"),
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

            const parts = group.split("/").filter((p: string) => p.trim());
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

        // Restore selection or default to root
        // Using untrack to avoid re-running this effect when selectedFolder changes, but we are inside buildFolderTree...
        // Svelte 5: Be careful with circular dependencies.
        // selectedFolder IS state. Reading it is fine if we don't start a cycle.
        // We are writing to it.
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

    // Drag and Drop Logic
    function handleDragStart(item: PasswordEntry, e: DragEvent) {
        if (e.dataTransfer) {
            e.dataTransfer.setData("text/plain", item.id);
            e.dataTransfer.effectAllowed = "move";
        }
    }

    function handleDragOver(e: DragEvent) {
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = "move";
        }
    }

    function handleDragEnter(node: FolderNode) {
        dragTargetNode = node;
    }

    function handleDragLeave(node: FolderNode) {
        // Only clear if we're actually leaving the node (this is tricky with child elements)
        // Simplification: we might rely on dragEnter of other nodes or drop to clear
        // Ideally we check if relatedTarget is within the node
    }

    async function handleDrop(e: DragEvent, targetNode: FolderNode) {
        e.preventDefault();
        dragTargetNode = null;
        const id = e.dataTransfer?.getData("text/plain");
        if (!id) return;

        const item = vault.items.find((i: PasswordEntry) => i.id === id);
        if (item) {
            const newGroup = targetNode.fullPath || undefined;
            // Only update if group is different
            if (item.group !== newGroup) {
                await vault.handleSave({
                    ...item,
                    group: newGroup,
                });
            }
        }
    }
</script>

{#snippet listIconSnippet()}
    <ListIcon />
{/snippet}

<div class="folder-dashboard">
    <div class="sidebar">
        <VaultControls
            {onToggleView}
            viewIcon={listIconSnippet}
            viewLabel={i18n.t("vault.view.list")}
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
                <h3>{i18n.t("vault.folders")}</h3>

                <div class="folder-tree">
                    {#snippet renderFolder(node: FolderNode, level: number)}
                        <div
                            class="folder-item"
                            class:selected={selectedFolder === node}
                            style="padding-left: {level * 1.5}rem"
                        >
                            <button
                                class="folder-button"
                                class:drag-over={dragTargetNode === node}
                                onclick={() => toggleFolder(node)}
                                ondragover={handleDragOver}
                                ondragenter={() => handleDragEnter(node)}
                                ondrop={(e) => handleDrop(e, node)}
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
                        ? selectedFolder.fullPath || i18n.t("vault.root")
                        : i18n.t("vault.entries")}
                </h3>

                <PasswordList
                    items={displayedEntries}
                    isMemoryCleared={security.isMemoryCleared}
                    restoreSensitiveData={security.restoreSensitiveData}
                    onSelect={vault.selectItem}
                    onCopyUsername={vault.copyToClipboard}
                    onCopyPassword={vault.copyToClipboard}
                    onDragStart={handleDragStart}
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

    .folder-button.drag-over {
        background: #cce5ff;
        outline: 2px dashed #007bff;
        outline-offset: -2px;
    }

    /* Prevent child elements from firing drag events */
    .folder-button > * {
        pointer-events: none;
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
