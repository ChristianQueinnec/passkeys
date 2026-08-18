<script lang="ts">
    import Modal from "$lib/components/Modal.svelte";
    import Editor from "$lib/components/Editor.svelte";
    import type { PasswordEntry } from "$lib/types";
    import { i18n } from "$lib/stores/useI18n.svelte";

    let {
        isOpen,
        item,
        isCreating,
        onClose,
        onSave,
        getUsernameSuggestions,
    }: {
        isOpen: boolean;
        item: PasswordEntry | null;
        isCreating: boolean;
        onClose: () => void;
        onSave: (item: PasswordEntry) => void;
        getUsernameSuggestions?: (currentId?: string) => Promise<string[]>;
    } = $props();
</script>

<Modal
    {isOpen}
    {onClose}
    title={isCreating ? i18n.t("vault.new_entry") : i18n.t("common.edit")}
>
    {#if item}
        <Editor {item} {onSave} {getUsernameSuggestions} onCancel={onClose} />
    {/if}
</Modal>
