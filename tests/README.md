# Passkeys Test Suite

Comprehensive testing for the Passkeys password manager, covering unit tests, end-to-end tests, and integration tests.

## Quick Start

```bash
# Run all tests
npm run tests

# Run only vault-specific tests
npm run test:vault

# Run unit tests only (fast)
npm run test:unit

# Run E2E tests only
npm run test:e2e
```

## Test Structure

```
tests/
├── e2e/                          # End-to-end tests (Playwright)
│   ├── auth.spec.ts             # Authentication flows
│   ├── clipboard.spec.ts        # Clipboard operations
│   ├── vault.spec.ts            # Basic vault operations
│   ├── vault_situations.spec.ts # Comprehensive vault scenarios ⭐
│   ├── trust_device.spec.ts     # Device trust behavior
│   ├── sync.spec.ts             # Basic synchronization
│   ├── history.spec.ts          # Vault history
│   ├── security.spec.ts         # Security features
│   └── [other E2E tests]
│
├── unit/                         # Unit tests (Vitest)
│   ├── crypto.test.ts           # Cryptography functions
│   ├── vault.test.ts            # Vault utilities
│   ├── vault_sync.test.ts       # Vault sync logic ⭐
│   └── [other unit tests]
│
├── VAULT_TESTS.md               # 📖 Detailed vault test documentation
├── QUICK_REFERENCE.md           # 🚀 Quick command reference
├── ARCHITECTURE.md              # 🏗️ Test architecture diagrams
├── run-vault-tests.sh           # 🔧 Vault test runner script
└── README.md                    # 📋 This file
```

⭐ = New comprehensive vault situation tests

## New Vault Testing Features

### What's New

We've added **56 new tests** specifically for vault behavior in various situations:

- **18 E2E tests** covering real-world scenarios
- **38 unit tests** for synchronization logic
- Complete coverage of safe/unsafe devices, online/offline modes, sync conflicts, and edge cases

### Key Test Scenarios

1. **Device Trust** - Safe vs unsafe device storage strategies
2. **Vault Presence** - Missing, cached, or server-available vaults
3. **Synchronization** - Version detection and conflict resolution
4. **Online/Offline** - Graceful mode transitions
5. **Edge Cases** - Corrupted data, wrong keys, network failures

### Running Vault Tests

```bash
# All vault tests (recommended)
npm run test:vault

# Unit tests only (~5 seconds)
npm run test:vault:unit

# E2E tests only (~1-2 minutes)
npm run test:vault:e2e

# Specific scenario
npm run test:e2e:vault -- -g "Safe Device"
```

## Test Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [VAULT_TESTS.md](VAULT_TESTS.md) | Comprehensive vault test guide | Developers |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Quick commands and patterns | All users |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Visual diagrams and flows | Technical readers |

## Test Users

Tests use dedicated users (created by `./scripts/init.sh -t`):

| Username | Password | Purpose |
|----------|----------|---------|
| `admin` | `password` | General testing |
| `auth_test` | `q` | Authentication scenarios |
| `history_test` | `q` | Vault history/sync tests |
| `q` | `q` | Quick testing |

## Test Commands Reference

### Basic Commands
```bash
# All tests (unit + E2E)
npm run tests

# Unit tests only
npm run test:unit

# E2E tests only
npm run test:e2e

# Specific test file
npm run test:unit -- crypto.test.ts
npm run test:e2e -- auth.spec.ts
```

### Vault-Specific Commands
```bash
# All vault tests
npm run test:vault

# Vault unit tests
npm run test:vault:unit
npm run test:unit:vault

# Vault E2E tests
npm run test:vault:e2e
npm run test:e2e:vault
```

### Debugging Commands
```bash
# Interactive debugging (Playwright)
PWDEBUG=1 npm run test:e2e:vault

# Show test trace
npx playwright show-trace test-results/trace.zip

# Verbose output
npm run test:unit -- --reporter=verbose
```

### Test Environment
```bash
# Reset test database
npm run reset-db

# Manual initialization
./scripts/init.sh -t

# Run and test in development mode
npm run demo
```

## Test Coverage Summary

| Category | Unit | E2E | Total | Status |
|----------|------|-----|-------|--------|
| Vault Situations | 38 | 18 | 56 | ✅ Excellent |
| Authentication | 2 | 4 | 6 | ✅ Good |
| Cryptography | 12 | 0 | 12 | ✅ Good |
| Security | 3 | 5 | 8 | ✅ Good |
| History | 0 | 3 | 3 | ✅ Sufficient |
| UI/UX | 0 | 8 | 8 | ✅ Good |
| **Total** | **55+** | **38+** | **93+** | ✅ Excellent |

## Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('My Feature', () => {
    it('should do something', () => {
        // Arrange
        const input = 'test';
        
        // Act
        const result = myFunction(input);
        
        // Assert
        expect(result).toBe('expected');
    });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
    test.beforeEach(async ({ page }) => {
        // Setup
        await page.goto('/');
    });

    test('should work correctly', async ({ page }) => {
        // Interact
        await page.click('[data-testid="my-button"]');
        
        // Assert
        await expect(page.getByText('Success')).toBeVisible();
    });
});
```

## Common Testing Patterns

### Clear Browser Storage
```typescript
await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
});
```

### Mock Network Requests
```typescript
await page.route('**/api/**', route => route.abort('failed'));
```

### Wait for Specific State
```typescript
await expect(page.locator('[data-phase="2"]')).toBeVisible();
```

### Enable Fast Polling (Test Mode)
```typescript
await page.evaluate(() => {
    (window as any).__TESTING__ = true;
});
```

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: |
    npm ci
    npm run reset-db
    npm run tests
```

## Troubleshooting

### Common Issues

**Tests fail with "Element not visible"**
```typescript
// Solution: Add timeout or wait
await expect(element).toBeVisible({ timeout: 10000 });
await page.waitForLoadState('networkidle');
```

**Cannot decrypt vault errors**
```bash
# Solution: Reset test environment
npm run reset-db
```

**Flaky timing issues**
```typescript
// Solution: Use testing mode for consistent timing
await page.evaluate(() => (window as any).__TESTING__ = true);
```

**Port already in use**
```bash
# Solution: Find and kill process
lsof -ti:3000 | xargs kill -9
```

## Performance

- **Unit tests**: ~5-10 seconds total
- **E2E tests**: ~2-5 minutes total
- **Full suite**: ~5-7 minutes

Optimize by:
- Running unit tests first for quick feedback
- Using test mode (`__TESTING__`) for faster polling
- Running specific test files during development

## Best Practices

1. **Isolate tests** - Each test should be independent
2. **Clean up** - Reset state in `beforeEach`/`afterEach`
3. **Use test IDs** - Add `data-testid` for reliable selectors
4. **Document tests** - Add comments for complex scenarios
5. **Keep fast** - Mock external services, use test mode
6. **Test edge cases** - Don't just test happy paths
7. **DRY principle** - Extract common patterns to helpers

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Add both unit and E2E tests where applicable
3. Update test documentation
4. Ensure all tests pass before committing
5. Add test IDs to new UI elements

## Resources

- **Vitest Docs**: https://vitest.dev/
- **Playwright Docs**: https://playwright.dev/
- **Project Documentation**: `/CLAUDE.md`, `/README.md`
- **Vault Testing Details**: `/VAULT_TESTING_SUMMARY.md`

## Getting Help

1. Check test output for specific error messages
2. Review relevant test documentation
3. Enable debug mode: `PWDEBUG=1`
4. View trace files in `test-results/`
5. Consult main project documentation

---

**Last Updated**: January 2025  
**Test Count**: 93+ tests  
**Test Coverage**: Excellent  
**CI/CD Ready**: ✅
