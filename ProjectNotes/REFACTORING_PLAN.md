# Refactoring Plan: Dashboard Components

## Problem Analysis

Both `Dashboard.svelte` and `FolderDashboard.svelte` contain ~90% identical code:

### Duplicated Code (Lines of Code)
1. **State management** (~50 lines)
   - items, selectedItem, editingItem, isCreating
   - isDirty, lastSavedDate, offlineMode
   - isLoading, isSyncing
   - encryptedVaultData, newerVersionAvailable, pollTimer
   - isMemoryCleared, inactivityTimer, restorePromise
   - showHistoryModal, historyFiles
   - clipboardTimeout

2. **Lifecycle management** (~40 lines)
   - onMount/onDestroy setup
   - Event listener registration for activity tracking
   - Timer cleanup

3. **Vault operations** (~150 lines)
   - loadVault()
   - saveVault()
   - startPolling()
   - pollForUpdates()
   - synchronizeVault()
   - openHistory()
   - deleteHistoryItem()

4. **Security operations** (~40 lines)
   - resetTimer()
   - clearSensitiveData()
   - restoreSensitiveData()

5. **CRUD operations** (~60 lines)
   - selectItem()
   - startCreate()
   - startEdit()
   - handleSave()
   - handleDelete()
   - closeModals()
   - copyToClipboard()

6. **Modal components** (identical in both)
   - DetailsModal
   - EditorModal
   - HistoryModal

7. **Warning banners** (identical in both)
   - Offline mode warning
   - Newer version available warning
   - Last saved date display

**Total Duplicated Code: ~340 lines out of ~400 lines per component**

### Unique Code

**Dashboard.svelte (unique):**
- `filter` state
- `filteredFiles` state
- `$effect` for filtering
- Filter input UI (~20 lines)

**FolderDashboard.svelte (unique):**
- `FolderNode` interface
- `folderTree` state
- `selectedFolder` state
- `displayedEntries` state
- `buildFolderTree()` function (~60 lines)
- `toggleFolder()` function
- `selectFolder()` function
- `$effect` for rebuilding tree
- Folder tree UI (~80 lines)

## Proposed Refactoring Strategy

### Option 1: Composable Store Pattern ⭐ RECOMMENDED

Create a composable vault store that manages all shared logic.

**Advantages:**
- Clean separation of concerns
- Reusable across any component
- Easy to test in isolation
- Svelte 5 runes compatible
- No prop drilling

**Structure:**
```
lib/
  stores/
    useVault.svelte.ts          # Main vault store
    useVaultSecurity.svelte.ts  # Security/memory clearing
    useVaultSync.svelte.ts      # Polling/sync logic
  components/
    Dashboard.svelte            # Presentation only
    FolderDashboard.svelte      # Presentation only
    VaultControls.svelte        # NEW: Shared controls
    VaultModals.svelte          # NEW: All modals together
```

### Option 2: Base Component with Slots Pattern

Create a `BaseVault.svelte` component with all shared logic and use slots for view-specific UI.

**Advantages:**
- Single source of truth
- Slot-based customization
- Natural component hierarchy

**Disadvantages:**
- Less flexible than composables
- Props passing can get complex
- Harder to test individual pieces

**Structure:**
```
lib/
  components/
    BaseVault.svelte           # All shared logic + slots
    Dashboard.svelte           # Uses BaseVault with filter slot
    FolderDashboard.svelte     # Uses BaseVault with folder slot
```

### Option 3: Hook Pattern with Separate Logic Module

Extract all logic to a TypeScript module that returns reactive state.

**Advantages:**
- Pure TypeScript
- Very testable
- Framework agnostic (mostly)

**Disadvantages:**
- Need to manually wire up reactivity
- More boilerplate for state management

**Structure:**
```
lib/
  hooks/
    vaultManager.ts            # All vault logic
  components/
    Dashboard.svelte           # Uses vaultManager
    FolderDashboard.svelte     # Uses vaultManager
```

## Detailed Recommendation: Option 1 (Composable Store)

### Step 1: Create `useVault.svelte.ts`

```typescript
// Manages core vault data and CRUD operations
export function useVault(encryptionKey: CryptoKey, username: string) {
  // All shared state
  let items = $state<PasswordEntry[]>([]);
  let selectedItem = $state<PasswordEntry | null>(null);
  let editingItem = $state<PasswordEntry | null>(null);
  let isCreating = $state(false);
  let isDirty = $state(false);
  let lastSavedDate = $state<string | null>(null);
  
  // All shared functions
  async function loadVault() { ... }
  async function saveVault() { ... }
  function startCreate() { ... }
  function startEdit() { ... }
  async function handleSave() { ... }
  async function handleDelete() { ... }
  
  return {
    // Expose state and methods
    items: () => items,
    selectedItem: () => selectedItem,
    editingItem: () => editingItem,
    isDirty: () => isDirty,
    // ... all other state getters
    
    // Methods
    loadVault,
    saveVault,
    startCreate,
    startEdit,
    handleSave,
    handleDelete,
    // ... all other methods
  };
}
```

### Step 2: Create `useVaultSecurity.svelte.ts`

```typescript
// Manages memory clearing and inactivity
export function useVaultSecurity(
  items: () => PasswordEntry[],
  setItems: (items: PasswordEntry[]) => void,
  encryptedVaultData: () => CipheredVaultData | null,
  encryptionKey: CryptoKey
) {
  let isMemoryCleared = $state(false);
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  
  function resetTimer() { ... }
  function clearSensitiveData() { ... }
  async function restoreSensitiveData() { ... }
  
  // Auto-setup lifecycle
  $effect(() => {
    setupEventListeners();
    return () => cleanup();
  });
  
  return {
    isMemoryCleared: () => isMemoryCleared,
    resetTimer,
  };
}
```

### Step 3: Create `useVaultSync.svelte.ts`

```typescript
// Manages polling and sync detection
export function useVaultSync(
  lastSavedDate: () => string | null,
  setOfflineMode: (offline: boolean) => void,
  setNewerVersionAvailable: (available: boolean) => void
) {
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  
  function startPolling() { ... }
  async function pollForUpdates() { ... }
  
  $effect(() => {
    startPolling();
    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  });
  
  return {
    // Methods only, state managed in main store
  };
}
```

### Step 4: Create `VaultControls.svelte`

```typescript
// Reusable control bar component
<script lang="ts">
  let {
    onToggleView,
    viewIcon,
    viewLabel,
    onNewEntry,
    onSave,
    onHistory,
    isDirty,
    offlineMode,
    newerVersionAvailable,
    lastSavedDate,
    onSynchronize
  } = $props();
</script>

<div class="controls">
  <div class="actions">
    <button onclick={onToggleView}>
      {@html viewIcon}
      {viewLabel}
    </button>
    <button onclick={onNewEntry}>+ New Entry</button>
    {#if isDirty}
      <button onclick={onSave}>Save Vault</button>
    {/if}
    <button onclick={onHistory}>History</button>
  </div>
  
  {#if offlineMode}
    <div class="warning">⚠️ Offline Mode</div>
  {/if}
  
  {#if newerVersionAvailable}
    <div class="warning">
      📦 Newer version available
      <button onclick={onSynchronize}>Sync Now</button>
    </div>
  {/if}
  
  {#if lastSavedDate}
    <small>Last saved: {new Date(lastSavedDate).toISOString()}</small>
  {/if}
</div>
```

### Step 5: Create `VaultModals.svelte`

```typescript
// All modals in one component
<script lang="ts">
  let {
    selectedItem,
    editingItem,
    isCreating,
    showHistoryModal,
    historyFiles,
    onCloseModals,
    onEdit,
    onDelete,
    onSave,
    onDeleteHistory,
    onCopy
  } = $props();
</script>

<DetailsModal
  isOpen={!!selectedItem}
  item={selectedItem}
  onClose={onCloseModals}
  onEdit={onEdit}
  onDelete={onDelete}
  onCopy={onCopy}
/>

<EditorModal
  isOpen={!!editingItem}
  item={editingItem}
  {isCreating}
  onClose={onCloseModals}
  onSave={onSave}
/>

<HistoryModal
  isOpen={showHistoryModal}
  files={historyFiles}
  onClose={onCloseModals}
  onDelete={onDeleteHistory}
/>
```

### Step 6: Refactor `Dashboard.svelte`

```typescript
<script lang="ts">
  import { useVault } from "$lib/stores/useVault.svelte";
  import { useVaultSecurity } from "$lib/stores/useVaultSecurity.svelte";
  import { useVaultSync } from "$lib/stores/useVaultSync.svelte";
  import VaultControls from "$lib/components/VaultControls.svelte";
  import VaultModals from "$lib/components/VaultModals.svelte";
  import PasswordList from "$lib/components/PasswordList.svelte";
  import { filterPasswordEntries, sortPasswordEntries } from "$lib/vault";
  
  let { encryptionKey, username, onToggleView } = $props();
  
  // Initialize composables
  const vault = useVault(encryptionKey, username);
  const security = useVaultSecurity(
    vault.items,
    vault.setItems,
    vault.encryptedVaultData,
    encryptionKey
  );
  const sync = useVaultSync(
    vault.lastSavedDate,
    vault.setOfflineMode,
    vault.setNewerVersionAvailable
  );
  
  // View-specific state
  let filter = $state("");
  let filteredFiles = $derived(
    sortPasswordEntries(filterPasswordEntries(vault.items(), filter))
  );
  
  // Load on mount
  $effect(() => {
    vault.loadVault();
  });
</script>

<div class="dashboard">
  <div class="sidebar">
    <VaultControls
      {onToggleView}
      viewIcon="<folder-icon>"
      viewLabel="Folder View"
      onNewEntry={vault.startCreate}
      onSave={vault.saveVault}
      onHistory={vault.openHistory}
      isDirty={vault.isDirty()}
      offlineMode={vault.offlineMode()}
      newerVersionAvailable={vault.newerVersionAvailable()}
      lastSavedDate={vault.lastSavedDate()}
      onSynchronize={vault.synchronizeVault}
    />
    
    <div class="filter-container">
      <input type="text" bind:value={filter} placeholder="Filter..." />
      {#if filter}
        <button onclick={() => filter = ""}>×</button>
      {/if}
    </div>
    
    <PasswordList
      items={filteredFiles}
      isMemoryCleared={security.isMemoryCleared()}
      onSelect={vault.selectItem}
      onCopyUsername={vault.copyToClipboard}
      onCopyPassword={vault.copyToClipboard}
    />
  </div>
</div>

<VaultModals
  selectedItem={vault.selectedItem()}
  editingItem={vault.editingItem()}
  isCreating={vault.isCreating()}
  showHistoryModal={vault.showHistoryModal()}
  historyFiles={vault.historyFiles()}
  onCloseModals={vault.closeModals}
  onEdit={vault.startEdit}
  onDelete={vault.handleDelete}
  onSave={vault.handleSave}
  onDeleteHistory={vault.deleteHistoryItem}
  onCopy={vault.copyToClipboard}
/>

<style>
  /* Only view-specific styles */
  .dashboard { ... }
  .sidebar { ... }
  .filter-container { ... }
</style>
```

### Step 7: Refactor `FolderDashboard.svelte`

```typescript
<script lang="ts">
  import { useVault } from "$lib/stores/useVault.svelte";
  import { useVaultSecurity } from "$lib/stores/useVaultSecurity.svelte";
  import { useVaultSync } from "$lib/stores/useVaultSync.svelte";
  import VaultControls from "$lib/components/VaultControls.svelte";
  import VaultModals from "$lib/components/VaultModals.svelte";
  import PasswordList from "$lib/components/PasswordList.svelte";
  
  let { encryptionKey, username, onToggleView } = $props();
  
  // Initialize composables (same as Dashboard!)
  const vault = useVault(encryptionKey, username);
  const security = useVaultSecurity(...);
  const sync = useVaultSync(...);
  
  // View-specific state (folder tree logic)
  interface FolderNode { ... }
  
  let folderTree = $state<FolderNode>({ ... });
  let selectedFolder = $state<FolderNode | null>(null);
  let displayedEntries = $derived(selectedFolder?.entries || []);
  
  function buildFolderTree() { ... }
  function toggleFolder(node: FolderNode) { ... }
  
  // Rebuild tree when items change
  $effect(() => {
    buildFolderTree();
  });
  
  // Override startCreate to include folder
  function startCreateInFolder() {
    vault.startCreate({
      group: selectedFolder?.fullPath || ""
    });
  }
</script>

<div class="folder-dashboard">
  <VaultControls
    {onToggleView}
    viewIcon="<list-icon>"
    viewLabel="List View"
    onNewEntry={startCreateInFolder}
    onSave={vault.saveVault}
    onHistory={vault.openHistory}
    isDirty={vault.isDirty()}
    offlineMode={vault.offlineMode()}
    newerVersionAvailable={vault.newerVersionAvailable()}
    lastSavedDate={vault.lastSavedDate()}
    onSynchronize={vault.synchronizeVault}
  />
  
  <div class="main-content">
    <div class="folder-pane">
      <!-- Folder tree UI -->
    </div>
    
    <div class="entries-pane">
      <PasswordList
        items={displayedEntries}
        isMemoryCleared={security.isMemoryCleared()}
        onSelect={vault.selectItem}
        onCopyUsername={vault.copyToClipboard}
        onCopyPassword={vault.copyToClipboard}
      />
    </div>
  </div>
</div>

<VaultModals ... />

<style>
  /* Only view-specific styles */
  .folder-dashboard { ... }
  .folder-pane { ... }
</style>
```

## Benefits of This Refactoring

1. **DRY Principle**: ~340 lines of duplicated code → ~50 lines of composable imports
2. **Testability**: Each composable can be unit tested independently
3. **Maintainability**: Fix a bug once, it's fixed everywhere
4. **Extensibility**: Easy to add new views (e.g., kanban, timeline, calendar)
5. **Type Safety**: Shared TypeScript types and interfaces
6. **Performance**: No performance overhead, just better organization
7. **Svelte 5 Native**: Uses runes (`$state`, `$derived`, `$effect`) properly

## File Structure After Refactoring

```
src/lib/
  ├── stores/
  │   ├── useVault.svelte.ts          (200 lines) ← All vault logic
  │   ├── useVaultSecurity.svelte.ts  (80 lines)  ← Security/memory
  │   └── useVaultSync.svelte.ts      (60 lines)  ← Polling/sync
  │
  └── components/
      ├── VaultControls.svelte        (60 lines)  ← Shared controls
      ├── VaultModals.svelte          (40 lines)  ← All modals
      ├── Dashboard.svelte            (80 lines)  ← Just filter + UI
      ├── FolderDashboard.svelte      (150 lines) ← Just folders + UI
      └── PasswordList.svelte         (existing)
```

## Migration Steps

1. ✅ Create `useVault.svelte.ts` with all core logic
2. ✅ Create `useVaultSecurity.svelte.ts` 
3. ✅ Create `useVaultSync.svelte.ts`
4. ✅ Create `VaultControls.svelte`
5. ✅ Create `VaultModals.svelte`
6. ✅ Refactor `Dashboard.svelte` to use composables
7. ✅ Refactor `FolderDashboard.svelte` to use composables
8. ✅ Test both views thoroughly
9. ✅ Remove old duplicated code
10. ✅ Update documentation

## Testing Strategy

Each composable should have unit tests:

```typescript
// tests/stores/useVault.test.ts
describe('useVault', () => {
  test('loads vault from server', async () => { ... });
  test('saves vault with encryption', async () => { ... });
  test('marks vault as dirty after edit', () => { ... });
});

// tests/stores/useVaultSecurity.test.ts
describe('useVaultSecurity', () => {
  test('clears memory after 60 seconds', async () => { ... });
  test('restores on activity', async () => { ... });
});
```

## Risks and Mitigation

**Risk**: Breaking existing functionality during refactor
**Mitigation**: 
- Refactor one composable at a time
- Keep tests green after each step
- Feature flag new implementation

**Risk**: Runes compatibility issues
**Mitigation**:
- Follow Svelte 5 runes best practices
- Use getters for reactive values
- Test in both SSR and client modes

**Risk**: Performance regression
**Mitigation**:
- Profile before/after
- Minimize unnecessary reactivity
- Use `$derived` instead of `$effect` where possible

## Timeline Estimate

- Step 1-3 (Composables): 4-6 hours
- Step 4-5 (Shared components): 2-3 hours  
- Step 6-7 (Refactor views): 3-4 hours
- Step 8-10 (Testing & docs): 2-3 hours

**Total: 11-16 hours**

## Alternative: Minimal Refactoring

If full refactoring is too ambitious, minimal approach:

1. Extract just vault CRUD to `vaultOperations.ts` helper
2. Extract just security logic to `securityManager.ts` helper
3. Keep components as-is but import helpers

**Time: 2-3 hours, reduces duplication by ~50%**
