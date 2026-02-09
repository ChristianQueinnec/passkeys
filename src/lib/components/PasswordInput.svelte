<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";
  import { onMount } from "svelte";
  import EyeOpenIcon from "../icons/EyeOpenIcon.svelte";
  import EyeClosedIcon from "../icons/EyeClosedIcon.svelte";
  import { i18n } from "$lib/stores/useI18n.svelte";

  export let value: string = "";
  export let placeholder: string = i18n.t("auth.password_placeholder");
  export let id: string = "vault-password";
  export let autocomplete: HTMLInputAttributes["autocomplete"] =
    "current-password";
  export let autofocus: boolean = false;
  export let dataTestId: string = "password-input";

  let showPassword = false;
  let passwordinput: HTMLElement | null;

  onMount(() => {
    if (autofocus && passwordinput) {
      passwordinput.focus();
    }
  });

  function togglePasswordVisibility() {
    passwordinput?.focus();
    showPassword = !showPassword;
  }
</script>

<div class="password-input-wrapper">
  <input
    bind:this={passwordinput}
    type={showPassword ? "text" : "password"}
    bind:value
    {placeholder}
    {id}
    required
    {autocomplete}
    class="password-input"
    data-testid={dataTestId}
  />
  <button
    type="button"
    class="toggle-password"
    on:click={togglePasswordVisibility}
    aria-label={showPassword
      ? i18n.t("auth.hide_password")
      : i18n.t("auth.show_password")}
    tabindex="-1"
  >
    {#if showPassword}
      <EyeOpenIcon />
    {:else}
      <EyeClosedIcon />
    {/if}
  </button>
</div>

<style>
  .password-input-wrapper {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  .password-input {
    width: 100%;
    padding-right: 2.5rem;
    padding: 0.5rem;
    padding-right: 2.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }

  .password-input:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
  }

  .toggle-password {
    position: absolute;
    right: 0.25rem;
    top: 0.25rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    color: #666;
    transition: color 0.2s;
  }

  .toggle-password {
    display: block;
  }

  .toggle-password:hover {
    color: #333;
    background-color: white;
    transform: scale(1);
  }
</style>
