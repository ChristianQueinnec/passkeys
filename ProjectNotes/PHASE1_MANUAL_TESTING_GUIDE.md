# Phase 1 - Manual Testing Guide

## Quick Verification Steps

Follow these steps to verify that error clearing is working correctly:

### Prerequisites
1. Start the dev server: `npm run dev`
2. Open browser to `http://localhost:3000`
3. Have test credentials ready (username: `q`, password: `password`)

---

## Test 1: Login Error Clearing

### Steps:
1. Go to login page
2. Enter incorrect credentials:
   - Username: `wrong`
   - Password: `wrongpass`
3. Click "Sign In"
4. **Verify:** Error message appears (e.g., "Invalid credentials")
5. Start typing in the **username** field
6. **Expected Result:** ✅ Error message disappears immediately on first keystroke
7. Refresh page to reset
8. Repeat steps 1-4
9. Start typing in the **password** field
10. **Expected Result:** ✅ Error message disappears immediately on first keystroke

### Success Criteria:
- [ ] Error appears after failed login
- [ ] Error clears when typing in username field
- [ ] Error clears when typing in password field
- [ ] Error has proper accessibility attributes (check with browser inspector)

---

## Test 2: Unlock Error Clearing (NEW FEATURE!)

### Steps:
1. Login with correct credentials (username: `q`, password: `password`)
2. You should reach the "Unlock Vault" screen
3. Enter incorrect vault password: `wrongvaultpass`
4. Click "Unlock My Vault"
5. **Verify:** Error message appears IN THE PAGE (not an alert dialog!)
6. Start typing in the password field
7. **Expected Result:** ✅ Error message disappears immediately on first keystroke

### Success Criteria:
- [ ] Error displays as a visible message (NOT an alert popup)
- [ ] Error clears when typing in password field
- [ ] Error has proper styling and accessibility attributes
- [ ] No more alert() dialogs on unlock failure

---

## Test 3: Change Password Error Clearing

### Steps:
1. Login and unlock vault with correct credentials
2. Click username menu (top right)
3. Click "Change Login Password"
4. Enter:
   - Old password: `wrongold`
   - New password: `newpass`
5. Click "Update Login Password"
6. **Verify:** Error message appears
7. Start typing in the **old password** field
8. **Expected Result:** ✅ Error message disappears immediately
9. Trigger error again (repeat steps 4-6)
10. Start typing in the **new password** field
11. **Expected Result:** ✅ Error message disappears immediately

### Success Criteria:
- [ ] Error appears after failed password change
- [ ] Error clears when typing in old password field
- [ ] Error clears when typing in new password field
- [ ] Success message does NOT clear when typing (important!)

---

## Test 4: Change Vault Password Error Clearing

### Steps:
1. Login and unlock vault
2. Click username menu
3. Click "Change Vault Password"
4. Test mismatch error:
   - Old password: `password`
   - New password: `newpass`
   - Confirm password: `different`
5. Click "Save Changes"
6. **Verify:** Error appears ("New passwords do not match")
7. Start typing in **any password field**
8. **Expected Result:** ✅ Error message disappears immediately

### Steps for incorrect old password:
9. Clear all fields and enter:
   - Old password: `wrongpass`
   - New password: `newpass`
   - Confirm password: `newpass`
10. Click "Save Changes"
11. **Verify:** Error appears (about incorrect current password)
12. Start typing in **any password field**
13. **Expected Result:** ✅ Error message disappears immediately

### Success Criteria:
- [ ] Mismatch error appears and clears on typing
- [ ] Incorrect password error appears and clears on typing
- [ ] Error clears when typing in ANY of the three password fields
- [ ] Modal can be closed without errors persisting

---

## Test 5: Accessibility Check

### Steps:
1. Trigger any error (use Test 1)
2. Open browser DevTools (F12)
3. Inspect the error message element
4. **Verify attributes present:**
   - `role="alert"`
   - `aria-live="polite"`
5. Use a screen reader if available (optional)
6. **Expected:** Screen reader announces error when it appears

### Success Criteria:
- [ ] Error messages have `role="alert"`
- [ ] Error messages have `aria-live="polite"`
- [ ] Success messages have `role="status"` (if applicable)

---

## Test 6: Edge Cases

### Test 6a: Rapid Typing
1. Trigger an error (any form)
2. Type very quickly in an input field
3. **Expected:** Error clears on first keystroke, not after delay

### Test 6b: Multiple Fields
1. In Change Vault Password modal, trigger an error
2. Type in old password field → error clears
3. Trigger error again
4. Type in new password field → error clears
5. Trigger error again
6. Type in confirm password field → error clears

### Test 6c: Success Message (Should NOT Clear)
1. Successfully change login password
2. **Verify:** Success message appears
3. Start typing in either password field
4. **Expected:** ❌ Success message should NOT disappear (only errors clear)

### Success Criteria:
- [ ] Error clears immediately on rapid typing
- [ ] Error clears regardless of which field is edited (when multiple tracked)
- [ ] Success messages persist when typing

---

## Test 7: Internationalization

### Steps:
1. Switch language to French (FR button in header)
2. Trigger a login error
3. **Verify:** Error message is in French
4. Type in input field
5. **Verify:** Error clears
6. Attempt unlock with wrong password
7. **Verify:** Error message is in French: "Échec du déverrouillage du coffre..."

### Success Criteria:
- [ ] Errors appear in selected language
- [ ] Error clearing works in both languages
- [ ] New "unlock_failed" translation appears correctly

---

## Quick Checklist Summary

### Critical Tests (Must Pass)
- [ ] Login error clears on typing
- [ ] Unlock shows visible error (not alert)
- [ ] Unlock error clears on typing
- [ ] Change password error clears on typing
- [ ] Vault password error clears on typing

### Quality Tests (Should Pass)
- [ ] All errors have accessibility attributes
- [ ] Errors clear on first keystroke
- [ ] Success messages don't clear
- [ ] Works in both EN and FR
- [ ] No console errors during error clearing

### Enhancement Verification
- [ ] Unlock.svelte no longer uses alert()
- [ ] All error messages use consistent styling
- [ ] User experience feels responsive and immediate

---

## Known Issues to Watch For

1. **Infinite loops:** If error keeps reappearing, there's a problem with $effect
2. **Slow clearing:** Error should clear on FIRST keystroke, not after typing multiple characters
3. **Success clearing:** If success messages clear when typing, the logic is wrong
4. **Missing dependencies:** If error doesn't clear when typing in a specific field, that field might not be in the $effect dependencies

---

## Reporting Issues

If any test fails, note:
1. Which test failed
2. What was expected
3. What actually happened
4. Browser and version
5. Console errors (if any)

---

## Next Steps After Manual Testing

Once all manual tests pass:
1. Proceed to Phase 2 (automated testing)
2. Create e2e tests for each scenario
3. Run full test suite to ensure no regressions
4. Update documentation

---

**Testing Started:** [Date/Time]  
**Tester:** [Name]  
**Result:** [ ] All Pass | [ ] Some Failures | [ ] Not Tested
