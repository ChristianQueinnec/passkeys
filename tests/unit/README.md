# Unit Tests

This directory contains all unit tests for the Passkeys application.

## Running Tests

### All Unit Tests
```bash
npm run test:unit
```

### Specific Test File
```bash
# Sanitization tests
npm run test:unit -- tests/unit/sanitizer.test.ts

# Crypto tests
npm run test:unit -- tests/unit/crypto.test.ts

# Vault tests
npm run test:unit -- tests/unit/vault.test.ts
```

### Watch Mode
```bash
npm run test:unit -- --watch
```

### With Coverage
```bash
npm run test:unit -- --coverage
```

## Test Files

### Input Sanitization (`sanitizer.test.ts`)
Tests for all input validation and sanitization functions:
- `sanitizeUsername()` - 7 tests
- `sanitizePassword()` - 6 tests
- `sanitizeToken()` - 6 tests
- `sanitizeFilename()` - 10 tests
- `sanitizeVaultContent()` - 6 tests
- `sanitizeCSRFToken()` - 6 tests
- `sanitizeString()` - 7 tests

**Total**: 48 tests

**Coverage**:
- Valid input acceptance
- Invalid input rejection
- Type validation
- Length constraints
- Path traversal prevention
- Character whitelisting
- Edge cases

### Cryptography (`crypto.test.ts`)
Tests for password hashing and verification.

### Vault Logic (`vault.test.ts`)
Tests for vault operations and data management.

### Vault Sync (`vault_sync.test.ts`)
Tests for vault synchronization logic.

### Settings (`settings.test.ts`)
Tests for user settings management.

### Internationalization (`i18n.test.ts`)
Tests for i18n functionality.

### Library Crypto (`lib-crypto.test.ts`)
Tests for client-side cryptography.

## Quick Test Commands

```bash
# Run sanitization tests (recommended after any API changes)
npm run test:unit -- tests/unit/sanitizer.test.ts

# Or use the convenience script
./test-sanitization.sh

# Run all unit tests
npm run test:unit

# Run with verbose output
npm run test:unit -- --reporter=verbose

# Run specific test suite
npm run test:unit -- tests/unit/sanitizer.test.ts -t "sanitizeUsername"
```

## Test Structure

All tests follow this structure:

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../../src/lib/path/to/module';

describe('Module Name', () => {
    describe('functionName', () => {
        it('should handle valid input', () => {
            expect(functionToTest(validInput)).toBe(expectedOutput);
        });

        it('should reject invalid input', () => {
            expect(() => functionToTest(invalidInput)).toThrow('Error message');
        });
    });
});
```

## Writing New Tests

1. Create test file: `tests/unit/your-module.test.ts`
2. Import from source: `import { func } from '../../src/lib/your-module'`
3. Use vitest assertions: `expect()`, `.toBe()`, `.toThrow()`, etc.
4. Run tests: `npm run test:unit -- tests/unit/your-module.test.ts`

## Debugging Tests

```bash
# Run single test file with detailed output
npm run test:unit -- tests/unit/sanitizer.test.ts --reporter=verbose

# Run specific test by name
npm run test:unit -- tests/unit/sanitizer.test.ts -t "should accept valid usernames"

# Run with Node debugger
node --inspect-brk node_modules/.bin/vitest tests/unit/sanitizer.test.ts
```

## CI/CD Integration

Tests are automatically run in CI/CD pipelines. Ensure all tests pass before merging:

```bash
# Run full test suite (as CI would)
npm run tests
```

## Common Issues

### Import Errors
- Use relative imports: `../../src/lib/module`
- Don't use `$lib` alias in test files
- Check file paths are correct

### Async Tests
```typescript
it('should handle async operations', async () => {
    const result = await asyncFunction();
    expect(result).toBeDefined();
});
```

### Type Errors
- Ensure TypeScript types are properly imported
- Check `tsconfig.json` for proper configuration

## Performance

Unit tests should be fast:
- Target: < 1 second total for all unit tests
- Use mocks for external dependencies
- Avoid actual file I/O or network calls

## Coverage Goals

- Line coverage: > 80%
- Branch coverage: > 75%
- Function coverage: > 80%

Check coverage:
```bash
npm run test:unit -- --coverage
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](../README.md)
- [Sanitization Guide](../../INPUT_SANITIZATION.md)
