# Hierarchical Dashboard Implementation

## Overview
Added a new hierarchical folder-based dashboard view alongside the existing flat list view. Users can toggle between the two views using buttons in the dashboard controls.

## New Components

### 1. **PasswordList.svelte**
A reusable component for displaying password entries in a list format. This component is now shared by both Dashboard views.

**Features:**
- Displays password entries with their titles
- Shows clickable icons for copying username and password
- Displays details view button
- Handles site URL links
- Shows empty state when no entries or when memory is cleared

**Props:**
- `items`: Array of PasswordEntry to display
- `isMemoryCleared`: Boolean indicating if memory was cleared for security
- `onSelect`: Callback when user clicks to view details
- `onCopyUsername`: Callback to copy username
- `onCopyPassword`: Callback to copy password

### 2. **FolderDashboard.svelte**
A new dashboard component with hierarchical folder navigation.

**Features:**
- Two-pane layout: folder tree on left, entries on right
- Hierarchical folder structure based on `group` property
- Folders can be opened/closed by clicking
- Classic folder icons (📁 closed, 📂 open, 📄 for leaf items)
- Shows entry count for each folder
- Selected folder is highlighted
- All standard vault operations (save, history, sync, etc.)
- Same security features (memory clearing, offline mode, etc.)
- New entries default to the currently selected folder

**Folder Structure:**
- Entries with `group: "a/b"` appear in folder `a`, subfolder `b`
- Entries without a group appear in the root folder
- Folders are automatically created from the group paths

**Layout:**
- Left pane (300px): Folder tree with nested structure
- Right pane (flex): Password entries for selected folder
- Top controls: View toggle, New Entry, Save, History buttons

## Modified Components

### 3. **Dashboard.svelte** (Updated)
The original list-based dashboard, now updated to:
- Use the shared `PasswordList` component (DRY principle)
- Accept `onToggleView` prop to switch to folder view
- Display folder icon button to switch views
- Removed duplicate code for rendering password list

### 4. **Editor.svelte** (Updated)
Enhanced to support the `group` field:
- Added `group` input field
- Label: "Group/Folder (e.g., 'Work/Email')"
- Placeholder: "Optional: folder/subfolder"
- Saves group value when creating/editing entries
- Sets undefined if group is empty

### 5. **+page.svelte** (Updated)
Main application page now manages view state:
- Added `useFolderView` state (defaults to `true` - folder view is default)
- Added `toggleDashboardView()` function
- Conditionally renders FolderDashboard or Dashboard based on view state
- Passes `onToggleView` callback to both dashboard components

## User Experience

### Toggle Between Views
- **Folder View Button** (in list view): Shows folder icon, switches to hierarchical view
- **List View Button** (in folder view): Shows list icon, switches to flat list view

### Folder View Navigation
1. Click folder icon or name to open/close folders
2. Opening a folder displays its subfolders and entries on the right
3. Selected folder is highlighted with blue background
4. Entry count shown for each folder in parentheses
5. "+" New Entry button creates entries in the currently selected folder

### List View (Original)
1. Filter box to search across all fields
2. Flat list of all entries
3. Same entry management features

## Technical Details

### Folder Tree Structure
```typescript
interface FolderNode {
    name: string;        // Folder name
    fullPath: string;    // Full path like "Work/Email"
    isOpen: boolean;     // Open/closed state
    children: FolderNode[];  // Subfolders
    entries: PasswordEntry[]; // Entries in this folder
}
```

### Group Property Format
- Format: `"folder/subfolder/subsubfolder"`
- Separator: `/`
- Example: `"Work/Email"` creates Work folder with Email subfolder
- Empty or undefined: Entry appears in root folder

### Reactivity
- `$effect()` watches items array and rebuilds folder tree automatically
- Maintains selected folder when tree is rebuilt (e.g., after save)
- Falls back to root if selected folder no longer exists

## Benefits

1. **Better Organization**: Users can organize passwords hierarchically
2. **Flexible Views**: Toggle between flat list (for searching) and folders (for browsing)
3. **Code Reuse**: Shared PasswordList component reduces duplication
4. **Consistent UX**: Both views share the same modals and operations
5. **Backward Compatible**: Works with existing vaults (entries without groups)
6. **Default to Hierarchy**: New users see the folder view by default

## File Summary

**New Files:**
- `src/lib/components/PasswordList.svelte` (165 lines)
- `src/lib/components/FolderDashboard.svelte` (510 lines)

**Modified Files:**
- `src/lib/components/Dashboard.svelte` (simplified, removed ~140 lines)
- `src/lib/components/Editor.svelte` (+10 lines for group field)
- `src/routes/+page.svelte` (+18 lines for view toggle logic)

## Future Enhancements

Possible improvements:
- Drag-and-drop to move entries between folders
- Rename/delete folders
- Folder-level operations (export folder, delete all in folder)
- Remember last selected folder in localStorage
- Collapsible all/expand all buttons
- Breadcrumb navigation in entry pane
- Search within current folder only option
