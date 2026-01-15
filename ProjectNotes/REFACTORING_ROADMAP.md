# Refactoring Roadmap

This document provides a step-by-step guide to refactor Dashboard and FolderDashboard components.

## 📋 Documentation Overview

1. **REFACTORING_SUMMARY.md** - Start here! Quick overview and recommendation
2. **REFACTORING_PLAN.md** - Detailed technical plan with code examples
3. **REFACTORING_VISUAL.md** - Architecture diagrams and visual comparisons
4. **REFACTORING_ROADMAP.md** (this file) - Step-by-step implementation guide

## 🎯 Goal

Eliminate 340 lines of duplicated code between Dashboard and FolderDashboard by extracting shared logic into composable stores.

## 📊 Current State

- Dashboard.svelte: 400 lines (340 shared + 60 unique)
- FolderDashboard.svelte: 500 lines (340 shared + 160 unique)
- Total duplication: 40%

## 🏁 Target State

- useVault.svelte.ts: 200 lines (reusable)
- useVaultSecurity.svelte.ts: 80 lines (reusable)
- useVaultSync.svelte.ts: 60 lines (reusable)
- VaultControls.svelte: 60 lines (reusable)
- VaultModals.svelte: 40 lines (reusable)
- Dashboard.svelte: 80 lines (60 unique + 20 integration)
- FolderDashboard.svelte: 180 lines (160 unique + 20 integration)
- Total duplication: 0%

## 📅 Implementation Phases

### Phase 1: Create Composable Stores (4-6 hours)

#### Step 1.1: Create `useVault.svelte.ts`
**Time**: 2-3 hours

```bash
# Create file
touch src/lib/stores/useVault.svelte.ts
```

**Extract from Dashboard.svelte:**
- State: items, selectedItem, editingItem, isCreating, isDirty, lastSavedDate, offlineMode, isLoading, encryptedVaultData, newerVersionAvailable, showHistoryModal, historyFiles
- Functions: loadVault, saveVault, synchronizeVault, startCreate, startEdit, handleSave, handleDelete, selectItem, openHistory, deleteHistoryItem, closeModals, copyToClipboard

**Template:**
```typescript
// src/lib/stores/useVault.svelte.ts
import { api } from "$lib/api";
import { decrypt, encrypt } from "$lib/crypto";
import { sortPasswordEntries, normalizeVaultItems } from "$lib/vault";
import type { PasswordEntry, HistoryItem, CipheredVaultData } from "$lib/types";

export function useVault(encryptionKey: CryptoKey, username: string) {
  // State
  let items = $state<PasswordEntry[]>([]);
  let selectedItem = $state<PasswordEntry | null>(null);
  // ... all other state
  
  // Functions
  async function loadVault() {
    // Move code from Dashboard
  }
  
  async function saveVault() {
    // Move code from Dashboard
  }
  
  // ... all other functions
  
  // Return reactive getters and methods
  return {
    // Getters
    get items() { return items; },
    get selectedItem() { return selectedItem; },
    // ... all other getters
    
    // Methods
    loadVault,
    saveVault,
    // ... all other methods
    
    // Setters (for internal use by other composables)
    setItems: (newItems: PasswordEntry[]) => { items = newItems; },
  };
}
```

**Testing:**
```bash
# Run tests
npm run test -- useVault.test.ts
```

#### Step 1.2: Create `useVaultSecurity.svelte.ts`
**Time**: 1-1.5 hours

```bash
touch src/lib/stores/useVaultSecurity.svelte.ts
```

**Extract from Dashboard.svelte:**
- State: isMemoryCleared, inactivityTimer, restorePromise, clipboardTimeout
- Functions: resetTimer, clearSensitiveData, restoreSensitiveData
- Lifecycle: Event listeners (mousemove, keydown, click, scroll, touchstart)

**Template:**
```typescript
// src/lib/stores/useVaultSecurity.svelte.ts
import { decrypt } from "$lib/crypto";
import type { PasswordEntry, CipheredVaultData } from "$lib/types";
import { browser } from "$app/environment";
import { onDestroy } from "svelte";

export function useVaultSecurity(
  getItems: () => PasswordEntry[],
  setItems: (items: PasswordEntry[]) => void,
  getEncryptedVaultData: () => CipheredVaultData | null,
  encryptionKey: CryptoKey,
  additionalClearCallback?: () => void
) {
  let isMemoryCleared = $state(false);
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  let restorePromise: Promise<void> | null = null;
  
  function resetTimer() { /* Move code */ }
  function clearSensitiveData() { /* Move code */ }
  async function restoreSensitiveData() { /* Move code */ }
  
  // Auto-setup
  $effect(() => {
    if (!browser) return;
    
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer(); // Start initial timer
    
    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  });
  
  return {
    get isMemoryCleared() { return isMemoryCleared; },
    resetTimer,
    restoreSensitiveData,
  };
}
```

#### Step 1.3: Create `useVaultSync.svelte.ts`
**Time**: 1-1.5 hours

```bash
touch src/lib/stores/useVaultSync.svelte.ts
```

**Extract from Dashboard.svelte:**
- State: pollTimer
- Functions: startPolling, pollForUpdates

**Template:**
```typescript
// src/lib/stores/useVaultSync.svelte.ts
import { api } from "$lib/api";
import { browser } from "$app/environment";

export function useVaultSync(
  getLastSavedDate: () => string | null,
  setOfflineMode: (offline: boolean) => void,
  setNewerVersionAvailable: (available: boolean) => void
) {
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  
  function startPolling() { /* Move code */ }
  async function pollForUpdates() { /* Move code */ }
  
  // Auto-start polling
  $effect(() => {
    startPolling();
    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  });
  
  return {
    // No state to expose, just side effects
  };
}
```

### Phase 2: Create Shared Components (2-3 hours)

#### Step 2.1: Create `VaultControls.svelte`
**Time**: 1-1.5 hours

```bash
touch src/lib/components/VaultControls.svelte
```

**Extract common UI from both dashboards:**
- Toggle view button
- New Entry button
- Save Vault button (conditional)
- History button
- Offline mode warning
- Newer version warning
- Last saved timestamp

**Template:**
```svelte
<!-- src/lib/components/VaultControls.svelte -->
<script lang="ts">
  let {
    onToggleView,
    viewIcon,
    viewLabel,
    onNewEntry,
    onSave,
    onHistory,
    isDirty = false,
    offlineMode = false,
    newerVersionAvailable = false,
    lastSavedDate = null,
    onSynchronize
  }: {
    onToggleView: () => void;
    viewIcon: string;
    viewLabel: string;
    onNewEntry: () => void;
    onSave: () => void;
    onHistory: () => void;
    isDirty?: boolean;
    offlineMode?: boolean;
    newerVersionAvailable?: boolean;
    lastSavedDate?: string | null;
    onSynchronize: () => void;
  } = $props();
</script>

<div class="controls">
  <div class="actions">
    <button onclick={onToggleView} title="Switch view">
      {@html viewIcon}
      {viewLabel}
    </button>
    <button onclick={onNewEntry}>+ New Entry</button>
    {#if isDirty}
      <button class="save-btn" onclick={onSave}>Save Vault</button>
    {/if}
    <button onclick={onHistory}>History</button>
  </div>
  
  {#if offlineMode}
    <div class="warning">⚠️ Offline Mode: Vault may be out of date</div>
  {/if}
  
  {#if newerVersionAvailable}
    <div class="warning sync-warning">
      📦 A newer version is available on the server.
      <button class="small" onclick={onSynchronize}>Sync Now</button>
    </div>
  {/if}
  
  {#if lastSavedDate}
    <small>Last saved: {new Date(lastSavedDate).toISOString()}</small>
  {/if}
</div>

<style>
  /* Move shared styles from both dashboards */
</style>
```

#### Step 2.2: Create `VaultModals.svelte`
**Time**: 1-1.5 hours

```bash
touch src/lib/components/VaultModals.svelte
```

**Combine all three modals:**
```svelte
<!-- src/lib/components/VaultModals.svelte -->
<script lang="ts">
  import DetailsModal from "./DetailsModal.svelte";
  import EditorModal from "./EditorModal.svelte";
  import HistoryModal from "./HistoryModal.svelte";
  import type { PasswordEntry, HistoryItem } from "$lib/types";
  
  let {
    selectedItem = null,
    editingItem = null,
    isCreating = false,
    showHistoryModal = false,
    historyFiles = [],
    onCloseModals,
    onEdit,
    onDelete,
    onSave,
    onDeleteHistory,
    onCopy
  }: {
    selectedItem?: PasswordEntry | null;
    editingItem?: PasswordEntry | null;
    isCreating?: boolean;
    showHistoryModal?: boolean;
    historyFiles?: HistoryItem[];
    onCloseModals: () => void;
    onEdit: (item: PasswordEntry) => void;
    onDelete: (item: PasswordEntry) => void;
    onSave: (item: PasswordEntry) => void;
    onDeleteHistory: (filename: string) => void;
    onCopy: (text: string) => void;
  } = $props();
</script>

<DetailsModal
  isOpen={!!selectedItem}
  item={selectedItem}
  onClose={onCloseModals}
  {onEdit}
  {onDelete}
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

### Phase 3: Refactor Dashboard Components (3-4 hours)

#### Step 3.1: Refactor `Dashboard.svelte`
**Time**: 1.5-2 hours

**Before**: 400 lines
**After**: 80 lines

```bash
# Backup original
cp src/lib/components/Dashboard.svelte src/lib/components/Dashboard.svelte.backup
```

**New structure:**
```svelte
<script lang="ts">
  import { useVault } from "$lib/stores/useVault.svelte";
  import { useVaultSecurity } from "$lib/stores/useVaultSecurity.svelte";
  import { useVaultSync } from "$lib/stores/useVaultSync.svelte";
  import VaultControls from "./VaultControls.svelte";
  import VaultModals from "./VaultModals.svelte";
  import PasswordList from "./PasswordList.svelte";
  import { filterPasswordEntries, sortPasswordEntries } from "$lib/vault";
  
  let { encryptionKey, username, onToggleView } = $props();
  
  // Initialize composables
  const vault = useVault(encryptionKey, username);
  const security = useVaultSecurity(
    () => vault.items,
    vault.setItems,
    () => vault.encryptedVaultData,
    encryptionKey,
    () => { filteredFiles = []; } // Additional clear callback
  );
  const sync = useVaultSync(
    () => vault.lastSavedDate,
    (offline) => vault.setOfflineMode(offline),
    (available) => vault.setNewerVersionAvailable(available)
  );
  
  // View-specific state
  let filter = $state("");
  let filteredFiles = $derived(
    sortPasswordEntries(filterPasswordEntries(vault.items, filter))
  );
  
  // Load vault on mount
  $effect(() => {
    vault.loadVault();
  });
</script>

<div class="dashboard">
  <div class="sidebar">
    <VaultControls
      {onToggleView}
      viewIcon="<svg>...</svg>"
      viewLabel="Folder View"
      onNewEntry={vault.startCreate}
      onSave={vault.saveVault}
      onHistory={vault.openHistory}
      isDirty={vault.isDirty}
      offlineMode={vault.offlineMode}
      newerVersionAvailable={vault.newerVersionAvailable}
      lastSavedDate={vault.lastSavedDate}
      onSynchronize={vault.synchronizeVault}
    />
    
    <div class="filter-container">
      <input type="text" placeholder="Filter..." bind:value={filter} />
      {#if filter}
        <button onclick={() => filter = ""}>×</button>
      {/if}
    </div>
    
    <PasswordList
      items={filteredFiles}
      isMemoryCleared={security.isMemoryCleared}
      onSelect={vault.selectItem}
      onCopyUsername={vault.copyToClipboard}
      onCopyPassword={vault.copyToClipboard}
    />
  </div>
</div>

<VaultModals
  selectedItem={vault.selectedItem}
  editingItem={vault.editingItem}
  isCreating={vault.isCreating}
  showHistoryModal={vault.showHistoryModal}
  historyFiles={vault.historyFiles}
  onCloseModals={vault.closeModals}
  onEdit={vault.startEdit}
  onDelete={vault.handleDelete}
  onSave={vault.handleSave}
  onDeleteHistory={vault.deleteHistoryItem}
  onCopy={vault.copyToClipboard}
/>

<style>
  /* Only view-specific styles */
  .dashboard { /* ... */ }
  .sidebar { /* ... */ }
  .filter-container { /* ... */ }
</style>
```

**Test:**
```bash
npm run dev
# Test all dashboard functionality
# Test filter
# Test save/load
# Test history
# Test security timeout
```

#### Step 3.2: Refactor `FolderDashboard.svelte`
**Time**: 1.5-2 hours

**Before**: 500 lines
**After**: 180 lines

```bash
# Backup original
cp src/lib/components/FolderDashboard.svelte src/lib/components/FolderDashboard.svelte.backup
```

**New structure:**
```svelte
<script lang="ts">
  import { useVault } from "$lib/stores/useVault.svelte";
  import { useVaultSecurity } from "$lib/stores/useVaultSecurity.svelte";
  import { useVaultSync } from "$lib/stores/useVaultSync.svelte";
  import VaultControls from "./VaultControls.svelte";
  import VaultModals from "./VaultModals.svelte";
  import PasswordList from "./PasswordList.svelte";
  
  let { encryptionKey, username, onToggleView } = $props();
  
  // Initialize composables (same as Dashboard!)
  const vault = useVault(encryptionKey, username);
  const security = useVaultSecurity(
    () => vault.items,
    vault.setItems,
    () => vault.encryptedVaultData,
    encryptionKey,
    () => { displayedEntries = []; }
  );
  const sync = useVaultSync(
    () => vault.lastSavedDate,
    (offline) => vault.setOfflineMode(offline),
    (available) => vault.setNewerVersionAvailable(available)
  );
  
  // View-specific state (folder logic)
  interface FolderNode { /* ... */ }
  
  let folderTree = $state<FolderNode>({ /* ... */ });
  let selectedFolder = $state<FolderNode | null>(null);
  let displayedEntries = $derived(selectedFolder?.entries || []);
  
  function buildFolderTree() { /* Keep existing logic */ }
  function toggleFolder(node: FolderNode) { /* Keep existing logic */ }
  
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
  
  // Load vault on mount
  $effect(() => {
    vault.loadVault();
  });
</script>

<div class="folder-dashboard">
  <VaultControls
    {onToggleView}
    viewIcon="<svg>...</svg>"
    viewLabel="List View"
    onNewEntry={startCreateInFolder}
    onSave={vault.saveVault}
    onHistory={vault.openHistory}
    isDirty={vault.isDirty}
    offlineMode={vault.offlineMode}
    newerVersionAvailable={vault.newerVersionAvailable}
    lastSavedDate={vault.lastSavedDate}
    onSynchronize={vault.synchronizeVault}
  />
  
  <div class="main-content">
    <div class="folder-pane">
      <!-- Keep existing folder tree UI -->
    </div>
    
    <div class="entries-pane">
      <PasswordList
        items={displayedEntries}
        isMemoryCleared={security.isMemoryCleared}
        onSelect={vault.selectItem}
        onCopyUsername={vault.copyToClipboard}
        onCopyPassword={vault.copyToClipboard}
      />
    </div>
  </div>
</div>

<VaultModals
  selectedItem={vault.selectedItem}
  editingItem={vault.editingItem}
  isCreating={vault.isCreating}
  showHistoryModal={vault.showHistoryModal}
  historyFiles={vault.historyFiles}
  onCloseModals={vault.closeModals}
  onEdit={vault.startEdit}
  onDelete={vault.handleDelete}
  onSave={vault.handleSave}
  onDeleteHistory={vault.deleteHistoryItem}
  onCopy={vault.copyToClipboard}
/>

<style>
  /* Only view-specific styles */
  .folder-dashboard { /* ... */ }
  .folder-pane { /* ... */ }
</style>
```

### Phase 4: Testing & Cleanup (2-3 hours)

#### Step 4.1: Unit Tests
**Time**: 1-1.5 hours

```bash
# Create test files
touch tests/stores/useVault.test.ts
touch tests/stores/useVaultSecurity.test.ts
touch tests/stores/useVaultSync.test.ts
```

**Test composables independently:**
```typescript
// tests/stores/useVault.test.ts
import { describe, test, expect, vi } from 'vitest';
import { useVault } from '$lib/stores/useVault.svelte';

describe('useVault', () => {
  test('loads vault from server', async () => {
    // Mock API
    // Test loadVault
  });
  
  test('saves vault with encryption', async () => {
    // Mock encrypt
    // Test saveVault
  });
  
  test('marks vault as dirty after edit', () => {
    // Test isDirty state
  });
});
```

#### Step 4.2: Integration Tests
**Time**: 30-45 minutes

```bash
# Update existing tests
npm run test -- Dashboard.test.ts
npm run test -- FolderDashboard.test.ts
```

#### Step 4.3: E2E Tests
**Time**: 30-45 minutes

```bash
# Run playwright tests
npm run test:e2e
```

#### Step 4.4: Cleanup
**Time**: 30 minutes

```bash
# Remove backup files if tests pass
rm src/lib/components/Dashboard.svelte.backup
rm src/lib/components/FolderDashboard.svelte.backup

# Update documentation
# Update CLAUDE.md if needed
```

## ✅ Verification Checklist

After each phase, verify:

### Phase 1 (Composables)
- [ ] useVault exports all necessary state and methods
- [ ] useVaultSecurity auto-sets up and cleans up event listeners
- [ ] useVaultSync starts polling automatically
- [ ] Unit tests pass for all composables
- [ ] TypeScript has no errors

### Phase 2 (Shared Components)
- [ ] VaultControls renders all buttons correctly
- [ ] VaultControls shows warnings conditionally
- [ ] VaultModals includes all three modals
- [ ] Styles are consistent with original

### Phase 3 (Refactored Components)
- [ ] Dashboard loads and displays entries
- [ ] Dashboard filter works
- [ ] Dashboard CRUD operations work
- [ ] FolderDashboard builds folder tree correctly
- [ ] FolderDashboard toggles folders
- [ ] FolderDashboard CRUD operations work
- [ ] Both dashboards share same behavior
- [ ] Security timeout works in both
- [ ] Sync detection works in both
- [ ] Modals work in both

### Phase 4 (Testing)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] No regressions detected
- [ ] Documentation updated

## 🚨 Common Issues & Solutions

### Issue: Reactivity not working
**Solution**: Use getters instead of direct property access
```typescript
// ❌ Wrong
const items = vault.items;

// ✅ Correct
const items = $derived(vault.items);
// or
<PasswordList items={vault.items} />
```

### Issue: Event listeners not cleaning up
**Solution**: Use $effect return function
```typescript
$effect(() => {
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
});
```

### Issue: Composable called multiple times
**Solution**: Call once at top level, pass down
```typescript
// ❌ Wrong - called in $effect
$effect(() => {
  const vault = useVault(); // Creates new instance each time
});

// ✅ Correct - called once
const vault = useVault();
$effect(() => {
  // Use vault here
});
```

## 📈 Progress Tracking

Create a GitHub issue or project board:

- [ ] Phase 1.1: Create useVault.svelte.ts
- [ ] Phase 1.2: Create useVaultSecurity.svelte.ts
- [ ] Phase 1.3: Create useVaultSync.svelte.ts
- [ ] Phase 2.1: Create VaultControls.svelte
- [ ] Phase 2.2: Create VaultModals.svelte
- [ ] Phase 3.1: Refactor Dashboard.svelte
- [ ] Phase 3.2: Refactor FolderDashboard.svelte
- [ ] Phase 4.1: Unit tests
- [ ] Phase 4.2: Integration tests
- [ ] Phase 4.3: E2E tests
- [ ] Phase 4.4: Cleanup & documentation

## 🎉 Success Metrics

After completion:
- ✅ 340 lines of duplication eliminated
- ✅ Code reduced from 850 to 600 lines
- ✅ All tests passing
- ✅ No functionality regressions
- ✅ Easier to add new views in future

## 📞 Questions?

Refer to:
- REFACTORING_PLAN.md - Detailed technical plan
- REFACTORING_VISUAL.md - Architecture diagrams
- REFACTORING_SUMMARY.md - Quick overview
