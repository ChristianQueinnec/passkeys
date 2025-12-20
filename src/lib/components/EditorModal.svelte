<script lang="ts">
    import Modal from "$lib/components/Modal.svelte";
    import Editor from "$lib/components/Editor.svelte";
    import type { PasswordEntry } from "$lib/types";

    let {
        isOpen,
        item,
        isCreating,
        onClose,
        onSave,
    }: {
        isOpen: boolean;
        item: PasswordEntry | null;
        isCreating: boolean;
        onClose: () => void;
        onSave: (item: PasswordEntry) => void;
    } = $props();
</script>

<Modal {isOpen} {onClose} title={isCreating ? "New Item" : "Edit Item"}>
    {#if item}
        <Editor {item} {onSave} onCancel={onClose} />
    {/if}
</Modal>
