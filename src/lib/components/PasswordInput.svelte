<script lang="ts">
 import type { HTMLInputAttributes } from "svelte/elements";
 import { onMount } from 'svelte';

  export let value: string = "";
  export let placeholder: string = "Password";
  export let id: string = "vault-password";
  export let autocomplete: HTMLInputAttributes["autocomplete"] =
      "current-password";
 export let autofocus: boolean = false;

 let showPassword = false;
 let passwordinput : HTMLElement | null;

 onMount(() => {
     if (autofocus && passwordinput) {
         passwordinput.focus();
     }
 });

  function togglePasswordVisibility() {
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
    data-testid="password-input"
  />
  <button
    type="button"
    class="toggle-password"
    on:click={togglePasswordVisibility}
    aria-label={showPassword ? "Hide password" : "Show password"}
    tabindex="-1"
  >
    {#if showPassword}
      <!-- Eye open icon -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    {:else}
      <!-- Eye closed icon -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
        ></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
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

  .toggle-password svg {
    display: block;
  }

  .toggle-password:hover {
    color: #333;
    background-color: white;
    transform: scale(1);
  }
</style>
