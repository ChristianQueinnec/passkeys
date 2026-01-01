<script lang="ts">
    import type { PasswordEntry } from "$lib/types";
    import { i18n } from "$lib/stores/useI18n.svelte";

    let {
        items = [],
        isMemoryCleared = false,
        restoreSensitiveData,
        onSelect,
        onCopyUsername,
        onCopyPassword,
        onDragStart,
    }: {
        items: PasswordEntry[];
        isMemoryCleared: boolean;
        restoreSensitiveData: () => void;
        onSelect: (item: PasswordEntry) => void;
        onCopyUsername: (text: string) => void;
        onCopyPassword: (text: string) => void;
        onDragStart?: (item: PasswordEntry, e: DragEvent) => void;
    } = $props();

    async function reload() {
        await restoreSensitiveData();
    }
</script>

<div class="list">
    {#if isMemoryCleared}
        <div class="empty-state">
            {i18n.t("vault.security_timeout")}
            <div>
                <button onclick={reload}>{i18n.t("vault.reload")}</button>
            </div>
        </div>
    {:else if items.length === 0}
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
                    {#if item.site}
                        <a href={item.site} target="_blank">{item.title}</a>
                    {:else}
                        {item.title}
                    {/if}
                </span>
                <div class="item-actions">
                    {#if item.username}
                        <button
                            class="icon-btn"
                            onclick={() => onCopyUsername(item.username || "")}
                            data-testid="copy-username-btn"
                            title={i18n.t("common.copy") +
                                " " +
                                i18n.t("common.username")}
                            aria-label={i18n.t("common.copy") +
                                " " +
                                i18n.t("common.username")}
                        >
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
                                ><path
                                    d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
                                /><circle cx="12" cy="7" r="4" /></svg
                            >
                        </button>
                    {:else}
                        <span class="icon-filler"></span>
                    {/if}
                    {#if item.password}
                        <button
                            class="icon-btn"
                            onclick={() => onCopyPassword(item.password || "")}
                            data-testid="copy-password-btn"
                            title={i18n.t("common.copy") +
                                " " +
                                i18n.t("common.password")}
                            aria-label={i18n.t("common.copy") +
                                " " +
                                i18n.t("common.password")}
                        >
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
                                ><path
                                    d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4c.9.1 1.8-.2 2.6-.8l4.3-4.3c.6-.6.8-1.5.7-2.4l-.2-2.1c-.1-.9-.9-1.6-1.8-1.7l-2.1-.2c-.9-.1-1.8.1-2.4.7l-4.3 4.3c-.6.8-.9 1.7-.8 2.6L11 15.2V17H8v3H5v-2H2Zm12-11a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z"
                                /></svg
                            >
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
                            ><path
                                d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"
                            /><circle cx="12" cy="12" r="3" /></svg
                        >
                    </button>
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
    .item-title a {
        text-decoration: underline;
        color: #007bff;
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
