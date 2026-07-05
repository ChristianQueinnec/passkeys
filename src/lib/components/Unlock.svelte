<script lang="ts">
  import PasswordInput from "./PasswordInput.svelte";
  import { onMount } from "svelte";
  import { i18n } from "$lib/stores/useI18n.svelte";
  import type { EasyUnlockChallenge } from "$lib/vault/easyUnlock";

  let password = $state("");
  let easyAnswer = $state("");
  let loading = $state(false);
  let easyLoading = $state(false);
  let error = $state("");
  let easyInput = $state<HTMLInputElement | null>(null);

  let {
    vaultExists,
    onUnlock,
    onEasyUnlock = null,
    message,
    easyUnlockChallenge = null,
  }: {
    vaultExists: boolean;
    onUnlock: (password: string) => Promise<void>;
    onEasyUnlock?: null | ((answer: string) => Promise<void>);
    message?: string;
    easyUnlockChallenge?: EasyUnlockChallenge | null;
  } = $props();
  const notice = $derived(
    vaultExists
      ? i18n.t("auth.unlock_vault_exists")
      : i18n.t("auth.unlock_no_vault"),
  );

    // Auto-clear error when user starts typing
    // This provides immediate feedback that they're addressing the issue
    $effect(() => {
        password; // Create dependency
        if (error) {
            error = "";
        }
    });

  async function handleUnlock() {
    loading = true;
    error = ""; // Clear any previous error
    try {
      await onUnlock(password);
        } catch (e: any) {
            error = e.message || i18n.t("auth.unlock_failed");
    } finally {
      loading = false;
    }
  }

  async function handleEasyUnlock() {
    if (!onEasyUnlock || !easyUnlockChallenge) return;
    easyLoading = true;
    error = "";
    try {
      await onEasyUnlock(easyAnswer);
    } catch (e: any) {
      error = e.message || i18n.t("auth.unlock_failed");
    } finally {
      easyLoading = false;
    }
  }

  function easyUnlockLabel(challenge: EasyUnlockChallenge) {
    const position = challenge.position === "first"
      ? i18n.t("auth.easy_unlock_first")
      : i18n.t("auth.easy_unlock_last");
    return i18n.t("auth.easy_unlock_label", {
        position,
        length: challenge.length.toString()
    });
  }

  onMount(() => {
    if (easyUnlockChallenge) {
      easyInput?.focus();
    }
  });
</script>

<div class="card">
    <h2>{i18n.t("auth.unlock")}</h2>
    <p>
        {i18n.t("auth.unlock_confirm")}
    </p>
    <div class="unlock-notice" class:exists={vaultExists}>
        {#if message}
            <div
                role="alert"
                style="color: #856404; font-weight: bold; margin-bottom: 0.5rem;"
            >
                {message}
            </div>
        {/if}
        {notice}
    </div>

    {#if error}
        <p class="error" role="alert" aria-live="polite">{error}</p>
    {/if}

    {#if easyUnlockChallenge && onEasyUnlock}
      <div class="easy-unlock">
        <p>{i18n.t("auth.easy_unlock_intro")}</p>
        <p class="easy-unlock-hint">{easyUnlockLabel(easyUnlockChallenge)}</p>
        <form
          onsubmit={(e) => {
            e.preventDefault();
            handleEasyUnlock();
          }}
        >
          <input
            type="password"
            bind:value={easyAnswer}
            bind:this={easyInput}
            placeholder={easyUnlockLabel(easyUnlockChallenge)}
            autocomplete="off"
            class="easy-unlock-input"
            data-testid="easy-unlock-input"
          />
          <button type="submit" disabled={easyLoading} data-testid="easy-unlock-button">
            {easyLoading ? i18n.t("auth.deriving_key") : i18n.t("auth.easy_unlock_button")}
          </button>
        </form>
      </div>
    {/if}

    <form
        onsubmit={(e) => {
            e.preventDefault();
            handleUnlock();
        }}
    >
        <div class="input-group">
            <PasswordInput
                autofocus={!easyUnlockChallenge}
                placeholder={i18n.t("auth.unlock_placeholder")}
                bind:value={password}
            />
        </div>

        <button type="submit" disabled={loading} data-testid="unlock-button">
            {loading
                ? i18n.t("auth.deriving_key")
                : i18n.t("auth.unlock_button")}
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
    .unlock-notice {
        background: #f8f9fa;
        border-left: 4px solid #6c757d;
        padding: 0.75rem;
        margin-bottom: 1.5rem;
        font-size: 0.9rem;
        color: #495057;
        line-height: 1.4;
    }
    .unlock-notice.exists {
        border-left-color: #28a745;
        background: #f0fff4;
    }
    .easy-unlock {
        margin-bottom: 1.5rem;
        padding: 0.75rem;
        border: 1px solid #cfe2ff;
        background: #eef5ff;
        border-radius: 4px;
    }
    .easy-unlock p {
        margin: 0 0 0.75rem 0;
    }
    .easy-unlock-hint {
        font-weight: 600;
    }
    .easy-unlock-input {
        width: 100%;
        padding: 0.5rem;
        margin-bottom: 0.75rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
    }
</style>
