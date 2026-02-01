<script lang="ts">
    import type { Vault } from "$lib/stores/useVault.svelte";
    import VaultControls from "$lib/components/VaultControls.svelte";
    import VaultModals from "$lib/components/VaultModals.svelte";
    import PasswordList from "$lib/components/PasswordList.svelte";
    import { filterPasswordEntries, sortPasswordEntries } from "$lib/vault";
    import FolderIcon from "$lib/icons/FolderIcon.svelte";
    import { i18n } from "$lib/stores/useI18n.svelte";

    let { onToggleView, vault, security } = $props();

    // View-specific state
    let filter = $state("");
    let filteredFiles = $derived(
        sortPasswordEntries(filterPasswordEntries(vault.items, filter)),
    );
</script>

{#snippet folderIconSnippet()}
    <FolderIcon />
{/snippet}

<div class="dashboard" data-testid="list-view">
    <div class="sidebar">
        <VaultControls
            {onToggleView}
            viewIcon={folderIconSnippet}
            viewLabel={i18n.t("vault.view.folder")}
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
                placeholder={i18n.t("vault.filter_placeholder")}
                bind:value={filter}
                data-testid="filter-input"
            />
            {#if filter}
                <button
                    class="reset-filter"
                    onclick={() => (filter = "")}
                    data-testid="reset-filter"
                    title={i18n.language === "en"
                        ? "Reset filter"
                        : "Réinitialiser le filtre"}
                    aria-label={i18n.language === "en"
                        ? "Reset filter"
                        : "Réinitialiser le filtre"}
                >
                    ×
                </button>
            {/if}
        </div>

        <div class="entries-pane">
            <PasswordList
                items={filteredFiles}
                isMemoryCleared={security.isMemoryCleared}
                restoreSensitiveData={security.restoreSensitiveData}
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
    .entries-pane {
        padding: 1rem;
    }
</style>
