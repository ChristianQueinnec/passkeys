<script lang="ts">
    import Modal from "$lib/components/Modal.svelte";
    import type { HistoryItem } from "$lib/types";

    let {
        isOpen,
        historyFiles,
        onClose,
        onDelete,
    }: {
        isOpen: boolean;
        historyFiles: HistoryItem[];
        onClose: () => void;
        onDelete: (filename: string) => void;
    } = $props();
</script>

<Modal {isOpen} {onClose} title="Vault History">
    <p class="hint">
        Don't forget to erase non-ciphered vaults if any!
    </p>
    <div class="history-list">
        {#if historyFiles.length === 0}
            <p>No history found.</p>
        {:else}
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Size</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each historyFiles as file}
                        <tr>
                            <td>{new Date(file.mtime).toLocaleString()}</td>
                            <td>{file.size} B</td>
                            <td>
                                <button
                                    class="danger small"
                                    onclick={() => onDelete(file.name)}
                                    >Delete</button
                                >
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </div>
</Modal>

<style>
    table {
        width: 100%;
        border-collapse: collapse;
    }
    th,
    td {
        padding: 0.5rem;
        text-align: left;
        border-bottom: 1px solid #eee;
    }
    .small {
        font-size: 0.8rem;
        padding: 0.25rem 0.5rem;
    }
 p.hint {
     margin-left: 2rem;
     color: grey;
 }
</style>
