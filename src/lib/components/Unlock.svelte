<script lang="ts">
    import PasswordInput from "./PasswordInput.svelte";
    import { api } from "$lib/api";
    import { i18n } from "$lib/stores/useI18n.svelte";

    let password = $state("");
    let showPassword = $state(false);
    let loading = $state(false);

    let { onUnlock } = $props();

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

    <form
        onsubmit={(e) => {
            e.preventDefault();
            handleUnlock();
        }}
    >
        <div class="input-group">
            <PasswordInput
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
</style>
