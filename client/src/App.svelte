<script lang="ts">
  import Login from "./lib/components/Login.svelte";
  import Unlock from "./lib/components/Unlock.svelte";
  import Dashboard from "./lib/components/Dashboard.svelte";

  // State machine: 'login' -> 'unlock' -> 'dashboard'
  let view = $state("login");

  let username = $state("");
  let encryptionKey = $state<CryptoKey | null>(null);

  function handleLogin(user: string) {
    username = user;
    view = "unlock";
  }

  function handleUnlock(key: CryptoKey) {
    encryptionKey = key;
    view = "dashboard";
  }

  function handleLogout() {
    // Clear sensitive state
    encryptionKey = null;
    username = "";
    view = "login";
    // Clear token
    localStorage.removeItem("token");
    // Ideally reload page to clear memory
    window.location.reload();
  }
</script>

<main>
  <div class="header">
    <h1>Passkeys</h1>
    {#if view === "dashboard"}
      <div class="user-info">
        <span>{username}</span>
        <button onclick={handleLogout}>Logout</button>
      </div>
    {/if}
  </div>

  <div class="content">
    {#if view === "login"}
      <Login onLogin={handleLogin} />
    {:else if view === "unlock"}
      <Unlock onUnlock={handleUnlock} />
    {:else if view === "dashboard"}
      {#if encryptionKey}
        <Dashboard {encryptionKey} {username} />
      {/if}
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Helvetica, Arial, sans-serif;
  }
  .header {
    background: #333;
    color: white;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h1 {
    margin: 0;
    font-size: 1.5rem;
  }
  .content {
    padding: 0;
  }
  button {
    padding: 0.25rem 0.5rem;
    cursor: pointer;
  }
</style>
