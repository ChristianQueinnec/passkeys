<script lang="ts">
    import Modal from "$lib/components/Modal.svelte";
    import type { HistoryItem } from "$lib/types";
    import { i18n } from "$lib/stores/useI18n.svelte";

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

<Modal {isOpen} {onClose} title={i18n.t("vault.history")}>
    <p class="hint">
        {i18n.t("vault.history_hint")}
    </p>

    <div class="history-list">
        {#if historyFiles.length === 0}
            <p>
                {i18n.t("vault.history_empty")}
            </p>
        {:else}
            <table>
                <thead>
                    <tr>
                        <th>{i18n.t("common.date")}</th>
                        <th>{i18n.t("common.size")}</th>
                        <th>{i18n.t("common.actions")}</th>
                    </tr>
                </thead>
                <tbody>
                    {#each historyFiles as file}
                        <tr>
                            <td
                                >{new Date(file.mtime).toLocaleString(
                                    i18n.language === "fr" ? "fr-FR" : "en-US",
                                )}</td
                            >
                            <td>{file.size} B</td>
                            <td>
                                <button
                                    class="danger small"
                                    onclick={() => onDelete(file.name)}
                                    data-testid="history-delete-btn"
                                    >{i18n.t("common.delete")}</button
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
