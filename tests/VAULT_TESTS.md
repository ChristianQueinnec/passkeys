# Vault Situation Tests Documentation

## Overview

This document describes the comprehensive test suite for vault behavior in various situations. The tests cover critical security and synchronization scenarios that users may encounter when using Passkeys.

## Test Categories

### 1. Safe Device Tests (`vault_situations.spec.ts`)

Tests how the application behaves on trusted devices where the user has explicitly chosen to trust the device.

#### Key Scenarios:
- **Persistent Storage**: Verifies that vault data persists in `localStorage` for trusted devices
- **Session Continuity**: Ensures sessions survive page reloads on trusted devices
- **Offline Vault Access**: Confirms cached vaults can be accessed when offline

#### Security Implications:
- Trusted devices store authentication tokens in `localStorage` (survives browser restart)
- Encrypted vaults cached locally for offline access
- User remains logged in across browser sessions

### 2. Unsafe Device Tests

Tests behavior on untrusted devices (public computers, shared devices).

#### Key Scenarios:
- **Session-Only Storage**: Tokens stored only in `sessionStorage`
- **No Persistence**: Login state cleared on browser restart
- **Limited Caching**: Minimal data persistence for security

#### Security Implications:
- Authentication tokens do NOT survive browser restart
- More secure for public/shared computers
- Still allows offline vault access but with re-authentication required

### 3. Vault Presence Tests

Tests how the application handles various vault availability scenarios.

#### Key Scenarios:
- **Missing Vault**: Application starts with no server-side vault
- **Cached vs Server Priority**: Server vault takes precedence when available
- **Empty Vault Initialization**: Graceful handling of first-time users

#### Expected Behaviors:
- Falls back to cached vault if server unavailable
- Always prefers server vault when online
- Initializes empty vault for new users

### 4. Synchronization Tests

Tests vault synchronization logic between client and server.

#### Key Scenarios:
- **Newer Server Version**: Detects when server has been updated elsewhere
- **Local Changes**: Handles unsaved local modifications
- **Conflict Resolution**: Both local and server have changes
- **Polling Mechanism**: Periodic checks for server updates

#### Test Mode Features:
- Fast polling (1 second intervals) enabled via `window.__TESTING__`
- Simulates multiple clients modifying the same vault
- Tests merge conflict warnings and resolution options

### 5. Online/Offline Mode Tests

Tests application behavior during network connectivity changes.

#### Key Scenarios:
- **Full Online Operation**: All features available
- **Transition to Offline**: Graceful degradation when connection lost
- **Offline Limitations**: Save operations disabled, read-only mode
- **Recovery to Online**: Restores full functionality when connected

#### Offline Behavior:
- Vault remains readable from cache
- Offline indicator displayed to user
- Save attempts fail gracefully with clear messaging
- Automatic reconnection when network restored

### 6. Edge Cases Tests

Tests unusual or error conditions.

#### Key Scenarios:
- **Corrupted Cache**: Invalid JSON in localStorage
- **Wrong Vault Key**: Incorrect decryption key
- **Malformed Vault**: Missing encryption metadata
- **Decryption Failures**: Handles crypto errors gracefully

## Unit Tests (`vault_sync.test.ts`)

Pure logic tests without browser automation.

### Test Suites:

#### Timestamp Comparison Logic
- Correctly identifies newer/older vaults
- Handles 1-second tolerance for clock skew
- Graceful handling of missing timestamps

#### Storage Mechanism Tests
- localStorage vs sessionStorage selection
- Offline vault caching
- Token persistence strategies
- Storage corruption handling

#### Conflict Detection Logic
- Identifies when both local and server modified
- Provides resolution strategies
- User choice handling

#### Polling Mechanism Tests
- Configurable intervals
- Test mode acceleration
- Error handling during polls
- Start/stop lifecycle

#### Vault Priority Logic
- Server > cached vault when online
- Cached vault when offline
- Empty vault fallback

#### Metadata Validation
- Required fields validation
- Format verification
- Handling of extra fields
- Invalid metadata rejection

#### Unencrypted Vault Detection
- Array format detection (bootstrap)
- Automatic encryption trigger
- Migration from plain to encrypted

## Running the Tests

### Run All Vault Situation Tests
```bash
npm run test:e2e -- vault_situations.spec.ts
```

### Run Specific Test Suite
```bash
npm run test:e2e -- vault_situations.spec.ts -g "Safe Device"
```

### Run Unit Tests
```bash
npm run test:unit -- vault_sync.test.ts
```

### Run All Tests
```bash
npm run tests
```

## Test Data Setup

Tests use the `auth_test` and `history_test` users created by `./scripts/init.sh -t`:

```bash
./scripts/init.sh -t
```

This creates:
- Multiple test users with known credentials
- Sample vault files
- Clean test environment

## Key Testing Patterns

### 1. Storage Mocking
```typescript
await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
});
```

### 2. Network Interception
```typescript
await page.route('**/api/**', route => route.abort('failed'));
```

### 3. Time Control (Unit Tests)
```typescript
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
```

### 4. Fast Polling Mode
```typescript
await page.evaluate(() => {
    (window as any).__TESTING__ = true;
});
```

### 5. File System Manipulation
```typescript
fs.writeFileSync(
    path.join(vaultDir, 'vault-newer.vault'),
    content
);
```

## Test Coverage

### Security Scenarios
- ✅ Trusted device token persistence
- ✅ Untrusted device session-only storage
- ✅ Offline vault caching
- ✅ Vault key validation
- ✅ Decryption error handling

### Synchronization Scenarios
- ✅ Newer server version detection
- ✅ Local modification tracking
- ✅ Conflict identification
- ✅ Offline/online transitions
- ✅ Polling mechanism

### Edge Cases
- ✅ Corrupted cache handling
- ✅ Missing vault files
- ✅ Wrong decryption keys
- ✅ Network failures
- ✅ Malformed vault data

## Future Test Additions

Potential areas for expanded test coverage:

1. **Multi-Tab Synchronization**: Test vault changes across browser tabs
2. **Race Conditions**: Simultaneous save operations
3. **Large Vaults**: Performance with thousands of entries
4. **Encryption Algorithm Changes**: Migration between crypto versions
5. **Browser Storage Limits**: Behavior when quotas exceeded
6. **Service Worker Integration**: PWA offline capabilities

## Debugging Tests

### Enable Playwright Debugging
```bash
PWDEBUG=1 npm run test:e2e -- vault_situations.spec.ts
```

### View Test Trace
```bash
npx playwright show-trace test-results/trace.zip
```

### Slow Motion Mode
```typescript
test.use({ slowMo: 500 });
```

### Screenshot on Failure
Tests automatically capture screenshots on failure in `test-results/`

## Test Maintenance

### When to Update Tests

1. **New Features**: Add tests for new vault synchronization features
2. **Bug Fixes**: Add regression tests for discovered issues
3. **API Changes**: Update mocks when API endpoints change
4. **Security Updates**: Verify security guarantees still hold

### Test Data Cleanup

Tests clean up after themselves, but manual cleanup if needed:

```bash
# Reset test database
npm run reset-db

# Or manually
./scripts/init.sh -t
```

## Performance Considerations

### Test Speed Optimization

1. **Parallel Execution**: Most tests run in parallel
2. **Fast Polling**: 1-second intervals in test mode vs 60 seconds in production
3. **Selective Network Mocking**: Only mock when necessary
4. **Shared Setup**: Use `beforeEach` wisely to avoid redundant setup

### Typical Test Duration

- Unit tests: ~2-5 seconds
- E2E vault situations: ~30-60 seconds per suite
- Full test run: ~2-5 minutes

## Conclusion

This comprehensive test suite ensures Passkeys handles all critical vault scenarios correctly:

- **Security**: Proper storage strategies for trusted/untrusted devices
- **Reliability**: Graceful handling of offline mode and network failures
- **Synchronization**: Accurate detection and resolution of vault conflicts
- **Robustness**: Error handling for corrupted data and edge cases

The tests provide confidence that the vault system works correctly across the diverse situations users will encounter in real-world usage.
