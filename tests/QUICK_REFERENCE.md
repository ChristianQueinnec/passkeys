# Vault Testing Quick Reference

## Quick Commands

```bash
# Run all vault tests
npm run test:vault

# Run only unit tests (fast, ~5 seconds)
npm run test:vault:unit

# Run only E2E tests (~1-2 minutes)
npm run test:vault:e2e

# Run specific test suite
npm run test:e2e:vault -- -g "Safe Device"

# Debug mode (interactive)
PWDEBUG=1 npm run test:e2e:vault
```

## Test Users

| Username | Password | Purpose |
|----------|----------|---------|
| `admin` | `password` | General testing |
| `auth_test` | `q` | Authentication scenarios |
| `history_test` | `q` | Vault history/sync tests |
| `q` | `q` | Quick testing |

## Test Scenarios Checklist

### Device Trust
- [ ] Safe device - localStorage persistence
- [ ] Unsafe device - sessionStorage only
- [ ] Browser restart behavior

### Vault Presence
- [ ] No vault file exists
- [ ] Server vault available
- [ ] Cached vault only
- [ ] Priority: server > cache

### Synchronization
- [ ] Server has newer version
- [ ] Local has unsaved changes
- [ ] Conflict (both modified)
- [ ] Polling detection

### Online/Offline
- [ ] Start online
- [ ] Go offline (graceful)
- [ ] Come back online
- [ ] Start offline (cached vault)
- [ ] Save disabled when offline

### Edge Cases
- [ ] Corrupted cache
- [ ] Wrong vault key
- [ ] Missing metadata
- [ ] Network failures

## Key Test Helpers

### Enable Fast Polling
```typescript
await page.evaluate(() => {
    (window as any).__TESTING__ = true;
});
// Polling now runs every 1s instead of 60s
```

### Clear Storage
```typescript
await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
});
```

### Simulate Offline
```typescript
await page.route('**/api/**', route => route.abort('failed'));
```

### Create Newer Vault File
```typescript
const timestamp = new Date(Date.now() + 5000).toISOString();
const filename = `vault-${timestamp.replace(/[:.]/g, '-')}.vault`;
fs.writeFileSync(path.join(vaultDir, filename), content);
```

## Common Test Patterns

### Safe Device Login
```typescript
await page.getByTestId('trust-device-checkbox').check();
await page.click('[data-testid="login-button"]');
```

### Unsafe Device Login
```typescript
await page.getByTestId('trust-device-checkbox').uncheck();
await page.click('[data-testid="login-button"]');
```

### Unlock Vault
```typescript
await page.fill('input[type="password"]', vaultKey);
await page.click('[data-testid="unlock-button"]');
await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();
```

### Wait for Offline Detection
```typescript
await page.evaluate(() => (window as any).__TESTING__ = true);
await page.route('**/api/vault/metadata', route => route.abort('failed'));
await page.waitForTimeout(2000); // Wait for poll cycle
await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
```

## Test Data Locations

```
data/
├── users.json                     # User credentials
├── admin/
│   └── vault-*.vault             # Admin's vaults
├── auth_test/
│   └── vault-*.vault             # Auth test vaults
└── history_test/
    └── vault-*.vault             # History test vaults
```

## Important Test IDs

| Element | Test ID |
|---------|---------|
| Login button | `login-button` |
| Unlock button | `unlock-button` |
| Trust device checkbox | `trust-device-checkbox` |
| Logout button | `logout-btn` |
| New entry button | `new-entry-btn` |
| Save vault button | `save-vault-btn` |
| Offline indicator | `offline-indicator` |
| Newer version alert | `newer-version-alert` |
| Reload vault button | `reload-vault-btn` |
| History button | `history-btn` |

## Debugging Tests

### View Browser During Test
```bash
PWDEBUG=1 npm run test:e2e:vault
```

### Slow Motion
```typescript
test.use({ slowMo: 500 });
```

### Screenshots
Tests auto-capture on failure:
```
test-results/
└── vault-situations-spec-ts-...
    └── test-failed-1.png
```

### View Trace
```bash
npx playwright show-trace test-results/trace.zip
```

## Reset Test Environment

```bash
# Quick reset
npm run reset-db

# Manual reset
./scripts/init.sh -t
```

## Test Coverage Summary

| Category | Unit Tests | E2E Tests | Total |
|----------|-----------|-----------|-------|
| Device Trust | 4 | 3 | 7 |
| Vault Presence | 4 | 2 | 6 |
| Synchronization | 8 | 3 | 11 |
| Online/Offline | 3 | 5 | 8 |
| Edge Cases | 4 | 3 | 7 |
| Storage Logic | 8 | 2 | 10 |
| Metadata | 4 | 0 | 4 |
| Other | 3 | 0 | 3 |
| **Total** | **38** | **18** | **56** |

## Performance Tips

1. **Run unit tests first** - faster feedback
2. **Use `-g` flag** to run specific suites
3. **Enable parallel execution** when possible
4. **Use `__TESTING__` mode** for faster polling
5. **Clean up test data** to avoid interference

## Common Issues

### Test Fails: "Element not visible"
- Increase timeout: `{ timeout: 10000 }`
- Add `waitForLoadState()` before assertions
- Check if element is in correct phase

### Test Fails: "Network error"
- Ensure dev server is running
- Check if API routes are blocked unintentionally
- Verify test user exists

### Test Fails: "Cannot decrypt"
- Verify vault key matches test data
- Check if vault file is corrupted
- Ensure encryption metadata present

### Flaky Tests
- Add `waitForTimeout()` after state changes
- Use `toBeVisible()` instead of direct checks
- Enable `__TESTING__` mode for consistent timing

## Next Steps

After running tests:

1. **Review failures** - Check screenshots and traces
2. **Verify coverage** - Ensure all scenarios tested
3. **Add regression tests** - For any bugs found
4. **Update documentation** - Keep this guide current

## Documentation Links

- Full Documentation: `/tests/VAULT_TESTS.md`
- Implementation Summary: `/VAULT_TESTING_SUMMARY.md`
- E2E Tests: `/tests/e2e/vault_situations.spec.ts`
- Unit Tests: `/tests/unit/vault_sync.test.ts`

## Getting Help

1. Check test output for specific errors
2. Review test documentation
3. Enable debug mode: `PWDEBUG=1`
4. View trace files for failed tests
5. Consult main Passkeys documentation

---

**Last Updated**: January 2025  
**Test Suite Version**: 1.0  
**Total Tests**: 56 (38 unit + 18 E2E)
