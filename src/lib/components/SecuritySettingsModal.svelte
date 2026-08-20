<script lang="ts">
    import Modal from "$lib/components/Modal.svelte";
    import { i18n } from "$lib/stores/useI18n.svelte";
    import { settings } from "$lib/stores/useSettings.svelte";

    let { isOpen, onClose, onSaved } = $props<{
        isOpen: boolean;
        onClose: () => void;
        onSaved?: () => void;
    }>();

    let inactivityMinutes = $state(15);
    let quickUnlockMinutes = $state(60);
    let error = $state("");
    let wasOpen = false;

    $effect(() => {
        if (isOpen && !wasOpen) {
            inactivityMinutes = Math.max(1, Math.round(settings.current.inactivityTimeout / 60000));
            quickUnlockMinutes = Math.max(1, Math.round(settings.current.quickUnlockTimeout / 60000));
            error = "";
        }
        wasOpen = isOpen;
    });

    function handleSave() {
        if (!Number.isInteger(inactivityMinutes) || inactivityMinutes < 1 ||
            !Number.isInteger(quickUnlockMinutes) || quickUnlockMinutes < 1) {
            error = i18n.t("settings.invalid_delay");
            return;
        }

        settings.updateSecurityDelays(inactivityMinutes, quickUnlockMinutes);
        onSaved?.();
        onClose();
    }
</script>

<Modal {isOpen} {onClose} title={i18n.t("settings.title")}>
    <div class="settings-form">
        <p class="intro">{i18n.t("settings.description")}</p>

        <label for="inactivity-delay">{i18n.t("settings.inactivity_lock")}</label>
        <div class="input-with-unit">
            <input id="inactivity-delay" type="number" min="1" step="1" bind:value={inactivityMinutes} data-testid="inactivity-delay" />
            <span>{i18n.t("settings.minutes")}</span>
        </div>

        <label for="quick-unlock-delay">{i18n.t("settings.quick_unlock")}</label>
        <div class="input-with-unit">
            <input id="quick-unlock-delay" type="number" min="1" step="1" bind:value={quickUnlockMinutes} data-testid="quick-unlock-delay" />
            <span>{i18n.t("settings.minutes")}</span>
        </div>

        <p class="storage-note">{i18n.t("settings.storage_note")}</p>
        {#if error}<p class="error" role="alert">{error}</p>{/if}

        <div class="actions">
            <button class="secondary" type="button" onclick={onClose}>{i18n.t("common.cancel")}</button>
            <button type="button" onclick={handleSave} data-testid="save-security-settings">{i18n.t("common.save")}</button>
        </div>
    </div>
</Modal>

<style>
    .settings-form { display: flex; flex-direction: column; gap: 0.75rem; }
    .intro, .storage-note { margin: 0; color: #555; line-height: 1.4; }
    label { font-weight: bold; }
    .input-with-unit { display: flex; align-items: center; gap: 0.5rem; }
    .input-with-unit input { width: 8rem; padding: 0.5rem; }
    .actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
    .error { color: #dc3545; margin: 0; }
</style>
