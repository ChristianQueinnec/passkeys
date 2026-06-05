<script lang="ts">
    import { settings } from "$lib/stores/useSettings.svelte";

    let { remainingTime } = $props<{ remainingTime: number | null }>();

    let totalTime = $derived((window as any).__TESTING__ ? 1000 : settings.current.clipboardTimeout);
    let progress = $derived(remainingTime !== null ? (remainingTime / totalTime) * 100 : 0);
</script>

{#if remainingTime !== null}
    <div class="clipboard-progress-container" data-testid="clipboard-reset-bar">
        <div class="clipboard-progress-bar" style="width: {progress}%"></div>
    </div>
{/if}

<style>
    .clipboard-progress-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background-color: rgba(0, 0, 0, 0.1);
        z-index: 10000;
        pointer-events: none;
    }

    .clipboard-progress-bar {
        height: 100%;
        background-color: #3b82f6;
        transition: width 0.1s linear;
    }
</style>
