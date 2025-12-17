# Button Style Guide - Passkeys

## Unified Button Styles

All buttons in Passkeys now use consistent styling with rounded corners and appropriate colors.

### Base Button Style
- **Border Radius**: 6px (rounded corners)
- **Padding**: 0.625rem 1.25rem
- **Font Size**: 0.875rem
- **Font Weight**: 500
- **Transition**: Smooth hover effects with subtle lift

### Button Variants

#### 1. Primary Button (Default - Blue)
```html
<button>Primary Action</button>
```
- **Color**: Blue (#007bff)
- **Hover**: Darker blue (#0056b3) with slight lift
- **Use**: Main actions like Login, Unlock, Save

#### 2. Success Button (Green)
```html
<button class="success">Success Action</button>
<button class="save-btn">Save Vault</button>
```
- **Color**: Green (#28a745)
- **Hover**: Darker green (#218838)
- **Use**: Save actions, confirmations

#### 3. Danger Button (Red)
```html
<button class="danger">Delete</button>
```
- **Color**: Red (#dc3545)
- **Hover**: Darker red (#c82333)
- **Use**: Destructive actions like Delete

#### 4. Secondary Button (Gray)
```html
<button class="secondary">Cancel</button>
```
- **Color**: Gray (#6c757d)
- **Hover**: Darker gray (#5a6268)
- **Use**: Cancel, View, secondary actions

#### 5. Small Button
```html
<button class="small">Copy</button>
<button class="small danger">Delete</button>
```
- **Padding**: 0.375rem 0.75rem
- **Font Size**: 0.8rem
- **Use**: Inline actions, compact spaces

#### 6. Disabled Button
```html
<button disabled>Disabled</button>
```
- **Color**: Gray (#6c757d)
- **Opacity**: 0.6
- **Cursor**: Not allowed

### Special Buttons

#### Close Button (Modal)
```html
<button class="close">&times;</button>
```
- **Style**: Minimal, no background
- **Use**: Modal close buttons

#### User Menu Button
```html
<button class="user-btn">Username ▼</button>
```
- **Style**: Transparent background, white text
- **Use**: Header user menu

#### Dropdown Menu Buttons
- **Style**: White background, no rounded corners for stacked appearance
- **Use**: Dropdown menu items (Synchronize, Change Password, Logout)

## Usage Examples

### Action Buttons
```html
<div class="actions">
    <button>Save</button>
    <button class="secondary">Cancel</button>
</div>
```

### Delete with Confirmation
```html
<button class="danger" onclick={handleDelete}>Delete</button>
```

### Copy Button
```html
<button class="small" onclick={copyToClipboard}>Copy</button>
```

### List Item View Button
```html
<button class="small secondary" onclick={viewItem}>View</button>
```

## Design Principles

1. **Consistency**: All buttons use the same base styles
2. **Visual Hierarchy**: Color indicates action importance/type
3. **Accessibility**: Proper hover states and disabled states
4. **Modern**: Rounded corners (6px), smooth transitions
5. **Responsive**: Subtle hover lift effect for better UX

## Color Palette

- **Primary**: #007bff → #0056b3 (Blue)
- **Success**: #28a745 → #218838 (Green)
- **Danger**: #dc3545 → #c82333 (Red)
- **Secondary**: #6c757d → #5a6268 (Gray)
