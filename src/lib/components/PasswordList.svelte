<script lang="ts">
    import type { PasswordEntry } from "$lib/types";
    import { i18n } from "$lib/stores/useI18n.svelte";
    import DetailsIcon from "$lib/icons/DetailsIcon.svelte";
    import UserIcon from "$lib/icons/UserIcon.svelte";
    import PasswordIcon from "$lib/icons/PasswordIcon.svelte";

    let {
        items = [],
        onSelect,
        onCopyUsername,
        onCopyPassword,
        onOpenSite,
        onDragStart,
    }: {
        items: PasswordEntry[];
        onSelect: (item: PasswordEntry) => void;
        onCopyUsername: (item: PasswordEntry) => void;
        onCopyPassword: (item: PasswordEntry) => void;
        onOpenSite?: (item: PasswordEntry) => void;
        onDragStart?: (item: PasswordEntry, e: DragEvent) => void;
    } = $props();

    /* 
       Note: `isMemoryCleared` prop and reload logic are removed 
       because the vault is now always ciphered/sanitized by default.
       We rely on `hasUsername`/`hasPassword` flags to show buttons.
    */
</script>

<div class="list">
    {#if items.length === 0}
        <div class="empty-state">
            {i18n.t("vault.no_entries")}
        </div>
    {:else}
        {#each items as item (item.id)}
            <div
                class="list-item"
                data-testid="vault-item"
                data-id={item.id}
                draggable={!!onDragStart}
                ondragstart={(e) => onDragStart?.(item, e)}
                role="listitem"
            >
                <span class="item-title">
                    {#if item.site || item.hasSite}
                        <!-- Support opening site via handler if URL is hidden -->
                        {#if onOpenSite}
                            <button
                                class="link-btn"
                                onclick={() => onOpenSite(item)}
                                >{item.title}</button
                            >
                        {:else}
                            <!-- Fallback if plain site available -->
                            <a href={item.site} target="_blank">{item.title}</a>
                        {/if}
                    {:else}
                        {item.title}
                    {/if}
                </span>
                <div class="item-actions">
                    {#if item.username || item.hasUsername}
                        <button
                            class="icon-btn"
                            onclick={() => onCopyUsername(item)}
                            data-testid="copy-username-btn"
                            title={i18n.t("common.copy") +
                                " " +
                                i18n.t("common.username")}
                            aria-label={i18n.t("common.copy") +
                                " " +
                                i18n.t("common.username")}
                        >
                            <UserIcon />
                        </button>
                    {:else}
                        <span class="icon-filler"></span>
                    {/if}
                    {#if item.password || item.hasPassword}
                        <button
                            class="icon-btn"
                            onclick={() => onCopyPassword(item)}
                            data-testid="copy-password-btn"
                            title={i18n.t("common.copy") +
                                " " +
                                i18n.t("common.password")}
                            aria-label={i18n.t("common.copy") +
                                " " +
                                i18n.t("common.password")}
                        >
                            <PasswordIcon />
                        </button>
                    {:else}
                        <span class="icon-filler"></span>
                    {/if}
                    <button
                        class="icon-btn"
                        onclick={() => onSelect(item)}
                        title={i18n.t("vault.view_details")}
                        aria-label={i18n.t("vault.view_details")}
                        data-testid="view-details-btn"
                    >
                        <DetailsIcon />
                    </button>
                    <span></span>
                </div>
            </div>
        {/each}
    {/if}
</div>

<style>
    .list {
        flex: 1;
        overflow-y: auto;
    }
    .list-item {
        padding: 0rem 0rem;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background 0.2s;
    }
    .list-item:hover {
        background: #f0f7ff;
    }
    .item-title {
        font-weight: 500;
        font-size: 0.95rem;
        text-decoration: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        margin-right: 0.5rem;
    }
    .item-title a,
    .link-btn {
        text-decoration: underline;
        color: #007bff;
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        cursor: pointer;
    }
    .item-title:hover {
        background-color: #f0f7ff;
    }
    .item-actions {
        display: flex;
        gap: 0.25rem;
        flex-shrink: 0;
    }
    .icon-btn {
        background: none;
        border: none;
        color: #666;
        padding: 0.4rem;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        box-shadow: none;
    }
    .icon-btn:hover {
        background: #e2e8f0;
        color: #007bff;
        transform: scale(1.1);
        box-shadow: none;
    }
    .icon-filler {
        width: 16px;
        height: 16px;
        padding: 0.4rem;
    }
    .empty-state {
        padding: 2rem;
        text-align: center;
        color: #666;
        font-style: italic;
    }
</style>
