<script lang="ts">
  import { api } from "$lib/api";
  import PasswordInput from "./PasswordInput.svelte";

  let username = $state("");
  let password = $state("");
  let error = $state("");

  let { onLogin } = $props();

  async function handleLogin() {
    try {
      await api.login(username, password);
      onLogin(username);
    } catch (e: any) {
      error = e.message;
    }
  }
</script>

<div class="card">
  <h2>Login</h2>
  {#if error}
    <p class="error">{error}</p>
  {/if}
  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleLogin();
    }}
  >
    <input type="text" placeholder="Username" bind:value={username} />
    <PasswordInput placeholder="Password" bind:value={password} />
    <button type="submit">Login</button>
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
</style>
