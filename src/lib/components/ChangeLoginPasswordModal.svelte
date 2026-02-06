<script lang="ts">
    import Modal from "./Modal.svelte";
    import { i18n } from "$lib/stores/useI18n.svelte";
    import ConfirmedPasswordInput from "./ConfirmedPasswordInput.svelte";
    import { api } from "$lib/api";
 import { untrack } from "svelte";

    let {
        isOpen,
        onClose,
    }: {
        isOpen: boolean;
        onClose: () => void;
    } = $props();

    let oldPassword = $state("");
    let newPassword = $state("");
    let confirmPassword = $state("");
    let error = $state("");
    let success = $state("");

    // Auto-clear error when user starts typing in any password field
    // This provides immediate feedback that they're addressing the issue
    $effect(() => {
        oldPassword; // Create dependency
        newPassword; // Create dependency
        confirmPassword; // Create dependency
        success;
        error = "";
    });

    async function handleSubmit() {
        try {
            error = "";
            success = "";

            // Validate passwords match
            if (newPassword !== confirmPassword) {
                error = i18n.t("auth.passwords_no_match");
                return;
            }

            // Validate new password is not empty
            if (newPassword.length < 1) {
                error = i18n.t("auth.password_empty");
                return;
            }

            await api.changePassword(oldPassword, newPassword);
            success = i18n.t("auth.password_updated");
            
            // Auto-close after success
            setTimeout(() => {
                onClose();
                // Reset form
                oldPassword = "";
                newPassword = "";
                confirmPassword = "";
            }, 3000);
            
        } catch (e: any) {
            console.error(e);
            error = e.message || i18n.t("auth.password_update_failed");
        }
    }
</script>

<Modal {isOpen} {onClose} title={i18n.t("auth.change_password")}>
    <div class="change-login-password-form">
        <ConfirmedPasswordInput
            bind:oldPassword
            bind:newPassword
            bind:confirmPassword
            bind:errorMessage={error}
            oldPasswordTestId="cp-old"
            newPasswordTestId="cp-new"
            confirmPasswordTestId="cp-confirm"
        />

        {#if error}
            <p class="error" role="alert" aria-live="polite">{error}</p>
        {/if}
        
        {#if success}
            <p class="success" role="status" aria-live="polite">{success}</p>
        {/if}

        <div class="actions">
            <button onclick={onClose} class="secondary"
                >{i18n.t("common.cancel")}</button
            >
            <button
                onclick={handleSubmit}
                data-testid="cp-submit"
            >
                {i18n.t("auth.update_password")}
            </button>
        </div>
    </div>
</Modal>

<style>
    .change-login-password-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .error {
        color: #dc3545;
        font-size: 0.9rem;
        margin: 0;
    }

    .success {
        color: #28a745;
        font-size: 0.9rem;
        margin: 0;
    }

    button.secondary {
        background: #6c757d;
    }
</style>
