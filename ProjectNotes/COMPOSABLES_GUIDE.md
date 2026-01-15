# Quick Reference: Using the Composables

## Overview

The vault logic has been extracted into three composable stores. This guide shows how to use them.

## The Three Composables

### 1. useVault - Core Vault Logic

**Import:**
```typescript
import { useVault } from "$lib/stores/useVault.svelte";
```

**Initialize:**
```typescript
const vault = useVault(encryptionKey, username);
```

**Available State (getters):**
```typescript
vault.items              // PasswordEntry[] - all vault entries
vault.selectedItem       // PasswordEntry | null - item in details modal
vault.editingItem        // PasswordEntry | null - item being edited
vault.isCreating         // boolean - creating new item?
vault.isDirty            // boolean - unsaved changes?
vault.lastSavedDate      // string | null - last save timestamp
vault.offlineMode        // boolean - using offline vault?
vault.isLoading          // boolean - loading vault?
vault.isSyncing          // boolean - syncing now?
vault.newerVersionAvailable // boolean - newer version on server?
vault.showHistoryModal   // boolean - history modal open?
vault.historyFiles       // HistoryItem[] - vault history
vault.encryptedVaultData // CipheredVaultData | null - encrypted data
```

**Available Methods:**
```typescript
await vault.loadVault()                      // Load vault from server
await vault.saveVault()                      // Save vault to server
await vault.synchronizeVault()               // Sync with server
await vault.openHistory()                    // Open history modal
await vault.deleteHistoryItem(filename)      // Delete history item
await vault.selectItem(item)                 // Select item for details
vault.startCreate(initialData?)              // Start creating new item
vault.startEdit(item)                        // Start editing item
await vault.handleSave(item)                 // Save item changes
await vault.handleDelete(item)               // Delete item
vault.closeModals()                          // Close all modals
await vault.copyToClipboard(text)            // Copy with auto-clear
vault.cleanup()                              // Cleanup timers (call on destroy)
```

**Setters (for composables):**
```typescript
vault.setItems(items)                        // Update items array
vault.setOfflineMode(offline)                // Update offline mode
vault.setNewerVersionAvailable(available)    // Update newer version flag
```

### 2. useVaultSecurity - Memory Clearing

**Import:**
```typescript
import { useVaultSecurity } from "$lib/stores/useVaultSecurity.svelte";
```

**Initialize:**
```typescript
const security = useVaultSecurity(
    vault,              // vault composable instance
    encryptionKey,      // CryptoKey for decryption
    () => {             // Optional: additional clear callback
        // Clear your view-specific state
        myViewState = [];
    }
);
```

**Available State:**
```typescript
security.isMemoryCleared  // boolean - is memory cleared?
```

**Available Methods:**
```typescript
security.resetTimer()             // Reset inactivity timer
await security.restoreSensitiveData() // Manually restore data
```

**Automatic Behavior:**
- Sets up event listeners automatically
- Clears memory after 60 seconds of inactivity
- Restores on user activity
- Cleans up on component destroy

### 3. useVaultSync - Server Polling

**Import:**
```typescript
import { useVaultSync } from "$lib/stores/useVaultSync.svelte";
```

**Initialize:**
```typescript
const sync = useVaultSync(vault); // vault composable instance
```

**Available Methods:**
```typescript
sync.startPolling()      // Manually start polling
await sync.pollForUpdates() // Manually poll once
```

**Automatic Behavior:**
- Starts polling automatically on mount
- Polls every 60 seconds (or 1 second in test mode)
- Updates vault.offlineMode
- Updates vault.newerVersionAvailable
- Cleans up on component destroy

## Complete Example

```typescript
<script lang="ts">
  import { onDestroy } from "svelte";
  import { useVault } from "$lib/stores/useVault.svelte";
  import { useVaultSecurity } from "$lib/stores/useVaultSecurity.svelte";
  import { useVaultSync } from "$lib/stores/useVaultSync.svelte";
  import VaultControls from "$lib/components/VaultControls.svelte";
  import VaultModals from "$lib/components/VaultModals.svelte";
  
  let { encryptionKey, username, onToggleView } = $props();
  
  // Initialize composables
  const vault = useVault(encryptionKey, username);
  const security = useVaultSecurity(vault, encryptionKey, () => {
    // Clear your view-specific state
    myFilteredItems = [];
  });
  const sync = useVaultSync(vault);
  
  // Your view-specific state
  let myFilteredItems = $derived(
    vault.items.filter(item => /* your logic */)
  );
  
  // Load vault on mount
  $effect(() => {
    vault.loadVault();
  });
  
  // Cleanup on destroy
  onDestroy(() => {
    vault.cleanup();
  });
  
  // Expose synchronizeVault for parent component
  export async function synchronizeVault() {
    await vault.synchronizeVault();
  }
</script>

<!-- Your UI -->
<VaultControls
  {onToggleView}
  viewIcon="<svg>...</svg>"
  viewLabel="My View"
  onNewEntry={vault.startCreate}
  onSave={vault.saveVault}
  onHistory={vault.openHistory}
  isDirty={vault.isDirty}
  offlineMode={vault.offlineMode}
  newerVersionAvailable={vault.newerVersionAvailable}
  lastSavedDate={vault.lastSavedDate}
  onSynchronize={vault.synchronizeVault}
/>

<!-- Your view-specific content -->
<div>
  {#each myFilteredItems as item}
    <div onclick={() => vault.selectItem(item)}>
      {item.title}
    </div>
  {/each}
</div>

<!-- Modals -->
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
```

## Common Patterns

### Pattern 1: Creating Entry with Default Values
```typescript
function createInFolder() {
  vault.startCreate({
    group: selectedFolder?.fullPath || "",
    tags: ["important"]
  });
}
```

### Pattern 2: Derived State from Items
```typescript
let filteredItems = $derived(
  vault.items.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  )
);
```

### Pattern 3: Grouping Items
```typescript
let itemsByGroup = $derived(
  vault.items.reduce((acc, item) => {
    const group = item.group || "Ungrouped";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, PasswordEntry[]>)
);
```

### Pattern 4: Conditional Operations
```typescript
async function saveIfNeeded() {
  if (vault.isDirty) {
    await vault.saveVault();
  }
}
```

## Shared Components

### VaultControls

**Props:**
```typescript
onToggleView: () => void;          // Required
viewIcon: string;                   // Required (SVG as string)
viewLabel: string;                  // Required
onNewEntry: () => void;            // Required
onSave: () => void;                // Required
onHistory: () => void;             // Required
isDirty?: boolean;                 // Optional
offlineMode?: boolean;             // Optional
newerVersionAvailable?: boolean;   // Optional
lastSavedDate?: string | null;     // Optional
onSynchronize: () => void;         // Required
```

### VaultModals

**Props:**
```typescript
selectedItem?: PasswordEntry | null;
editingItem?: PasswordEntry | null;
isCreating?: boolean;
showHistoryModal?: boolean;
historyFiles?: HistoryItem[];
onCloseModals: () => void;         // Required
onEdit: (item: PasswordEntry) => void;        // Required
onDelete: (item: PasswordEntry) => void;      // Required
onSave: (item: PasswordEntry) => void;        // Required
onDeleteHistory: (filename: string) => void;  // Required
onCopy: (text: string) => void;    // Required
```

### PasswordList

**Props:**
```typescript
items: PasswordEntry[];            // Required
isMemoryCleared?: boolean;         // Optional
onSelect: (item: PasswordEntry) => void;      // Required
onCopyUsername: (text: string) => void;       // Required
onCopyPassword: (text: string) => void;       // Required
```

## Tips & Best Practices

1. **Always cleanup**: Call `vault.cleanup()` in `onDestroy()`
2. **Use $derived for computed state**: Don't use $effect for derived values
3. **Load once**: Call `vault.loadVault()` in a single $effect
4. **Type safety**: The composables provide full TypeScript support
5. **Testing**: Mock the composables in tests for easier unit testing

## Troubleshooting

**Problem**: Items not updating in UI
**Solution**: Make sure you're accessing `vault.items` directly, not storing it in a variable

**Problem**: Security timeout not working
**Solution**: Make sure you didn't call `security.resetTimer()` in an effect that runs constantly

**Problem**: Modals not closing
**Solution**: Ensure `vault.closeModals()` is passed to VaultModals

**Problem**: TypeScript errors
**Solution**: Check that all required props are provided to shared components

## Questions?

See the full documentation:
- REFACTORING_COMPLETE.md - What was done
- REFACTORING_PLAN.md - Technical details
- REFACTORING_VISUAL.md - Architecture diagrams
