<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        onToggleView,
        viewIcon,
        viewLabel,
        onNewEntry,
        onSave,
        onHistory,
        isDirty = false,
        offlineMode = false,
        newerVersionAvailable = false,
        lastSavedDate = null,
        onSynchronize,
    }: {
        onToggleView: () => void;
        viewIcon: Snippet;
        viewLabel: string;
        onNewEntry: () => void;
        onSave: () => void;
        onHistory: () => void;
        isDirty?: boolean;
        offlineMode?: boolean;
        newerVersionAvailable?: boolean;
        lastSavedDate?: string | null;
        onSynchronize: () => void;
    } = $props();
</script>

<div class="controls">
    <div class="actions">
        <button onclick={onToggleView} title="Switch view">
            {@render viewIcon()}
            {viewLabel}
        </button>
        <button onclick={onNewEntry}>+ New Entry</button>
        {#if isDirty}
            <button class="save-btn" onclick={onSave}>Save Vault</button>
        {/if}
        <button onclick={onHistory}>History</button>
    </div>

    {#if offlineMode}
        <div class="warning">⚠️ Offline Mode: Vault may be out of date</div>
    {/if}

    {#if newerVersionAvailable}
        <div class="warning sync-warning">
            📦 A newer version is available on the server.
            <button class="small" onclick={onSynchronize}>Sync Now</button>
        </div>
    {/if}

    {#if lastSavedDate}
        <small>Last saved: {new Date(lastSavedDate).toISOString()}</small>
    {/if}
</div>

<style>
    .controls {
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
</style>
