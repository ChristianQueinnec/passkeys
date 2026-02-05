<script lang="ts">
  import { api } from "$lib/api";
  import PasswordInput from "./PasswordInput.svelte";
  import { i18n } from "$lib/stores/useI18n.svelte";
  import { onMount } from "svelte";
  import { untrack } from "svelte";

  let username = $state("");
  let password = $state("");
  let trustDevice = $state(false);
  let error = $state("");
  let isRememberedPreference = $state(false);

  let { onLogin } = $props();

  onMount(() => {
    const savedPreference = localStorage.getItem("passkeys_device_preference");
    if (savedPreference) {
      trustDevice = savedPreference === "safe";
      isRememberedPreference = true;
    }
  });

  // Auto-clear error when user starts typing in either field
  $effect(() => {
    // Create dependencies on username and password
    username;
    password;

    // Use untrack for error to avoid clearing it immediately when it's set
    untrack(() => {
      if (error) {
        error = "";
      }
    });
  });

  async function handleLogin() {
    try {
      await api.login(username, password, trustDevice);
      onLogin(username);
    } catch (e: any) {
      error = e.message;
    } finally {
      // clear rapidly the password
      setTimeout(() => (password = ""), 1000);
    }
    if (trustDevice) {
      localStorage.setItem("passkeys_device_preference", "safe");
    } else if (isRememberedPreference) {
      localStorage.setItem("passkeys_device_preference", "unsafe");
    } else {
      localStorage.removeItem("passkeys_device_preference");
    }
  }
</script>

<div class="card">
  <h2>{i18n.t("auth.login")}</h2>

  {#if error}
    <p class="error" role="alert" aria-live="polite">{error}</p>
  {/if}
  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleLogin();
    }}
  >
    <input
      type="text"
      placeholder={i18n.t("auth.username")}
      bind:value={username}
      data-testid="username-input"
    />
    <PasswordInput
      placeholder={i18n.t("auth.password")}
      bind:value={password}
    />
    <label class="trust-device">
      <input
        type="checkbox"
        bind:checked={trustDevice}
        data-testid="trust-device-checkbox"
      />
      {#if isRememberedPreference}
        {#if trustDevice}
          {i18n.t("auth.safe_device_note")}
        {:else}
          {i18n.t("auth.unsafe_device_note")}
        {/if}
      {:else if trustDevice}
        {i18n.t("auth.trust_device_note")}
      {:else}
        {i18n.t("auth.untrust_device_note")}
      {/if}
    </label>
    <button type="submit" data-testid="login-button"
      >{i18n.t("auth.login")}</button
    >
  </form>
</div>

<style>
  .card {
    max-width: 400px;
    margin: 2rem auto;
  }
  .card input {
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }
  .card input:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
  }
  .trust-device {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    color: #555;
    cursor: pointer;
  }
  .trust-device input {
    width: auto;
    margin-bottom: 0;
  }
</style>
