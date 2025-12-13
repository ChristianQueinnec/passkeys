<script lang="ts">
    let password = $state("");
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
    <p>Enter your master password to decrypt your vault.</p>
    <input
        type="password"
        placeholder="Master Password"
        bind:value={password}
    />
    <button onclick={handleUnlock} disabled={loading}>
        {loading ? "Deriving Key..." : "Unlock"}
    </button>
</div>

<style>
    .card {
        max-width: 400px;
        margin: 2rem auto;
        padding: 2rem;
        border: 1px solid #ccc;
        border-radius: 8px;
    }
    input {
        display: block;
        width: 100%;
        margin-bottom: 1rem;
        padding: 0.5rem;
    }
</style>
