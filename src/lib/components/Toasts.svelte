<script lang="ts">
    import { toasts } from "$lib/stores/useToasts.svelte";
    import { flip } from "svelte/animate";
    import { fly } from "svelte/transition";

    function getIcon(type: string) {
        switch (type) {
            case "success":
                return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            case "error":
                return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
            case "warning":
                return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
            default:
                return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }
    }
</script>

<div class="toast-container">
    {#each toasts.toasts as toast (toast.id)}
        <div
            class="toast {toast.type}"
            in:fly={{ y: 20, duration: 400 }}
            out:fly={{ x: 100, duration: 300 }}
            animate:flip={{ duration: 300 }}
        >
            <div class="icon">
                {@html getIcon(toast.type)}
            </div>
            <div class="content">
                {toast.message}
            </div>
            <button
                class="close-btn"
                onclick={() => toasts.remove(toast.id)}
                aria-label="Close"
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
                    ><line x1="18" y1="6" x2="6" y2="18"></line><line
                        x1="6"
                        y1="6"
                        x2="18"
                        y2="18"
                    ></line></svg
                >
            </button>
        </div>
    {/each}
</div>

<style>
    .toast-container {
        position: fixed;
        bottom: 1.5rem;
        right: 1.5rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        pointer-events: none;
    }

    .toast {
        pointer-events: auto;
        min-width: 280px;
        max-width: 400px;
        background: white;
        color: #1f2937;
        padding: 1rem;
        border-radius: 0.75rem;
        box-shadow:
            0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05),
            0 0 0 1px rgba(0, 0, 0, 0.05);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-family: inherit;
        overflow: hidden;
        border-right: 4px solid #d1d5db;
    }

    .toast.success {
        border-right-color: #10b981;
    }
    .toast.error {
        border-right-color: #ef4444;
    }
    .toast.warning {
        border-right-color: #f59e0b;
    }
    .toast.info {
        border-right-color: #3b82f6;
    }

    .icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .toast.success .icon {
        color: #10b981;
    }
    .toast.error .icon {
        color: #ef4444;
    }
    .toast.warning .icon {
        color: #f59e0b;
    }
    .toast.info .icon {
        color: #3b82f6;
    }

    .content {
        flex-grow: 1;
        font-size: 0.875rem;
        line-height: 1.25rem;
        font-weight: 500;
    }

    .close-btn {
        flex-shrink: 0;
        background: none;
        border: none;
        padding: 0.25rem;
        color: #9ca3af;
        cursor: pointer;
        border-radius: 0.375rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .close-btn:hover {
        background: #f3f4f6;
        color: #4b5563;
        box-shadow: none;
        transform: none;
    }
</style>
