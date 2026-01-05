<script lang="ts">
    import type { Snippet } from "svelte";
    import { i18n } from "$lib/stores/useI18n.svelte";

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
        <button
            onclick={onToggleView}
            title="Switch view"
            data-testid="toggle-view-btn"
        >
            {@render viewIcon()}
            {viewLabel}
        </button>
        <button onclick={onNewEntry} data-testid="new-entry-btn"
            >{i18n.t("vault.new_entry")}</button
        >
        {#if isDirty}
            <button
                class="save-btn"
                onclick={onSave}
                data-testid="save-vault-btn">{i18n.t("vault.save")}</button
            >
        {/if}
        <button onclick={onHistory} data-testid="history-btn"
            >{i18n.t("vault.history")}</button
        >
    </div>

    {#if offlineMode}
        <div class="warning" data-testid="offline-indicator">
            ⚠️ {i18n.t("vault.offline_mode")}
        </div>
    {/if}

    {#if newerVersionAvailable}
        <div class="warning sync-warning" data-testid="newer-version-alert">
            📦 {i18n.t("vault.newer_version")}
            <button class="small" onclick={onSynchronize}
                >{i18n.t("vault.sync_now")}</button
            >
        </div>
    {/if}

    {#if lastSavedDate}
        <small
            >{i18n.t("vault.last_saved")}: {new Date(
                lastSavedDate,
            ).toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US")}</small
        >
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
