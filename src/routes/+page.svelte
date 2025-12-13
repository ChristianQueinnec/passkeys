<script lang="ts">
    import Login from "$lib/components/Login.svelte";
    import Unlock from "$lib/components/Unlock.svelte";
    import Dashboard from "$lib/components/Dashboard.svelte";
    import { pbkdf2 } from "$lib/crypto";
    import { api } from "$lib/api";
    import { onMount } from "svelte";

    // Application State
    let startCpt = $state(0);
    let username = $state("");
    let password = $state("");
    let encryptionKey = $state<CryptoKey | null>(null);

    // 0 = Login, 1 = Unlock, 2 = Dashboard
    let phase = $state(0);

    // Check for existing token
    onMount(() => {
        if (api.token) {
            username = api.username || "";
            phase = 1; // Go to unlock
        }
    });

    function handleLogin(u: string, p: string) {
        username = u;
        password = p;
        phase = 1; // Move to Unlock
    }

    async function handleUnlock(masterPassword: string) {
        try {
            // Derive key (PBKDF2) - In real app, salt should be user-specific from server
            // For MVP using fixed salt as per previous implementation
            const fixedSalt = new TextEncoder().encode("mvp_salt_fixed");
            encryptionKey = await pbkdf2(masterPassword, fixedSalt);
            phase = 2; // Move to Dashboard
        } catch (e) {
            alert("Failed to derive key");
            console.error(e);
        }
    }

    function handleLogout() {
        api.logout();
        username = "";
        password = "";
        encryptionKey = null;
        phase = 0;
    }
</script>

<div class="app-container">
    <div class="header">
        <h1>Passkeys</h1>
        {#if phase > 0}
            <div class="user-info">
                <span>{username}</span>
                <button onclick={handleLogout}>Logout</button>
            </div>
        {/if}
    </div>

    <main>
        {#if phase === 0}
            <Login onLogin={handleLogin} />
        {:else if phase === 1}
            <Unlock onUnlock={handleUnlock} />
        {:else if phase === 2 && encryptionKey}
            <Dashboard {encryptionKey} {username} />
        {/if}
    </main>
</div>

<style>
    :global(body) {
        font-family: sans-serif;
        margin: 0;
        padding: 0;
        background: #f4f4f4;
    }
    .app-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
    }
    .header {
        background: #333;
        color: white;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .header h1 {
        margin: 0;
        font-size: 1.25rem;
    }
    .user-info span {
        margin-right: 1rem;
    }
    main {
        flex: 1;
        overflow: hidden;
    }
</style>
