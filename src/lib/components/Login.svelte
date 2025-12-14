<script lang="ts">
  import { api } from "../api";

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
    <input type="password" placeholder="Password" bind:value={password} />
    <button type="submit">Login</button>
  </form>
</div>

<style>
  .card {
    max-width: 400px;
    margin: 2rem auto;
  }
</style>
