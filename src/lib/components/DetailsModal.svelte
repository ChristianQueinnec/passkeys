<script lang="ts">
    import Modal from "$lib/components/Modal.svelte";
    import type { PasswordEntry } from "$lib/types";
    import { i18n } from "$lib/stores/useI18n.svelte";

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
</script>

<Modal {isOpen} {onClose} title={item?.title}>
    {#if item}
        <div class="details">
            <div class="field">
                <strong>Site URL:</strong>
                <a href={item.site} target="_blank">{item.site}</a>
            </div>
            <div class="field">
                <strong>Username:</strong>
                <span>{item.username}</span>
                <button
                    class="small"
                    onclick={() => item && onCopy(item.username || "")}
                    >Copy</button
                >
            </div>
            <div class="field">
                <strong>Password:</strong>
                <span>********</span>
                <button
                    class="small"
                    onclick={() => item && onCopy(item.password || "")}
                    >Copy</button
                >
            </div>
            <div class="field">
                <strong>Tags:</strong>
                <span>{item.tags?.join(", ")}</span>
                <span></span>
            </div>
            <div class="field">
                <strong>Notes:</strong>
                <pre>{item.notes}</pre>
            </div>

            <div class="actions">
                <button onclick={() => item && onEdit(item)}>Edit</button>
                <button onclick={() => item && onDelete(item)} class="danger"
                    >Delete</button
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
