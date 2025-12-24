# Refactoring Visual Architecture

## Current Architecture (WITH DUPLICATION)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Dashboard.svelte                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ State (50 lines)                                               │ │
│  │ • items, selectedItem, editingItem, isCreating                 │ │
│  │ • isDirty, lastSavedDate, offlineMode                          │ │
│  │ • isMemoryCleared, pollTimer, etc.                             │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Lifecycle (40 lines)                                           │ │
│  │ • onMount/onDestroy                                            │ │
│  │ • Event listeners                                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Vault Operations (150 lines)                                   │ │
│  │ • loadVault(), saveVault()                                     │ │
│  │ • pollForUpdates(), synchronizeVault()                         │ │
│  │ • openHistory(), deleteHistoryItem()                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Security (40 lines)                                            │ │
│  │ • resetTimer(), clearSensitiveData()                           │ │
│  │ • restoreSensitiveData()                                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ CRUD (60 lines)                                                │ │
│  │ • startCreate(), startEdit(), handleSave()                     │ │
│  │ • handleDelete(), copyToClipboard()                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ View-Specific (20 lines)                                       │ │
│  │ • filter, filteredFiles                                        │ │
│  │ • Filter UI                                                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Total: ~360 lines                                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       FolderDashboard.svelte                         │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ State (50 lines) ⚠️ DUPLICATED                                 │ │
│  │ • items, selectedItem, editingItem, isCreating                 │ │
│  │ • isDirty, lastSavedDate, offlineMode                          │ │
│  │ • isMemoryCleared, pollTimer, etc.                             │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Lifecycle (40 lines) ⚠️ DUPLICATED                             │ │
│  │ • onMount/onDestroy                                            │ │
│  │ • Event listeners                                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Vault Operations (150 lines) ⚠️ DUPLICATED                     │ │
│  │ • loadVault(), saveVault()                                     │ │
│  │ • pollForUpdates(), synchronizeVault()                         │ │
│  │ • openHistory(), deleteHistoryItem()                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Security (40 lines) ⚠️ DUPLICATED                              │ │
│  │ • resetTimer(), clearSensitiveData()                           │ │
│  │ • restoreSensitiveData()                                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ CRUD (60 lines) ⚠️ DUPLICATED                                  │ │
│  │ • startCreate(), startEdit(), handleSave()                     │ │
│  │ • handleDelete(), copyToClipboard()                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ View-Specific (150 lines)                                      │ │
│  │ • folderTree, selectedFolder                                   │ │
│  │ • buildFolderTree(), toggleFolder()                            │ │
│  │ • Folder tree UI                                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Total: ~490 lines                                                  │
└─────────────────────────────────────────────────────────────────────┘

TOTAL CODE: ~850 lines
DUPLICATED: ~340 lines (40% duplication!)
```

## Proposed Architecture (COMPOSABLE STORES)

```
┌─────────────────────────────────────────────────────────────────────┐
│                  stores/useVault.svelte.ts                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Shared State Management (200 lines)                            │ │
│  │ • items, selectedItem, editingItem, isCreating                 │ │
│  │ • isDirty, lastSavedDate, offlineMode                          │ │
│  │ • encryptedVaultData, newerVersionAvailable                    │ │
│  │                                                                │ │
│  │ Vault Operations                                               │ │
│  │ • loadVault(), saveVault()                                     │ │
│  │ • synchronizeVault()                                           │ │
│  │                                                                │ │
│  │ CRUD Operations                                                │ │
│  │ • startCreate(), startEdit(), handleSave(), handleDelete()     │ │
│  │ • selectItem(), copyToClipboard()                              │ │
│  │                                                                │ │
│  │ History Management                                             │ │
│  │ • openHistory(), deleteHistoryItem()                           │ │
│  │                                                                │ │
│  │ Modal State                                                    │ │
│  │ • showHistoryModal, historyFiles, closeModals()                │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│               stores/useVaultSecurity.svelte.ts                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Security & Memory Management (80 lines)                        │ │
│  │ • isMemoryCleared state                                        │ │
│  │ • resetTimer() - activity tracking                             │ │
│  │ • clearSensitiveData() - clear after timeout                   │ │
│  │ • restoreSensitiveData() - decrypt on activity                 │ │
│  │ • Auto-setup event listeners in $effect                        │ │
│  │ • Auto-cleanup on destroy                                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                stores/useVaultSync.svelte.ts                         │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Polling & Sync Detection (60 lines)                            │ │
│  │ • pollTimer state                                              │ │
│  │ • startPolling() - check server every minute                   │ │
│  │ • pollForUpdates() - detect newer versions                     │ │
│  │ • Auto-start polling in $effect                                │ │
│  │ • Auto-cleanup timer                                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│              components/VaultControls.svelte                         │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Shared Control Bar UI (60 lines)                               │ │
│  │ • Toggle view button (customizable icon/label)                 │ │
│  │ • New Entry button                                             │ │
│  │ • Save Vault button (conditional)                              │ │
│  │ • History button                                               │ │
│  │ • Offline mode warning                                         │ │
│  │ • Newer version warning + Sync button                          │ │
│  │ • Last saved timestamp                                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│               components/VaultModals.svelte                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ All Modals Together (40 lines)                                 │ │
│  │ • DetailsModal                                                 │ │
│  │ • EditorModal                                                  │ │
│  │ • HistoryModal                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

        ┌─────────────────────────────────────────────────┐
        │         Uses Composables & Components           │
        └─────────────────────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│   Dashboard.svelte           │  │   FolderDashboard.svelte     │
│  ┌────────────────────────┐  │  │  ┌────────────────────────┐  │
│  │ Composables (10 lines) │  │  │  │ Composables (10 lines) │  │
│  │ • useVault()           │  │  │  │ • useVault()           │  │
│  │ • useVaultSecurity()   │  │  │  │ • useVaultSecurity()   │  │
│  │ • useVaultSync()       │  │  │  │ • useVaultSync()       │  │
│  └────────────────────────┘  │  │  └────────────────────────┘  │
│  ┌────────────────────────┐  │  │  ┌────────────────────────┐  │
│  │ View-Specific (20)     │  │  │  │ View-Specific (120)    │  │
│  │ • filter               │  │  │  │ • folderTree           │  │
│  │ • filteredFiles        │  │  │  │ • buildFolderTree()    │  │
│  │ • Filter UI            │  │  │  │ • toggleFolder()       │  │
│  └────────────────────────┘  │  │  │ • Folder tree UI       │  │
│  ┌────────────────────────┐  │  │  └────────────────────────┘  │
│  │ Components (50)        │  │  │  ┌────────────────────────┐  │
│  │ • VaultControls        │  │  │  │ Components (50)        │  │
│  │ • PasswordList         │  │  │  │ • VaultControls        │  │
│  │ • VaultModals          │  │  │  │ • PasswordList         │  │
│  └────────────────────────┘  │  │  │ • VaultModals          │  │
│                              │  │  └────────────────────────┘  │
│  Total: ~80 lines            │  │  Total: ~180 lines          │
└──────────────────────────────┘  └──────────────────────────────┘

TOTAL CODE AFTER REFACTORING:
• Composables: 340 lines (reusable!)
• Shared components: 100 lines (reusable!)
• Dashboard: 80 lines
• FolderDashboard: 180 lines
• TOTAL: ~700 lines (vs 850 before)
• DUPLICATION: 0 lines (vs 340 before)
• CODE REDUCTION: ~150 lines
• REUSABILITY: High (can add more views easily)
```

## Component Communication Flow

### Before Refactoring
```
Dashboard.svelte
    ├─ Manages own state
    ├─ Loads vault
    ├─ Manages security
    ├─ Manages sync
    └─ Renders UI

FolderDashboard.svelte
    ├─ Manages own state (duplicate!)
    ├─ Loads vault (duplicate!)
    ├─ Manages security (duplicate!)
    ├─ Manages sync (duplicate!)
    └─ Renders UI
```

### After Refactoring
```
useVault (store)
    ├─ Manages items
    ├─ Provides CRUD methods
    └─ Exposes reactive getters
        ▲
        │ uses
        │
    ┌───┴────────────────────┐
    │                        │
Dashboard.svelte    FolderDashboard.svelte
    │                        │
    └───┬────────────────────┘
        │ uses
        ▼
useVaultSecurity (store)
    ├─ Manages memory clearing
    ├─ Tracks inactivity
    └─ Provides security methods
        ▲
        │ uses
        │
    ┌───┴────────────────────┐
    │                        │
Dashboard.svelte    FolderDashboard.svelte
    │                        │
    └───┬────────────────────┘
        │ uses
        ▼
useVaultSync (store)
    ├─ Polls for updates
    ├─ Detects newer versions
    └─ Manages sync state
```

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                          +page.svelte                         │
│                    (View Toggle State)                        │
└────────────────┬─────────────────────────┬───────────────────┘
                 │                         │
     useFolderView=false         useFolderView=true
                 │                         │
                 ▼                         ▼
    ┌─────────────────────┐   ┌─────────────────────────┐
    │  Dashboard.svelte   │   │ FolderDashboard.svelte  │
    └──────────┬──────────┘   └───────────┬─────────────┘
               │                          │
               └──────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  useVault.svelte.ts   │
              │  (Shared State)       │
              └───────────┬───────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌─────────┐   ┌─────────────┐   ┌─────────┐
    │ API     │   │ Crypto      │   │ Browser │
    │ Calls   │   │ Encrypt/    │   │ Storage │
    │         │   │ Decrypt     │   │         │
    └─────────┘   └─────────────┘   └─────────┘
```

## Example Usage Pattern

### Dashboard.svelte (After Refactoring)
```typescript
<script lang="ts">
  import { useVault } from "$lib/stores/useVault.svelte";
  
  let { encryptionKey, username, onToggleView } = $props();
  
  // ✨ One line to get all vault functionality!
  const vault = useVault(encryptionKey, username);
  
  // View-specific logic only
  let filter = $state("");
  let filteredFiles = $derived(
    vault.items().filter(item => 
      item.title.toLowerCase().includes(filter.toLowerCase())
    )
  );
</script>

<VaultControls
  onSave={vault.saveVault}
  isDirty={vault.isDirty()}
  {...otherProps}
/>

<PasswordList items={filteredFiles} {...handlers} />
<VaultModals {...modalProps} />
```

### FolderDashboard.svelte (After Refactoring)
```typescript
<script lang="ts">
  import { useVault } from "$lib/stores/useVault.svelte";
  
  let { encryptionKey, username, onToggleView } = $props();
  
  // ✨ Same one line! Shared logic!
  const vault = useVault(encryptionKey, username);
  
  // View-specific logic only
  let folderTree = $state<FolderNode>({ ... });
  
  function buildFolderTree() {
    // Build tree from vault.items()
  }
  
  $effect(() => {
    buildFolderTree();
  });
</script>

<VaultControls
  onSave={vault.saveVault}
  isDirty={vault.isDirty()}
  {...otherProps}
/>

<FolderTree {folderTree} />
<PasswordList items={displayedEntries} {...handlers} />
<VaultModals {...modalProps} />
```

## Benefits Visualization

```
BEFORE:                          AFTER:
┌─────────────┐                  ┌─────────────┐
│ Dashboard   │                  │ Dashboard   │
│   400 LOC   │                  │   80 LOC    │
└─────────────┘                  └──────┬──────┘
                                        │
┌─────────────┐                         │ uses
│   Folder    │                         │
│  Dashboard  │                  ┌──────▼──────┐
│   500 LOC   │                  │   Stores    │
└─────────────┘                  │  340 LOC    │◄────┐
                                 └──────┬──────┘     │
TOTAL: 900 LOC                          │            │
DUPLICATION: 340 LOC                    │ uses       │ uses
MAINTAINABILITY: Low                    │            │
                                 ┌──────▼──────┐     │
                                 │   Folder    │     │
                                 │  Dashboard  │     │
                                 │  180 LOC    │─────┘
                                 └─────────────┘
                                 
                                 TOTAL: 600 LOC
                                 DUPLICATION: 0 LOC
                                 MAINTAINABILITY: High
```

## Adding a New View (Example: Kanban View)

### Before Refactoring
```
❌ Copy 400 lines from Dashboard.svelte
❌ Add kanban-specific logic (~200 lines)
❌ Fix bugs in 3 places when they occur
Total: 600 lines of new code
```

### After Refactoring
```
✅ Import composables (3 lines)
✅ Add kanban-specific logic (~200 lines)
✅ Use VaultControls, VaultModals (5 lines)
✅ Bugs fixed once in stores, works everywhere
Total: 210 lines of new code
```

## Summary

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total Lines | 850 | 600 | -29% |
| Duplicated Lines | 340 | 0 | -100% |
| Dashboard Size | 400 | 80 | -80% |
| FolderDashboard Size | 500 | 180 | -64% |
| Reusable Code | 0% | 57% | +57% |
| Testable Units | 2 | 5 | +150% |
| Adding New View | 600 LOC | 210 LOC | -65% |
| Bug Fix Locations | 2-3 | 1 | -67% |

**Recommendation: Proceed with Option 1 (Composable Store Pattern)**
