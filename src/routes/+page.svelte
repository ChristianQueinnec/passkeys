<script lang="ts">
    import Login from "$lib/components/Login.svelte";
    import Unlock from "$lib/components/Unlock.svelte";
    import Dashboard from "$lib/components/Dashboard.svelte";
    import FolderDashboard from "$lib/components/FolderDashboard.svelte";
    import { pbkdf2 } from "$lib/crypto";
    import { api } from "$lib/api";
    import { onMount, tick } from "svelte";
    import Modal from "$lib/components/Modal.svelte";
    import { useVault } from "$lib/stores/useVault.svelte";
    import { useVaultSecurity } from "$lib/stores/useVaultSecurity.svelte";
    import { useVaultSync } from "$lib/stores/useVaultSync.svelte";
    import { i18n } from "$lib/stores/useI18n.svelte";
    import { settings } from "$lib/stores/useSettings.svelte";

    // Application State
    let username = $state("");
    let encryptionKey = $state<CryptoKey | null>(null);
    let useFolderView = $state(true); // Default to folder view

    // 0 = Login, 1 = Unlock, 2 = Dashboard
    let phase = $state(0);
    let vaultExists = $state(false);
    let showUserMenu = $state(false);
    let showChangePasswordModal = $state(false);

    // Change Password State
    let cpOldPassword = $state("");
    let cpNewPassword = $state("");
    let cpError = $state("");
    let cpSuccess = $state("");

    // Initialize Global Stores
    // Pass getters because encryptionKey and username change over time
    const vault = useVault(
        () => encryptionKey as CryptoKey,
        () => username,
    );

    // Security handles auto-lock and clearing data from memory
    const security = useVaultSecurity(
        vault,
        () => encryptionKey as CryptoKey,
        () => {
            // Optional callback when memory is cleared.
            // Child components listen to security.isMemoryCleared to update UI
        },
    );

    useVaultSync(vault);

    async function checkVaultExists() {
        if (!api.token) return;
        vaultExists = false; // Reset first
        try {
            // Check local
            if (localStorage.getItem("offline_vault")) {
                vaultExists = true;
                return;
            }
            // Check server
            const latest = await api.getLatestVault();
            vaultExists = !!latest;
        } catch (e) {
            console.error("Failed to check vault existence", e);
            vaultExists = false;
        }
    }

    // Check for existing token
    onMount(async () => {
        // Load settings first
        await settings.load();

        if (api.token) {
            username = api.username || "";
            // Get CSRF token for existing session
            await api.getCSRFToken();
            await checkVaultExists();
            phase = 1; // Go to unlock
        }
    });

    async function handleLogin(newUsername: string, newPassword?: string) {
        username = newUsername;
        vaultExists = false; // Force reset
        await checkVaultExists();
        phase = 1; // Move to Unlock
        await tick();
    }

    async function handleUnlock(masterPassword: string) {
        try {
            // Derive key (PBKDF2) using externalized salt and iterations
            const salt = new TextEncoder().encode(
                settings.current.masterPasswordSalt,
            );
            encryptionKey = await pbkdf2(
                masterPassword,
                salt,
                settings.current.pbkdf2Iterations,
            );
            // Load vault once key is derived
            await vault.loadVault();
            // Upate vaultExists status after successful load just in case
            vaultExists = true;
            phase = 2; // Move to Dashboard
            await tick();
        } catch (e) {
            alert("Failed to derive key");
            console.error(e);
        }
    }

    function handleLogout() {
        api.logout();
        username = "";
        encryptionKey = null;
        vault.cleanup();
        phase = 0;
        showUserMenu = false;
    }

    function toggleDashboardView() {
        useFolderView = !useFolderView;
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

    async function handleSynchronize() {
        showUserMenu = false;
        await vault.synchronizeVault();
    }

    async function handleChangePassword() {
        try {
            cpError = "";
            await api.changePassword(cpOldPassword, cpNewPassword);
            cpSuccess = i18n.t("auth.password_updated");
            setTimeout(() => {
                showChangePasswordModal = false;
            }, 3000);
        } catch (e: any) {
            cpError = e.message;
        }
    }
</script>

<div class="app-container" data-phase={phase}>
    <div class="header">
        <div class="header-left">
            <h1 data-testid="app-title">{i18n.t("app.title")}</h1>
            <div class="lang-switcher">
                <button
                    class:active={i18n.language === "en"}
                    onclick={() => i18n.setLanguage("en")}>EN</button
                >
                <button
                    class:active={i18n.language === "fr"}
                    onclick={() => i18n.setLanguage("fr")}>FR</button
                >
            </div>
        </div>
        {#if phase > 0}
            <div class="user-info">
                <div class="user-menu-container">
                    <button class="user-btn" onclick={toggleMenu}>
                        <span class="user-name">{username}</span>
                        <span class="arrow">▼</span>
                    </button>
                    {#if showUserMenu}
                        <div class="dropdown-menu">
                            {#if phase === 2}
                                <button
                                    onclick={handleSynchronize}
                                    data-testid="menu-sync"
                                    >{i18n.t("vault.sync")}</button
                                >
                            {/if}
                            <button
                                onclick={openChangePassword}
                                data-testid="menu-change-password"
                                >{i18n.t("auth.change_password")}</button
                            >
                            <a
                                href="https://github.com/ChristianQueinnec/passkeys/blob/main/user-guide.md"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="menu-link"
                                data-testid="menu-help"
                                onclick={() => (showUserMenu = false)}
                            >
                                {i18n.t("app.help")}
                            </a>
                            <button
                                onclick={handleLogout}
                                data-testid="menu-logout"
                                >{i18n.t("auth.logout")}</button
                            >
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
            <Unlock {vaultExists} onUnlock={handleUnlock} />
        {:else if phase === 2 && encryptionKey}
            {#if useFolderView}
                <FolderDashboard
                    {encryptionKey}
                    {username}
                    {vault}
                    {security}
                    onToggleView={toggleDashboardView}
                />
            {:else}
                <Dashboard
                    {encryptionKey}
                    {username}
                    {vault}
                    {security}
                    onToggleView={toggleDashboardView}
                />
            {/if}
        {/if}
    </main>
</div>

<Modal
    isOpen={showChangePasswordModal}
    onClose={() => (showChangePasswordModal = false)}
    title={i18n.t("auth.change_password")}
>
    <div class="change-password-form">
        <label>
            {i18n.t("auth.old_password")}:
            <input
                type="password"
                bind:value={cpOldPassword}
                data-testid="cp-old"
            />
        </label>
        <label>
            {i18n.t("auth.new_password")}:
            <input
                type="password"
                bind:value={cpNewPassword}
                data-testid="cp-new"
            />
        </label>
        {#if cpError}
            <p class="error">{cpError}</p>
        {/if}
        {#if cpSuccess}
            <p class="success">{cpSuccess}</p>
        {/if}
        <div class="actions">
            <button onclick={handleChangePassword} data-testid="cp-submit"
                >{i18n.t("auth.update_password")}</button
            >
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
    .header-left {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }
    .lang-switcher {
        display: flex;
        gap: 0.5rem;
        background: #444;
        padding: 0.2rem;
        border-radius: 4px;
    }
    .lang-switcher button {
        background: none;
        border: none;
        color: #999;
        font-size: 0.75rem;
        padding: 0.2rem 0.5rem;
        cursor: pointer;
        border-radius: 2px;
        font-weight: bold;
    }
    .lang-switcher button:hover {
        color: #fff;
    }
    .lang-switcher button.active {
        background: #666;
        color: #fff;
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
    .dropdown-menu button,
    .menu-link {
        background: white;
        color: #333;
        border: none;
        padding: 0.75rem 1rem;
        text-align: left;
        cursor: pointer;
        width: 100%;
        border-radius: 0;
        font-weight: normal;
        text-decoration: none;
        display: block;
        box-sizing: border-box;
    }
    .dropdown-menu button:hover,
    .menu-link:hover {
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
