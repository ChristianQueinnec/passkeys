<script lang="ts">
    import { i18n } from "$lib/stores/useI18n.svelte";
    import PasswordInput from "./PasswordInput.svelte";

    let {
        oldPassword = $bindable(""),
        newPassword = $bindable(""),
        confirmPassword = $bindable(""),
        errorMessage = $bindable(""),
        oldPasswordTestId = "old-password-input",
        newPasswordTestId = "new-password-input",
        confirmPasswordTestId = "confirm-password-input",
        oldPasswordId = "old-password",
        newPasswordId = "new-password",
        confirmPasswordId = "confirm-password",
    }: {
        oldPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
        errorMessage?: string;
        oldPasswordTestId?: string;
        newPasswordTestId?: string;
        confirmPasswordTestId?: string;
        oldPasswordId?: string;
        newPasswordId?: string;
        confirmPasswordId?: string;
    } = $props();

    $effect(() => {
        if (!newPassword || !confirmPassword) {
            errorMessage = i18n.t("auth.passwords_no_match");
            return;
        }

        if (newPassword !== confirmPassword) {
            errorMessage = i18n.t("auth.passwords_no_match");
        } else {
            errorMessage = "";
        }
    });
</script>

<div class="confirmed-password-input">
    <div class="field">
        <label for={oldPasswordId}>{i18n.t("auth.old_password")}:</label>
        <PasswordInput
            bind:value={oldPassword}
            id={oldPasswordId}
            placeholder={i18n.t("auth.old_password")}
            dataTestId={oldPasswordTestId}
        />
    </div>

    <div class="field">
        <label for={newPasswordId}>{i18n.t("auth.new_password")}:</label>
        <PasswordInput
            bind:value={newPassword}
            id={newPasswordId}
            placeholder={i18n.t("auth.new_password")}
            autocomplete="new-password"
            dataTestId={newPasswordTestId}
        />
    </div>

    <div class="field">
        <label for={confirmPasswordId}
            >{i18n.t("auth.confirm_new_password")}:</label
        >
        <PasswordInput
            bind:value={confirmPassword}
            id={confirmPasswordId}
            placeholder={i18n.t("auth.confirm_new_password")}
            autocomplete="new-password"
            dataTestId={confirmPasswordTestId}
        />
    </div>
</div>

<style>
    .confirmed-password-input {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    label {
        font-weight: 500;
        font-size: 0.9rem;
        color: #444;
    }
</style>
