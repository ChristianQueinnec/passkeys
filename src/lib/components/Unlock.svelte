<script lang="ts">
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
            <input
                type={showPassword ? "text" : "password"}
                placeholder="Vault Password"
                bind:value={password}
            />
            <label>
                <input
                    type="checkbox"
                    checked={showPassword}
                    onclick={() => (showPassword = !showPassword)}
                /> Show
            </label>
        </div>
        <button type="submit" disabled={loading}>
            {loading ? "Deriving Key..." : "Unlock"}
        </button>
    </form>
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
    .input-group {
        margin-bottom: 1rem;
    }
    .input-group input[type="text"],
    .input-group input[type="password"] {
        margin-bottom: 0.5rem;
    }
    .input-group label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        cursor: pointer;
    }
</style>
