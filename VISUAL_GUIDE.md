# Visual Guide: Hierarchical Dashboard

## Component Architecture

```
+page.svelte
    ├─ [Toggle State: useFolderView]
    │
    ├─ FolderDashboard (if useFolderView === true) ← DEFAULT
    │   ├─ Controls Header
    │   │   ├─ [List View Button] → toggles view
    │   │   ├─ [+ New Entry]
    │   │   ├─ [Save Vault] (if dirty)
    │   │   └─ [History]
    │   │
    │   └─ Main Content (two-pane)
    │       ├─ Folder Pane (left, 300px)
    │       │   └─ Folder Tree
    │       │       ├─ 📂 Root (15)
    │       │       ├─ 📁 Work (8)
    │       │       │   ├─ 📂 Email (3)
    │       │       │   └─ 📁 Projects (5)
    │       │       └─ 📁 Personal (7)
    │       │
    │       └─ Entries Pane (right, flex)
    │           └─ PasswordList
    │               ├─ Entry 1
    │               ├─ Entry 2
    │               └─ Entry 3
    │
    └─ Dashboard (if useFolderView === false)
        ├─ Sidebar
        │   ├─ Controls
        │   │   ├─ [Folder View Button] → toggles view
        │   │   ├─ [+ New Entry]
        │   │   ├─ [Save Vault] (if dirty)
        │   │   ├─ [History]
        │   │   └─ [Filter Input Box]
        │   │
        │   └─ PasswordList (filtered entries)
        │       ├─ Entry 1
        │       ├─ Entry 2
        │       └─ Entry N
        │
        └─ [Shared Modals]
            ├─ DetailsModal
            ├─ EditorModal (uses Editor.svelte with group field)
            └─ HistoryModal
```

## Folder View Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [List View] [+ New Entry] [Save Vault] [History]                │
│ Last saved: 2024-01-15T10:30:00Z                                │
├─────────────────┬───────────────────────────────────────────────┤
│ Folders         │ Work/Email                                    │
├─────────────────┼───────────────────────────────────────────────┤
│                 │                                               │
│ 📂 Root (5)     │  [Entry Title]        [👤] [🔑] [👁]         │
│ 📂 Work (12)    │  [Entry Title 2]      [👤] [🔑] [👁]         │
│   📂 Email (3)  │  [Entry Title 3]      [👤] [🔑] [👁]         │
│   📁 Docs (4)   │                                               │
│   📁 Projects(5)│                                               │
│ 📁 Personal (8) │                                               │
│ 📁 Finance (6)  │                                               │
│                 │                                               │
└─────────────────┴───────────────────────────────────────────────┘
```

## List View Layout (Original)

```
┌─────────────────────────────────────────────────────────────────┐
│ [Folder View] [+ New Entry] [Save Vault] [History]              │
│ Last saved: 2024-01-15T10:30:00Z                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Filter...                                                [×] │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Entry Title]                              [👤] [🔑] [👁]     │
│  [Another Entry]                            [👤] [🔑] [👁]     │
│  [Work Email - Gmail]                       [👤] [🔑] [👁]     │
│  [Personal - Facebook]                      [👤] [🔑] [👁]     │
│  [Banking - Chase]                          [👤] [🔑] [👁]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Entry Editor with Group Field

```
┌─────────────────────────────────────────────────────────────────┐
│                       New Item / Edit Item                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Title *                                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Gmail Work Account                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Site URL                                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ https://mail.google.com                                   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Username                                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ john.doe@company.com                                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Password                                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ●●●●●●●●●●●●                                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Group/Folder (e.g., "Work/Email")         ← NEW FIELD         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Work/Email                                                │ │
│  └───────────────────────────────────────────────────────────┘ │
│  Optional: folder/subfolder                                    │
│                                                                 │
│  Tags (comma separated)                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ work, google, email                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Notes                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Primary work email account                                │ │
│  │ 2FA enabled with authenticator app                        │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                               [Save]  [Cancel]                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Example Folder Structure from Groups

Given these password entries with groups:

```javascript
[
  { title: "Gmail Work", group: "Work/Email" },
  { title: "Outlook Work", group: "Work/Email" },
  { title: "Slack", group: "Work/Communication" },
  { title: "Jira", group: "Work/Projects/Management" },
  { title: "GitHub", group: "Work/Projects/Code" },
  { title: "Facebook", group: "Personal/Social" },
  { title: "Twitter", group: "Personal/Social" },
  { title: "Netflix", group: "Personal/Entertainment" },
  { title: "Chase Bank", group: "Finance/Banking" },
  { title: "Amazon", group: "" }, // Root level
]
```

The folder tree would be:

```
📂 Root (1)
    Amazon

📂 Work (5)
  📂 Email (2)
      Gmail Work
      Outlook Work
  📂 Communication (1)
      Slack
  📂 Projects (2)
    📂 Management (1)
        Jira
    📂 Code (1)
        GitHub

📂 Personal (3)
  📂 Social (2)
      Facebook
      Twitter
  📂 Entertainment (1)
      Netflix

📂 Finance (1)
  📂 Banking (1)
      Chase Bank
```

## User Interactions

### In Folder View:
1. **Click folder icon/name** → Toggle open/close, select folder, show entries
2. **Click "+ New Entry"** → Opens editor with group pre-filled to selected folder
3. **Click entry details icon** → Opens DetailsModal
4. **Click username/password icons** → Copies to clipboard (10s timeout)
5. **Click "List View" button** → Switches to flat list view

### In List View:
1. **Type in filter box** → Filters entries across all fields (case-insensitive)
2. **Click "×" in filter** → Clears filter
3. **Click "+ New Entry"** → Opens editor (group field available)
4. **Click "Folder View" button** → Switches to hierarchical view

### In Both Views:
- **Security timeout**: After 1 minute of inactivity, sensitive data cleared
- **Offline mode**: Works with locally cached encrypted vault
- **Sync detection**: Notifies when newer version available on server
- **Dirty state**: "Save Vault" button appears when changes are made

## Icons Reference

- 📁 Closed folder (has children, not open)
- 📂 Open folder (has children, currently open)
- 📄 Leaf folder (no subfolders)
- 👤 User icon (copy username)
- 🔑 Key icon (copy password)
- 👁 Eye icon (view details)
- ⚠️ Warning icon (offline mode)
- 📦 Package icon (newer version available)
