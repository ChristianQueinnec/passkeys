<script lang="ts">
    import Login from "$lib/components/Login.svelte";
    import { browser } from "$app/environment";
    import Unlock from "$lib/components/Unlock.svelte";
    import Dashboard from "$lib/components/Dashboard.svelte";
    import FolderDashboard from "$lib/components/FolderDashboard.svelte";
    import { pbkdf2 } from "$lib/crypto";
    import { api } from "$lib/api";
    import { onMount, tick, untrack } from "svelte";
    import { useVault } from "$lib/stores/useVault.svelte";
    import { useVaultSync } from "$lib/stores/useVaultSync.svelte";
    import { i18n } from "$lib/stores/useI18n.svelte";
    import { settings } from "$lib/stores/useSettings.svelte";
    import { toasts } from "$lib/stores/useToasts.svelte";
    import ChangeLoginPasswordModal from "$lib/components/ChangeLoginPasswordModal.svelte";
    import ChangeVaultPasswordModal from "$lib/components/ChangeVaultPasswordModal.svelte";
    import SecuritySettingsModal from "$lib/components/SecuritySettingsModal.svelte";
    import ClipboardProgressBar from "$lib/components/ClipboardProgressBar.svelte";
    import LanguageSwitcher from "$lib/components/LanguageSwitcher.svelte";
    import { EncryptionKey } from "$lib/vaultkey";
    import { exportToKeepassCSV } from "$lib/keepass";

    // Application State
    let username = $state("");
    let encryptionKey = $state(new EncryptionKey(null)); // Encapsulated key
    let useFolderView = $state(true); // Default to folder view

    // 0 = Login, 1 = Unlock, 2 = Dashboard
    let phase = $state(0);
    let vaultExists = $state(false);
    let showUserMenu = $state(false);
    let showChangeLoginPasswordModal = $state(false);
    let showChangeVaultPasswordModal = $state(false);
    let showSecuritySettingsModal = $state(false);
    let unlockMessage = $state("");

    function forceUnlocking() {
        phase = 1; // Go to Unlock
        unlockMessage = vault.easyUnlockChallenge
            ? i18n.t("vault.quick_unlock_available")
            : i18n.t("vault.security_timeout");
    }

    // Initialize Global Stores
    const vault = useVault(encryptionKey, forceUnlocking);

    useVaultSync(vault, () => phase === 2);

    async function checkVaultExists() {
        if (!username) return;
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

        api.onUnauthorized = () => {
            // UI level logout
            username = "";
            encryptionKey.remove();
            vault.cleanup();
            phase = 0;
            showUserMenu = false;
        };

        if (browser) {
            const prefersListView = window.matchMedia(
                "(max-width: 768px) and (orientation: portrait)",
            ).matches;
            useFolderView = !prefersListView;

            if ((window as any).__TESTING__) {
                (window as any).__PASSKEYS_TEST__ = {
                    lockVault: () => vault.lockNow(),
                    clearEasyUnlock: () => vault.clearEasyUnlockState(),
                    getEasyUnlockChallenge: () => vault.easyUnlockChallenge,
                    getRememberedMasterPassword: () =>
                        vault.getRememberedMasterPassword(),
                };
            }
        }

        try {
            const sessionUsername = await api.getSession();
            if (sessionUsername) {
                username = sessionUsername;
                // Get CSRF token for existing session
                await api.getCSRFToken();
                await checkVaultExists();
                phase = 1; // Go to unlock
            }
        } catch {
            if (api.username) {
                username = api.username;
                await checkVaultExists();
                phase = 1;
            }
        }
    });

    async function handleLogin(newUsername: string) {
        username = newUsername;
        vaultExists = false; // Force reset
        await checkVaultExists();
        phase = 1; // Move to Unlock
        await tick();
    }

    async function handleUnlock(masterPassword: string) {
        // Derive key (PBKDF2) using externalized salt and iterations
        const salt = new TextEncoder().encode(
            settings.current.masterPasswordSalt,
        );
        const iterations =
            browser && (window as any).__TESTING__
                ? settings.current.pbkdf2IterationsTest
                : settings.current.pbkdf2Iterations;

        const keyDerivationStartedAt = performance.now();
        const derivedKey = await pbkdf2(masterPassword, salt, iterations);
        const keyDerivationDurationMs = performance.now() - keyDerivationStartedAt;
        console.info(
            `Vault key derivation completed in ${keyDerivationDurationMs.toFixed(2)} ms (${iterations} PBKDF2 iterations)`,
        );
        encryptionKey.set = derivedKey;
        // Load vault once key is derived
        const success = await vault.loadVault();

        if (success) {
            // Automatically renew token if vault is unlocked successfully
            try {
                await api.renewToken();
            } catch (e) {
                console.warn("Token renewal failed during unlock", e);
            }

            vault.rememberMasterPassword(masterPassword);
            // Upate vaultExists status after successful load just in case
            vaultExists = true;
            phase = 2; // Move to Dashboard
        } else {
            throw new Error(i18n.t("auth.unlock_failed"));
        }
        await tick();
    }

    async function handleEasyUnlock(answer: string) {
        if (!vault.validateEasyUnlockAnswer(answer)) {
            throw new Error(i18n.t("auth.easy_unlock_failed"));
        }

        const masterPassword = vault.getRememberedMasterPassword();
        if (!masterPassword) {
            throw new Error(i18n.t("auth.easy_unlock_unavailable"));
        }

        await handleUnlock(masterPassword);
    }

    async function handleLogout() {
        await api.logout();
        username = "";
        encryptionKey.remove();
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

    function changeSecuritySettings() {
        showSecuritySettingsModal = true;
        showUserMenu = false;
    }

    function changeLoginPassword() {
        showChangeLoginPasswordModal = true;
        showUserMenu = false;
    }

    async function handleSynchronize() {
        showUserMenu = false;
        await vault.synchronizeVault();
    }

    async function handleVaultPasswordChange(newKey: CryptoKey) {
        encryptionKey.set = newKey;
        await tick();
        // Force save to re-encrypt with new key
        // We pass true to save to server as well
        await vault.saveVault(true);
        // Show success logic if needed (modal handles success callback then close)
        // Check if save was successful? saveVault handles errors with alerts.
        // Alert user of success
        toasts.success(i18n.t("vault.password_changed"));
    }

    let fileInput = $state<HTMLInputElement>();

    async function exportToKeepass() {
        showUserMenu = false;
        try {
            const csv = exportToKeepassCSV(await vault.exportItems());
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "passkeys-" + new Date().toISOString().slice(0, 10) + ".csv";
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export vault to KeePass", error);
            toasts.error(i18n.t("vault.export_error"));
        }
    }

    function triggerImport() {
        showUserMenu = false;
        fileInput?.click();
    }

    async function handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                if (!content) return;

                const json = JSON.parse(content);
                if (Array.isArray(json)) {
                    const success = vault.importItems(json);
                    if (success) {
                        toasts.success(i18n.t("vault.import_success"));
                    } else {
                        toasts.error(i18n.t("vault.import_error"));
                    }
                } else {
                    toasts.error(i18n.t("vault.import_error"));
                }
            } catch (err) {
                console.error(err);
                toasts.error(i18n.t("vault.import_error"));
            } finally {
                input.value = ""; // Reset
            }
        };

        reader.readAsText(file);
    }
</script>

<ClipboardProgressBar remainingTime={vault.clipboardRemainingTime} />

<div class="app-container" data-phase={phase}>
    <div class="header">
        <div class="header-left">
            <h1 data-testid="app-title">{i18n.t("app.title")}</h1>
            <LanguageSwitcher />
        </div>
        {#if phase > 0}
            <div class="user-info">
                <div class="user-menu-container">
                    <button
                        class="user-btn"
                        onclick={toggleMenu}
                        data-testid="user-menu-btn"
                    >
                        <span class="user-name">{username}</span>
                        <span class="arrow">▼</span>
                    </button>
                    {#if showUserMenu}
                        <div class="dropdown-menu">
                            <button
                                onclick={changeLoginPassword}
                                data-testid="menu-change-password"
                                >{i18n.t("auth.change_password")}</button
                            >
                            {#if phase === 2}
                                <button
                                    onclick={handleSynchronize}
                                    data-testid="menu-sync"
                                    >{i18n.t("vault.sync")}</button
                                >
                                <button
                                    onclick={changeSecuritySettings}
                                    data-testid="menu-security-settings"
                                    >{i18n.t("settings.menu")}</button
                                >
                                <button
                                    onclick={() => {
                                        showUserMenu = false;
                                        showChangeVaultPasswordModal = true;
                                    }}
                                    data-testid="menu-change-vault-password"
                                    >{i18n.t("vault.change_password")}</button
                                >
                                <button
                                    onclick={triggerImport}
                                    data-testid="menu-import"
                                    >{i18n.t("vault.import")}</button
                                >
                                <button onclick={exportToKeepass} data-testid="menu-export-keepass">{i18n.t("vault.export_keepass")}</button>
                            {/if}
                            <a
                                href={i18n.t("doc.file")}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="menu-link"
                                data-testid="menu-help"
                                onclick={() => (showUserMenu = false)}
                            >
                                {i18n.t("app.help")}
                            </a>
                            <a
                                href="/about"
                                class="menu-link"
                                data-testid="menu-about"
                                onclick={() => (showUserMenu = false)}
                            >
                                {i18n.t("app.about")}
                            </a>
                            <button
                                onclick={handleLogout}
                                data-testid="menu-logout"
                                >{i18n.t("auth.logout")}</button
                            >
                        </div>
                    {/if}
                    <input
                        type="file"
                        bind:this={fileInput}
                        onchange={handleFileSelect}
                        accept=".json"
                        style="display: none;"
                        data-testid="import-file-input"
                    />
                </div>
            </div>
        {/if}
    </div>
    {#if vault.offlineMode}
        <div class="offline-banner" data-testid="offline-indicator">
            ⚠️ {i18n.t("vault.offline_mode")}
        </div>
    {/if}
    <main>
        {#if phase === 0}
            <Login onLogin={handleLogin} />
        {:else if phase === 1}
            <Unlock
                {vaultExists}
                onUnlock={handleUnlock}
                onEasyUnlock={handleEasyUnlock}
                message={unlockMessage}
                easyUnlockChallenge={vault.easyUnlockChallenge}
            />
        {:else if phase === 2 && encryptionKey.isSet}
            {#if useFolderView}
                <FolderDashboard {vault} onToggleView={toggleDashboardView} />
            {:else}
                <Dashboard {vault} onToggleView={toggleDashboardView} />
            {/if}
        {/if}
    </main>
</div>

<ChangeLoginPasswordModal
    isOpen={showChangeLoginPasswordModal}
    onClose={() => (showChangeLoginPasswordModal = false)}
/>

<SecuritySettingsModal
    isOpen={showSecuritySettingsModal}
    onClose={() => (showSecuritySettingsModal = false)}
    onSaved={() => {
        vault.resetInactivityTimer();
        vault.refreshEasyUnlockTimer();
    }}
/>

<ChangeVaultPasswordModal
    isOpen={showChangeVaultPasswordModal}
    onClose={() => (showChangeVaultPasswordModal = false)}
    onSuccess={handleVaultPasswordChange}
    encryptionKey={encryptionKey.isSet ? encryptionKey.get : null}
    encryptedVaultData={vault.encryptedVaultData}
/>

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
    main {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
    }
    .offline-banner {
        background: #fff3cd;
        color: #856404;
        padding: 0.5rem 1rem;
        text-align: center;
        border-bottom: 1px solid #ffeeba;
        font-size: 0.9rem;
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
</style>
