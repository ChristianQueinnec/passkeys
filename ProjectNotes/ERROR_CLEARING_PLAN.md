# Plan: Auto-Clear Error Messages on Input Change

## Problem Statement

When input fields are in an erroneous state (showing error messages), typing in those fields should immediately clear the visible error messages or comments. This provides better UX by giving immediate feedback that the user is attempting to fix the issue.

## Current State Analysis

After analyzing the codebase, I've identified the following components that display error messages:

### Components with Error Handling

1. **Login.svelte**
   - Error: Login failure message
   - Inputs: username, password
   - Current behavior: Error persists until next login attempt

2. **+page.svelte** (Main App)
   - Error: `cpError` - Change password error
   - Inputs: Old password, new password
   - Current behavior: Error persists until next submission

3. **ChangeVaultPasswordModal.svelte**
   - Error: Various validation and vault password errors
   - Inputs: Old vault password, new vault password, confirm password
   - Current behavior: Error persists until next submission or modal close

4. **Unlock.svelte**
   - Currently has no visible error display (uses alerts)
   - Could benefit from visible error messages with auto-clear

## Implementation Plan

### Phase 1: Core Pattern Implementation

#### 1.1. Create Reusable Error Clearing Pattern

Since Svelte 5 uses the Runes API ($state, $derived, $effect), we'll implement a consistent pattern across all components.

**Pattern:**
```typescript
// In each component with error state
let error = $state("");
let inputValue = $state("");

// Auto-clear error when input changes
$effect(() => {
    // Access the input value to create dependency
    inputValue;
    // Clear error
    if (error) {
        error = "";
    }
});
```

#### 1.2. Alternative: Create a Composable Store (Optional)

For more complex forms, create a reusable composable:

```typescript
// src/lib/stores/useFormError.svelte.ts
export function useFormError() {
    let error = $state("");
    
    function setError(message: string) {
        error = message;
    }
    
    function clearError() {
        error = "";
    }
    
    return {
        get error() { return error; },
        setError,
        clearError
    };
}
```

### Phase 2: Component Updates

#### 2.1. Login.svelte

**Changes Required:**
```svelte
<script lang="ts">
    // ... existing code ...
    let username = $state("");
    let password = $state("");
    let error = $state("");

    // Clear error when username or password changes
    $effect(() => {
        username; // Create dependency
        password; // Create dependency
        if (error) {
            error = "";
        }
    });

    // ... rest of code ...
</script>
```

**Test to Add:**
- Type in username field → error should disappear
- Type in password field → error should disappear

#### 2.2. +page.svelte (Change Password Form)

**Changes Required:**
```svelte
<script lang="ts">
    // ... existing code ...
    let cpOldPassword = $state("");
    let cpNewPassword = $state("");
    let cpError = $state("");

    // Clear error when passwords change
    $effect(() => {
        cpOldPassword;
        cpNewPassword;
        if (cpError) {
            cpError = "";
        }
    });

    // ... rest of code ...
</script>
```

**Test to Add:**
- Submit invalid password → error appears
- Type in old password field → error should disappear
- Type in new password field → error should disappear

#### 2.3. ChangeVaultPasswordModal.svelte

**Changes Required:**
```svelte
<script lang="ts">
    // ... existing code ...
    let oldPassword = $state("");
    let newPassword = $state("");
    let confirmPassword = $state("");
    let error = $state("");

    // Clear error when any password field changes
    $effect(() => {
        oldPassword;
        newPassword;
        confirmPassword;
        if (error) {
            error = "";
        }
    });

    // ... rest of code ...
</script>
```

**Test to Add:**
- Submit mismatched passwords → error appears
- Type in any password field → error should disappear

#### 2.4. Unlock.svelte (Enhancement)

**Current State:** Uses `alert()` for errors, which is not user-friendly.

**Recommended Changes:**
1. Replace `alert()` with visible error message
2. Add error clearing on password input change

```svelte
<script lang="ts">
    // ... existing code ...
    let password = $state("");
    let error = $state("");

    // Clear error when password changes
    $effect(() => {
        password;
        if (error) {
            error = "";
        }
    });

    async function handleUnlock() {
        loading = true;
        error = ""; // Clear any previous error
        try {
            await onUnlock(password);
        } catch (e: any) {
            error = e.message || "Failed to unlock vault";
        } finally {
            loading = false;
        }
    }
</script>

<div class="card">
    <!-- ... existing content ... -->
    
    {#if error}
        <p class="error">{error}</p>
    {/if}
    
    <!-- ... rest of form ... -->
</div>
```

### Phase 3: Editor Component Validation (Future Enhancement)

While not currently showing errors, the Editor component could benefit from validation:

**Editor.svelte:**
- Add validation for required fields
- Show inline errors
- Clear errors on input change

### Phase 4: Testing

#### 4.1. Unit Tests

Add tests to verify error clearing behavior in each component.

**Example test structure:**
```typescript
// tests/unit/Login.test.ts
import { render, fireEvent } from '@testing-library/svelte';
import Login from '$lib/components/Login.svelte';

test('should clear error when typing in username', async () => {
    const { getByPlaceholder, queryByText } = render(Login, {
        props: { onLogin: vi.fn() }
    });
    
    // Simulate error state
    // ... trigger error ...
    
    const usernameInput = getByPlaceholder('Username');
    await fireEvent.input(usernameInput, { target: { value: 'test' } });
    
    // Error should be cleared
    expect(queryByText(/error/i)).not.toBeInTheDocument();
});
```

#### 4.2. E2E Tests

Create comprehensive e2e test file: `tests/e2e/error_clearing.spec.ts`

**Test scenarios:**
1. Login error clearing on username input
2. Login error clearing on password input
3. Change password error clearing
4. Vault password change error clearing
5. Unlock error clearing (after implementing visible errors)

### Phase 5: Documentation

#### 5.1. Update Component Documentation

Add comments explaining the error clearing pattern:

```typescript
// Auto-clear error when user starts typing
// This provides immediate feedback that they're addressing the issue
$effect(() => {
    username;
    password;
    if (error) {
        error = "";
    }
});
```

#### 5.2. Create Pattern Documentation

Create `ERROR_HANDLING.md` documenting:
- When to use error clearing
- The standard pattern to follow
- Examples from each component
- Testing guidelines

## Implementation Checklist

### Phase 1: Core Implementation
- [ ] Choose between inline $effect or composable store approach
- [ ] Document the chosen pattern

### Phase 2: Component Updates
- [ ] Update Login.svelte with error clearing
- [ ] Update +page.svelte change password form
- [ ] Update ChangeVaultPasswordModal.svelte
- [ ] Enhance Unlock.svelte with visible errors + clearing

### Phase 3: Testing
- [ ] Add unit tests for Login.svelte error clearing
- [ ] Add unit tests for ChangeVaultPasswordModal.svelte
- [ ] Create e2e test file: error_clearing.spec.ts
- [ ] Write e2e tests for each component

### Phase 4: Documentation
- [ ] Add inline comments to components
- [ ] Create ERROR_HANDLING.md guide
- [ ] Update component README files if they exist

### Phase 5: QA & Polish
- [ ] Manual testing on all forms
- [ ] Test with keyboard navigation
- [ ] Test with screen readers (accessibility)
- [ ] Verify success messages aren't cleared prematurely

## Edge Cases to Consider

1. **Success Messages**: Don't clear success messages on input change (only errors)
2. **Multiple Errors**: If showing multiple errors, clear all when typing
3. **Validation on Blur**: Consider adding validation on blur, but only after user has attempted submission
4. **Empty Input**: Clearing error doesn't mean the input is valid, just that the user is addressing it
5. **Rapid Typing**: Ensure $effect doesn't cause performance issues with rapid input changes

## Svelte 5 Runes Considerations

### Using $effect Correctly

```typescript
// ✅ CORRECT: Effect runs when dependencies change
$effect(() => {
    username;  // Track username changes
    if (error) {
        error = "";
    }
});

// ❌ INCORRECT: Effect runs on every state change
$effect(() => {
    if (error) {
        error = "";  // This creates infinite loop
    }
});
```

### Alternative: Use oninput Handler

For simpler cases, can use event handlers:

```svelte
<input 
    bind:value={username}
    oninput={() => error = ""}
/>
```

**Pros:**
- Explicit and clear
- No effect dependencies to track
- Works per-input

**Cons:**
- Repetitive if many inputs
- Harder to add complex logic

### Recommended Approach

Use `$effect` for forms with multiple inputs, use `oninput` for single-input forms.

## Accessibility Considerations

1. **Screen Readers**: Ensure error messages are announced properly
   - Use `aria-live="polite"` for error containers
   - Consider `aria-describedby` linking inputs to errors

2. **Focus Management**: When error is cleared, maintain focus on input

3. **Visual Indicators**: Don't rely only on color for error state
   - Add icons or borders
   - Maintain sufficient contrast

## Example Implementation

Here's a complete example for Login.svelte:

```svelte
<script lang="ts">
  import { api } from "$lib/api";
  import PasswordInput from "./PasswordInput.svelte";
  import { i18n } from "$lib/stores/useI18n.svelte";

  let username = $state("");
  let password = $state("");
  let trustDevice = $state(false);
  let error = $state("");

  let { onLogin } = $props();

  // Auto-clear error when user starts typing in either field
  // This provides immediate feedback that they're addressing the issue
  $effect(() => {
    username; // Create dependency on username
    password; // Create dependency on password
    if (error) {
      error = "";
    }
  });

  async function handleLogin() {
    error = ""; // Clear error before attempting login
    try {
      await api.login(username, password, trustDevice);
      onLogin(username);
    } catch (e: any) {
      error = e.message;
    }
  }
</script>

<div class="card">
  <h2>{i18n.t("auth.login")}</h2>

  {#if error}
    <p class="error" role="alert" aria-live="polite">{error}</p>
  {/if}
  
  <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
    <input
      type="text"
      placeholder={i18n.t("auth.username")}
      bind:value={username}
      data-testid="username-input"
      aria-invalid={!!error}
      aria-describedby={error ? "login-error" : undefined}
    />
    <PasswordInput
      placeholder={i18n.t("auth.password")}
      bind:value={password}
      aria-invalid={!!error}
    />
    <label class="trust-device">
      <input
        type="checkbox"
        bind:checked={trustDevice}
        data-testid="trust-device-checkbox"
      />
      {i18n.t("auth.trust_device")}
    </label>
    <button type="submit" data-testid="login-button">
      {i18n.t("auth.login")}
    </button>
  </form>
</div>
```

## Timeline Estimate

- **Phase 1** (Pattern Definition): 1 hour
- **Phase 2** (Component Updates): 3-4 hours
- **Phase 3** (Testing): 4-5 hours
- **Phase 4** (Documentation): 1-2 hours
- **Phase 5** (QA & Polish): 2-3 hours

**Total**: 11-15 hours

## Priority Ranking

1. **High Priority**: Login.svelte (most visible, most frequently used)
2. **High Priority**: ChangeVaultPasswordModal.svelte (important security flow)
3. **Medium Priority**: +page.svelte change password form
4. **Medium Priority**: Unlock.svelte enhancement
5. **Low Priority**: Editor.svelte validation (future enhancement)

## Success Criteria

- [ ] All error messages clear immediately when user types in related input fields
- [ ] Success messages are NOT cleared when typing
- [ ] All existing tests still pass
- [ ] New tests cover error clearing behavior
- [ ] Documentation is complete and clear
- [ ] Accessibility requirements are met
- [ ] No performance degradation from $effect usage
