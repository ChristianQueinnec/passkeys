<script lang="ts">
  import { api } from "$lib/api";
  import PasswordInput from "./PasswordInput.svelte";
  import { i18n } from "$lib/stores/useI18n.svelte";
  import { onMount, tick, untrack } from "svelte";

  let username = $state("");
  let password = $state("");
  let trustDevice = $state(false);
  let error = $state("");
  let isRememberedPreference = $state(false);

  let { onLogin } = $props();

  onMount(async () => {
    getSavedPreference();
    await tick();
  });

  function getSavedPreference() {
    const savedPreference = localStorage.getItem("passkeys_device_preference");
    if (savedPreference) {
      trustDevice = savedPreference === "safe";
      isRememberedPreference = true;
    }
  }

  async function handleLogin() {
    try {
      await api.login(username, password, trustDevice);
      password = "";
      onLogin(username);
    } catch (e: any) {
      error = e.message;
      await tick();
    } finally {
      // clear rapidly the password
      password = "";
    }
    if (trustDevice) {
      try {
        localStorage.setItem("passkeys_device_preference", "safe");
      } catch (e) {
        console.warn("Failed to save device preference", e);
      }
    } else if (isRememberedPreference) {
      try {
        localStorage.setItem("passkeys_device_preference", "unsafe");
      } catch (e) {
        console.warn("Failed to save device preference", e);
      }
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
      {:else}
        {i18n.t("auth.trust_device_note")}
      {/if}
    </label>
    <button type="submit" data-testid="login-button"
      >{i18n.t("auth.login")}</button
    >
  </form>

  <div class="about-link">
    <a href="/about" data-testid="login-about-link">{i18n.t("app.about")}</a>
  </div>
</div>

<style>
  .about-link {
    margin-top: 1.5rem;
    text-align: center;
    font-size: 0.85rem;
  }
  .about-link a {
    color: #666;
    text-decoration: none;
  }
  .about-link a:hover {
    text-decoration: underline;
  }

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
