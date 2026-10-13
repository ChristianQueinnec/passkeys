<script lang="ts">
    import Modal from "$lib/components/Modal.svelte";
    import type { PasswordEntry } from "$lib/types";
    import { i18n } from "$lib/stores/useI18n.svelte";
    import { settings } from "$lib/stores/useSettings.svelte";
    import snarkdown from "snarkdown";
    import DOMPurify from "dompurify";
    import { onDestroy } from "svelte";

    let {
        isOpen,
        item,
        onClose,
        onEdit,
        onDelete,
        onCopy,
    }: {
        isOpen: boolean;
        item: PasswordEntry | null;
        onClose: () => void;
        onEdit: (item: PasswordEntry) => void;
        onDelete: (item: PasswordEntry) => void;
        onCopy: (text: string) => void;
    } = $props();

    let passwordVisible = $state(false);
    let passwordInput = $state<HTMLInputElement | undefined>(undefined);
    let passwordRevealTimer: ReturnType<typeof setTimeout> | undefined;

    const renderedNotes = $derived(
        item?.notes ? DOMPurify.sanitize(snarkdown(item.notes)) : "",
    );

    $effect(() => {
        item?.id;
        passwordVisible = false;
        clearPasswordRevealTimer();
    });

    function clearPasswordRevealTimer() {
        if (passwordRevealTimer !== undefined) {
            clearTimeout(passwordRevealTimer);
            passwordRevealTimer = undefined;
        }
    }

    function hidePassword() {
        clearPasswordRevealTimer();
        passwordVisible = false;
    }

    function revealPassword() {
        if (passwordVisible) return;

        passwordVisible = true;
        passwordRevealTimer = setTimeout(hidePassword, settings.current.passwordRevealTimeout);

        requestAnimationFrame(() => {
            passwordInput?.focus();
            passwordInput?.select();
        });
    }

    onDestroy(clearPasswordRevealTimer);
</script>

<Modal {isOpen} {onClose} title={item?.title}>
    {#if item}
        <div class="details">
            <div class="field">
                <strong>{i18n.t("common.site")}:</strong>
                <a href={item.site} target="_blank">{item.site}</a>
            </div>
            <div class="field">
                <strong>{i18n.t("common.username")}:</strong>
                <span>{item.username}</span>
                <button
                    class="small"
                    onclick={() => item && onCopy(item.username || "")}
                    data-testid="copy-username-btn"
                    >{i18n.t("common.copy")}</button
                >
            </div>
            <div class="field">
                <strong>{i18n.t("common.password")}:</strong>
                <input
                    class="password-display"
                    type="text"
                    readonly
                    bind:this={passwordInput}
                    onclick={revealPassword}
                    value={passwordVisible ? item.password : "********"}
                    data-testid="details-password"
                />
                <button
                    class="small"
                    onclick={() => item && onCopy(item.password || "")}
                    data-testid="copy-password-btn"
                    >{i18n.t("common.copy")}</button
                >
            </div>
            <div class="field">
                <strong>{i18n.t("common.tags")}:</strong>
                <span>{item.tags?.join(", ")}</span>
                <span></span>
            </div>
            <div class="field notes-field">
                <strong>{i18n.t("common.notes")}:</strong>
                <div class="markdown-notes">
                    {@html renderedNotes}
                </div>
            </div>

            <div class="actions">
                <button
                    onclick={() => item && onEdit(item)}
                    data-testid="details-edit">{i18n.t("common.edit")}</button
                >
                <button
                    onclick={() => item && onDelete(item)}
                    class="danger"
                    data-testid="details-delete"
                    >{i18n.t("common.delete")}</button
                >
            </div>
        </div>
    {/if}
</Modal>

<style>
    .field {
        margin-bottom: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.25rem;
    }
    .field.notes-field {
        display: block;
        margin-top: 1.5rem;
    }
    .markdown-notes {
        background: #f9f9f9;
        border: 1px solid #eee;
        border-radius: 4px;
        padding: 0.75rem;
        margin-top: 0.5rem;
        font-size: 0.95rem;
        line-height: 1.5;
        max-height: 200px;
        overflow-y: auto;
    }
    .markdown-notes :global(p) {
        margin: 0.5rem 0;
    }
    .markdown-notes :global(p:first-child) {
        margin-top: 0;
    }
    .markdown-notes :global(p:last-child) {
        margin-bottom: 0;
    }
    .markdown-notes :global(h1),
    .markdown-notes :global(h2),
    .markdown-notes :global(h3) {
        margin: 1rem 0 0.5rem 0;
        font-weight: bold;
    }
    .markdown-notes :global(ul),
    .markdown-notes :global(ol) {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
    }
    .markdown-notes :global(code) {
        background: #eee;
        padding: 0.1rem 0.3rem;
        border-radius: 3px;
        font-family: monospace;
    }
    .markdown-notes :global(pre) {
        background: #eee;
        padding: 0.5rem;
        border-radius: 4px;
        overflow-x: auto;
        margin: 0.5rem 0;
    }
    strong {
        font-weight: bold;
        display: block;
    }
    .actions {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        justify-content: center;
    }
    .small {
        font-size: 0.8rem;
        padding: 0.25rem 0.5rem;
    }
    .password-display {
        min-width: 8rem;
        min-height: 1rem;
    }
</style>
