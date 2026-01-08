<script lang="ts">
    import PasswordInput from "./PasswordInput.svelte";
    import { api } from "$lib/api";
    import { i18n } from "$lib/stores/useI18n.svelte";

    let password = $state("");
    let showPassword = $state(false);
    let loading = $state(false);

    let { vaultExists, onUnlock } = $props();
    const notice = $derived(
        vaultExists
            ? i18n.t("auth.unlock_vault_exists")
            : i18n.t("auth.unlock_no_vault"),
    );

    async function handleUnlock() {
        loading = true;
        try {
            await onUnlock(password);
        } finally {
            loading = false;
        }
    }
</script>

<div class="card">
    <h2>{i18n.t("auth.unlock")}</h2>
    <p>
        {i18n.t("auth.unlock_confirm")}
    </p>
    <div class="unlock-notice" class:exists={vaultExists}>
        {notice}
    </div>

    <form
        onsubmit={(e) => {
            e.preventDefault();
            handleUnlock();
        }}
    >
        <div class="input-group">
            <PasswordInput
                autofocus={true}
                placeholder={i18n.t("auth.unlock_placeholder")}
                bind:value={password}
            />
        </div>

        <button type="submit" disabled={loading} data-testid="unlock-button">
            {loading
                ? i18n.t("auth.deriving_key")
                : i18n.t("auth.unlock_button")}
        </button>
    </form>
</div>

<style>
    .card {
        max-width: 400px;
        margin: 2rem auto;
    }
    .input-group {
        margin-bottom: 1rem;
    }
    .unlock-notice {
        background: #f8f9fa;
        border-left: 4px solid #6c757d;
        padding: 0.75rem;
        margin-bottom: 1.5rem;
        font-size: 0.9rem;
        color: #495057;
        line-height: 1.4;
    }
    .unlock-notice.exists {
        border-left-color: #28a745;
        background: #f0fff4;
    }
</style>
