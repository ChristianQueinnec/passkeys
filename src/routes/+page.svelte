<script lang="ts">
    import Login from "$lib/components/Login.svelte";
    import Unlock from "$lib/components/Unlock.svelte";
    import Dashboard from "$lib/components/Dashboard.svelte";
    import { pbkdf2 } from "$lib/crypto";
    import { api } from "$lib/api";
    import { onMount } from "svelte";
    import Modal from "$lib/components/Modal.svelte";

    // Application State
    let startCpt = $state(0);
    let username = $state("");
    let password = $state("");
    let encryptionKey = $state<CryptoKey | null>(null);

    // 0 = Login, 1 = Unlock, 2 = Dashboard
    let phase = $state(0);
    let showUserMenu = $state(false);
    let showChangePasswordModal = $state(false);
    let dashboardRef = $state<any>(null);

    // Change Password State
    let cpOldPassword = $state("");
    let cpNewPassword = $state("");
    let cpError = $state("");
    let cpSuccess = $state("");

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
        showUserMenu = false;
    }

    function toggleMenu() {
        showUserMenu = !showUserMenu;
    }

    function openChangePassword() {
        showChangePasswordModal = true;
        showUserMenu = false;
        cpOldPassword = "";
        cpNewPassword = "";
        cpError = "";
        cpSuccess = "";
    }

    function handleSynchronize() {
        showUserMenu = false;
        if (dashboardRef && dashboardRef.synchronizeVault) {
            dashboardRef.synchronizeVault();
        }
    }

    async function handleChangePassword() {
        try {
            cpError = "";
            await api.changePassword(cpOldPassword, cpNewPassword);
            cpSuccess = "Password updated successfully";
            setTimeout(() => {
                showChangePasswordModal = false;
            }, 1500);
        } catch (e: any) {
            cpError = e.message;
        }
    }
</script>

<div class="app-container">
    <div class="header">
        <h1>Passkeys</h1>
        {#if phase > 0}
            <div class="user-info">
                <div class="user-menu-container">
                    <button class="user-btn" onclick={toggleMenu}>
                        {username} <span class="arrow">▼</span>
                    </button>
                    {#if showUserMenu}
                        <div class="dropdown-menu">
                            {#if phase === 2}
                                <button onclick={handleSynchronize}
                                    >Synchronize</button
                                >
                            {/if}
                            <button onclick={openChangePassword}
                                >Change Password</button
                            >
                            <button onclick={handleLogout}>Logout</button>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>

    <main>
        {#if phase === 0}
            <Login onLogin={handleLogin} />
        {:else if phase === 1}
            <Unlock onUnlock={handleUnlock} />
        {:else if phase === 2 && encryptionKey}
            <Dashboard bind:this={dashboardRef} {encryptionKey} {username} />
        {/if}
    </main>
</div>

<Modal
    isOpen={showChangePasswordModal}
    onClose={() => (showChangePasswordModal = false)}
    title="Change Password"
>
    <div class="change-password-form">
        <label>
            Current Password:
            <input type="password" bind:value={cpOldPassword} />
        </label>
        <label>
            New Password:
            <input type="password" bind:value={cpNewPassword} />
        </label>
        {#if cpError}
            <p class="error">{cpError}</p>
        {/if}
        {#if cpSuccess}
            <p class="success">{cpSuccess}</p>
        {/if}
        <div class="actions">
            <button onclick={handleChangePassword}>Update Password</button>
        </div>
    </div>
</Modal>

<style>
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
    main {
        flex: 1;
        overflow: hidden;
    }

    /* User Menu */
    .user-menu-container {
        position: relative;
    }
    .user-btn {
        background: none;
        border: none;
        color: white;
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .dropdown-menu {
        position: absolute;
        right: 0;
        top: 100%;
        background: white;
        color: black;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        overflow: hidden;
        min-width: 150px;
        z-index: 100;
        display: flex;
        flex-direction: column;
    }
    .dropdown-menu button {
        background: white;
        color: #333;
        border: none;
        padding: 0.75rem 1rem;
        text-align: left;
        cursor: pointer;
        width: 100%;
        border-radius: 0;
        font-weight: normal;
    }
    .dropdown-menu button:hover {
        background: #f0f0f0;
        transform: none;
        box-shadow: none;
    }

    /* Change Password Form */
    .change-password-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .change-password-form label {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .change-password-form input {
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
    }
    .change-password-form .actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 1rem;
    }
    .error {
        color: red;
    }
    .success {
        color: green;
    }
</style>
