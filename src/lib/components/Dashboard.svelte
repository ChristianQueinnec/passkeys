<script lang="ts">
    import { onDestroy } from "svelte";
    import { useVault } from "$lib/stores/useVault.svelte";
    import { useVaultSecurity } from "$lib/stores/useVaultSecurity.svelte";
    import { useVaultSync } from "$lib/stores/useVaultSync.svelte";
    import VaultControls from "$lib/components/VaultControls.svelte";
    import VaultModals from "$lib/components/VaultModals.svelte";
    import PasswordList from "$lib/components/PasswordList.svelte";
    import { filterPasswordEntries, sortPasswordEntries } from "$lib/vault";

    let { encryptionKey, username, onToggleView } = $props();

    // Initialize composables
    const vault = useVault(encryptionKey, username);
    const security = useVaultSecurity(vault, encryptionKey, () => {
        filteredFiles = [];
    });
    const sync = useVaultSync(vault);

    // View-specific state
    let filter = $state("");
    let filteredFiles = $derived(
        sortPasswordEntries(filterPasswordEntries(vault.items, filter)),
    );

    // Load vault on mount
    $effect(() => {
        vault.loadVault();
    });

    // Cleanup on destroy
    onDestroy(() => {
        vault.cleanup();
    });

    // Expose synchronizeVault for parent component
    export async function synchronizeVault() {
        await vault.synchronizeVault();
    }
</script>

<div class="dashboard">
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
                <path
                    d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
                />
            </svg>`}
            viewLabel="Folder View"
            onNewEntry={vault.startCreate}
            onSave={vault.saveVault}
            onHistory={vault.openHistory}
            isDirty={vault.isDirty}
            offlineMode={vault.offlineMode}
            newerVersionAvailable={vault.newerVersionAvailable}
            lastSavedDate={vault.lastSavedDate}
            onSynchronize={vault.synchronizeVault}
        />

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

        <PasswordList
            items={filteredFiles}
            isMemoryCleared={security.isMemoryCleared}
            onSelect={vault.selectItem}
            onCopyUsername={vault.copyToClipboard}
            onCopyPassword={vault.copyToClipboard}
        />
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

    input {
        width: 100%;
        padding: 0.5rem;
    }
    .filter-container {
        position: relative;
        display: flex;
        align-items: center;
        padding: 0 1rem 1rem 1rem;
    }
    .filter-container input {
        padding-right: 2rem;
    }
    .reset-filter {
        position: absolute;
        right: 1.25rem;
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
</style>
