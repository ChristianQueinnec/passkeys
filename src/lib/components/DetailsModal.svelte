<script lang="ts">
    import Modal from "$lib/components/Modal.svelte";
    import type { PasswordEntry } from "$lib/types";
    import { i18n } from "$lib/stores/useI18n.svelte";
    import snarkdown from "snarkdown";
    import DOMPurify from "dompurify";

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

    const renderedNotes = $derived(
        item?.notes ? DOMPurify.sanitize(snarkdown(item.notes)) : "",
    );
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
                    >{i18n.t("common.copy")}</button
                >
            </div>
            <div class="field">
                <strong>{i18n.t("common.password")}:</strong>
                <span>********</span>
                <button
                    class="small"
                    onclick={() => item && onCopy(item.password || "")}
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
</style>
