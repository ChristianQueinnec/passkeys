<script lang="ts">
    import { i18n } from "$lib/stores/useI18n.svelte";
    import { translations, type Language } from "$lib/i18n/translations";
    import { onMount } from "svelte";

    let isOpen = $state(false);
    let container: HTMLDivElement | null = $state(null);

    const languages = Object.keys(translations) as Language[];

    function toggleMenu() {
        isOpen = !isOpen;
    }

    function selectLanguage(lang: Language) {
        i18n.setLanguage(lang);
        isOpen = false;
    }

    function handleClickOutside(event: MouseEvent) {
        if (container && !container.contains(event.target as Node)) {
            isOpen = false;
        }
    }

    onMount(() => {
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    });
</script>

<div class="lang-switcher-container" bind:this={container}>
    <button
        class="lang-btn"
        onclick={toggleMenu}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        data-testid="lang-switcher-btn"
    >
        {i18n.language.toUpperCase()}
        <span class="arrow" class:open={isOpen}>▼</span>
    </button>

    {#if isOpen}
        <div class="lang-dropdown" role="listbox">
            {#each languages as lang}
                <button
                    class="lang-option"
                    class:selected={i18n.language === lang}
                    onclick={() => selectLanguage(lang)}
                    role="option"
                    aria-selected={i18n.language === lang}
                >
                    {lang.toUpperCase()}
                </button>
            {/each}
        </div>
    {/if}
</div>

<style>
    .lang-switcher-container {
        position: relative;
        display: inline-block;
    }

    .lang-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        padding: 0.4rem 0.8rem;
        border-radius: 4px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s;
        box-shadow: none;
    }

    .lang-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.4);
    }

    .arrow {
        font-size: 0.7rem;
        transition: transform 0.2s;
    }

    .arrow.open {
        transform: rotate(180deg);
    }

    .lang-dropdown {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        background: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 0.5rem;
        min-width: 80px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .lang-option {
        background: transparent;
        border: none;
        color: #333;
        padding: 0.5rem 1rem;
        text-align: left;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        width: 100%;
        transition: all 0.2s;
        box-shadow: none;
    }

    .lang-option:hover {
        background: #f0f7ff;
        color: #007bff;
    }

    .lang-option.selected {
        font-weight: bold;
        color: #007bff;
        background: #e6f0ff;
    }
</style>
