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
        {#if historyFiles.some((file) => !file.isCiphered)}
            {i18n.t("vault.history_hint")}
        {/if}
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
                        <tr class={!file.isCiphered ? "unciphered-row" : ""}>
                            <td>
                                {new Date(file.mtime).toLocaleString(
                                    i18n.language === "fr" ? "fr-FR" : "en-US",
                                )}
                                {#if !file.isCiphered}
                                    <span
                                        class="warning-icon"
                                        title={i18n.t(
                                            "vault.unciphered_warning",
                                        )}
                                    >
                                        ⚠️
                                    </span>
                                {/if}
                            </td>
                            <td>{file.size} B</td>
                            <td>
                                {#if !file.isCiphered}
                                    <button
                                        class="danger small pulse"
                                        onclick={() => onDelete(file.name)}
                                        data-testid="history-delete-btn"
                                        title={i18n.t(
                                            "vault.unciphered_warning",
                                        )}
                                    >
                                        {i18n.t("vault.delete_promptly")}
                                    </button>
                                {:else}
                                    <button
                                        class="danger small"
                                        onclick={() => onDelete(file.name)}
                                        title={i18n.t("common.delete")}
                                        data-testid="history-delete-btn"
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
                                                d="M3 6H21M5 6V20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20V6M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6"
                                            />
                                            <path d="M14 11V17" />
                                            <path d="M10 11V17" />
                                        </svg>
                                    </button>
                                {/if}
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
    .unciphered-row {
        background-color: #fff9db;
    }
    .warning-icon {
        margin-left: 0.5rem;
        cursor: help;
    }
    .pulse {
        animation: pulse-animation 2s infinite;
    }
    @keyframes pulse-animation {
        0% {
            box-shadow: 0 0 0 0px rgba(220, 53, 69, 0.4);
        }
        70% {
            box-shadow: 0 0 0 10px rgba(220, 53, 69, 0);
        }
        100% {
            box-shadow: 0 0 0 0px rgba(220, 53, 69, 0);
        }
    }
</style>
