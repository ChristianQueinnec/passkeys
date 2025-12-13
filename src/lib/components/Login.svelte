<script lang="ts">
  import { api } from '../api';

  let username = $state('');
  let password = $state('');
  let error = $state('');

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
  <input type="text" placeholder="Username" bind:value={username} />
  <input type="password" placeholder="Password" bind:value={password} />
  <button onclick={handleLogin}>Login</button>
</div>

<style>
  .card {
    max-width: 400px;
    margin: 2rem auto;
    padding: 2rem;
    border: 1px solid #ccc;
    border-radius: 8px;
  }
  input {
    display: block;
    width: 100%;
    margin-bottom: 1rem;
    padding: 0.5rem;
  }
  .error { color: red; }
</style>
