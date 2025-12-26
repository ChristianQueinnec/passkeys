<script lang="ts">
    import DetailsModal from "./DetailsModal.svelte";
    import EditorModal from "./EditorModal.svelte";
    import HistoryModal from "./HistoryModal.svelte";
    import type { PasswordEntry, HistoryItem } from "$lib/types";

    let {
        selectedItem = null,
        editingItem = null,
        isCreating = false,
        showHistoryModal = false,
        historyFiles = [],
        onCloseModals,
        onEdit,
        onDelete,
        onSave,
        onDeleteHistory,
        onCopy,
    }: {
        selectedItem?: PasswordEntry | null;
        editingItem?: PasswordEntry | null;
        isCreating?: boolean;
        showHistoryModal?: boolean;
        historyFiles?: HistoryItem[];
        onCloseModals: () => void;
        onEdit: (item: PasswordEntry) => void;
        onDelete: (item: PasswordEntry) => void;
        onSave: (item: PasswordEntry) => void;
        onDeleteHistory: (filename: string) => void;
        onCopy: (text: string) => void;
    } = $props();
</script>

<DetailsModal
    isOpen={!!selectedItem}
    item={selectedItem}
    onClose={onCloseModals}
    {onEdit}
    {onDelete}
    onCopy={onCopy}
/>

<EditorModal
    isOpen={!!editingItem}
    item={editingItem}
    {isCreating}
    onClose={onCloseModals}
    onSave={onSave}
/>

<HistoryModal
    isOpen={showHistoryModal}
    historyFiles={historyFiles}
    onClose={onCloseModals}
    onDelete={onDeleteHistory}
/>
