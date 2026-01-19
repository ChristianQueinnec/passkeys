<script lang="ts">
  import { api } from "$lib/api";
  import PasswordInput from "./PasswordInput.svelte";
  import { i18n } from "$lib/stores/useI18n.svelte";

  let username = $state("");
  let password = $state("");
  let trustDevice = $state(false);
  let error = $state("");

  let { onLogin } = $props();

  async function handleLogin() {
    try {
      await api.login(username, password, trustDevice);
      onLogin(username);
    } catch (e: any) {
      error = e.message;
    }
  }
</script>

<div class="card">
  <h2>{i18n.t("auth.login")}</h2>

  {#if error}
    <p class="error">{error}</p>
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
      {i18n.t("auth.trust_device")}
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
