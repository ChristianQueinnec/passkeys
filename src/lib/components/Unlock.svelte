<script lang="ts">
    import PasswordInput from "./PasswordInput.svelte";
    import { api } from "$lib/api";

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
    <h2>Unlock Vault</h2>
    <p>Enter your vault password to unlock it.</p>
    <form
        onsubmit={(e) => {
            e.preventDefault();
            handleUnlock();
        }}
    >
        <div class="input-group">
            <PasswordInput placeholder="Vault Password" bind:value={password} />
        </div>
        <button type="submit" disabled={loading} data-testid="unlock-button">
            {loading ? "Deriving Key..." : "Unlock"}
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
