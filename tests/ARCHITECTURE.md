# Vault Testing Architecture

## Test Coverage Visualization

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VAULT TEST SUITE                            │
│                    (56 tests: 38 unit + 18 E2E)                    │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
            ┌───────▼────────┐           ┌────────▼───────┐
            │  Unit Tests    │           │   E2E Tests    │
            │   (38 tests)   │           │   (18 tests)   │
            │   ~5 seconds   │           │  ~1-2 minutes  │
            └───────┬────────┘           └────────┬───────┘
                    │                             │
        ┌───────────┴───────────┐      ┌──────────┴──────────┐
        │                       │      │                     │
┌───────▼────────┐  ┌──────────▼──────▼────┐  ┌────────────▼──────────┐
│ Logic Testing  │  │  Storage Testing    │  │  Browser Testing      │
│                │  │                     │  │                       │
│ • Timestamps   │  │  • localStorage     │  │  • User interactions  │
│ • Priorities   │  │  • sessionStorage   │  │  • Page navigation    │
│ • Conflicts    │  │  • Caching          │  │  • Network mocking    │
│ • Validation   │  │  • Persistence      │  │  • File system ops    │
└────────────────┘  └─────────────────────┘  └───────────────────────┘
```

## Test Scenario Coverage Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TEST SCENARIOS                              │
└─────────────────────────────────────────────────────────────────────┘

1. DEVICE TRUST (7 tests)
   ├─ Safe Device [E2E]
   │  ├─ ✓ Persist in localStorage
   │  ├─ ✓ Reload cached vault offline
   │  └─ ✓ Session continuity
   │
   └─ Unsafe Device [E2E]
      ├─ ✓ Use sessionStorage only
      ├─ ✓ No persistence after restart
      └─ [Unit] Storage selection logic

2. VAULT PRESENCE (6 tests)
   ├─ Missing Vault [E2E]
   │  └─ ✓ Graceful handling
   │
   ├─ Server vs Cache [E2E]
   │  └─ ✓ Correct priority
   │
   └─ [Unit] Priority logic
      ├─ ✓ Server > cache when online
      ├─ ✓ Cache when offline
      └─ ✓ Empty vault fallback

3. SYNCHRONIZATION (11 tests)
   ├─ Version Detection [E2E]
   │  ├─ ✓ Newer server version
   │  ├─ ✓ Local modifications
   │  └─ ✓ Conflict handling
   │
   ├─ [Unit] Timestamp comparison
   │  ├─ ✓ Identify newer/older
   │  ├─ ✓ Clock skew tolerance
   │  └─ ✓ Missing timestamps
   │
   └─ [Unit] Polling mechanism
      ├─ ✓ Regular intervals
      ├─ ✓ Fast test mode
      ├─ ✓ Start/stop lifecycle
      └─ ✓ Error handling

4. ONLINE/OFFLINE (8 tests)
   ├─ Mode Transitions [E2E]
   │  ├─ ✓ Online → Offline
   │  ├─ ✓ Offline → Online
   │  ├─ ✓ Save when online
   │  ├─ ✓ Block save when offline
   │  └─ ✓ Start offline
   │
   └─ [Unit] State management
      ├─ ✓ Detect offline
      ├─ ✓ Detect online
      └─ ✓ Maintain state

5. EDGE CASES (7 tests)
   ├─ Error Handling [E2E]
   │  ├─ ✓ Corrupted cache
   │  ├─ ✓ Wrong vault key
   │  └─ ✓ Missing metadata
   │
   └─ [Unit] Validation
      ├─ ✓ Required structure
      ├─ ✓ Missing fields
      └─ ✓ Extra fields

6. OTHER (17 tests)
   └─ [Unit] Supporting logic
      ├─ Offline storage (4)
      ├─ Conflict detection (4)
      ├─ Metadata handling (4)
      ├─ Unencrypted bootstrap (3)
      └─ State validation (4)
```

## Test Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TYPICAL TEST EXECUTION FLOW                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ Start Tests  │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Initialize Env   │
│ ./init.sh -t     │
└──────┬───────────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
┌─────────────────┐                  ┌──────────────────┐
│  Unit Tests     │                  │   E2E Tests      │
│                 │                  │                  │
│  1. Import test │                  │  1. Launch       │
│  2. Setup mocks │                  │     browser      │
│  3. Run logic   │                  │  2. Navigate     │
│  4. Assertions  │                  │  3. Interact     │
│  5. Cleanup     │                  │  4. Assert       │
└────────┬────────┘                  │  5. Cleanup      │
         │                           └────────┬─────────┘
         │                                    │
         ├────────────────────────────────────┤
         │                                    │
         ▼                                    ▼
    ┌─────────┐                         ┌─────────┐
    │ PASS ✓  │                         │ PASS ✓  │
    └─────────┘                         └─────────┘
         │                                    │
         └────────────────┬───────────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ Test Report │
                   │             │
                   │ 56/56 PASS  │
                   └─────────────┘
```

## Storage Strategy Decision Tree

```
                    ┌──────────────────┐
                    │  User Logs In    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Trust Device?    │
                    └────────┬─────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
         ┌──────▼──────┐          ┌──────▼──────┐
         │     YES     │          │      NO     │
         │  (Trusted)  │          │ (Untrusted) │
         └──────┬──────┘          └──────┬──────┘
                │                        │
    ┌───────────▼───────────┐    ┌───────▼──────────┐
    │  Store in:            │    │  Store in:       │
    │  • localStorage       │    │  • sessionStorage│
    │                       │    │                  │
    │  Persists:            │    │  Persists:       │
    │  • Across restarts    │    │  • Current tab   │
    │  • Offline vault      │    │  • Offline vault │
    │                       │    │    (localStorage)│
    │  Security:            │    │                  │
    │  • User's device      │    │  Security:       │
    │  • Private computer   │    │  • Public device │
    └───────────────────────┘    │  • Shared PC     │
                                 └──────────────────┘
```

## Vault Synchronization State Machine

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VAULT SYNC STATE MACHINE                         │
└─────────────────────────────────────────────────────────────────────┘

                    ┌────────────┐
                    │   LOCKED   │
                    └─────┬──────┘
                          │ unlock
                          ▼
                    ┌────────────┐
          ┌─────────┤   CLEAN    │◄─────────┐
          │         └─────┬──────┘          │
          │               │ edit            │ save
          │ conflict      ▼                 │
          │         ┌────────────┐          │
          └────────►│   DIRTY    ├──────────┘
                    └─────┬──────┘
                          │ poll detects newer
                          ▼
                    ┌────────────┐
                    │  CONFLICT  │
                    └─────┬──────┘
                          │
              ┌───────────┴───────────┐
              │                       │
         ┌────▼────┐            ┌─────▼─────┐
         │ RELOAD  │            │ OVERWRITE │
         │ (lose)  │            │  (force)  │
         └────┬────┘            └─────┬─────┘
              │                       │
              └───────────┬───────────┘
                          │
                          ▼
                    ┌────────────┐
                    │   CLEAN    │
                    └────────────┘

States:
• LOCKED:   Vault encrypted, not accessible
• CLEAN:    Vault loaded, no local changes
• DIRTY:    Vault has unsaved local changes
• CONFLICT: Both local and server modified

Events:
• unlock:   Decrypt vault with key
• edit:     Modify vault entry
• save:     Upload encrypted vault
• poll:     Check for server updates
• reload:   Discard local, load server
• overwrite: Force save local to server
```

## Offline/Online State Transitions

```
┌─────────────────────────────────────────────────────────────────────┐
│                  CONNECTIVITY STATE DIAGRAM                         │
└─────────────────────────────────────────────────────────────────────┘

     ┌────────────────────────────────────────────────┐
     │             ONLINE MODE                        │
     │                                                │
     │  ✓ Full vault access                          │
     │  ✓ Save changes                               │
     │  ✓ Sync with server                           │
     │  ✓ Poll for updates (60s)                     │
     │  ✓ No warnings                                │
     └───────────┬────────────────────┬───────────────┘
                 │                    │
      Network    │                    │   Network
        down     │                    │   restored
                 ▼                    ▼
     ┌───────────────────┐  ┌────────────────────────┐
     │  TRANSITIONING    │  │    TRANSITIONING       │
     │      ↓            │  │         ↑              │
     │  Detecting...     │  │    Reconnecting...     │
     └───────────┬───────┘  └────────┬───────────────┘
                 │                   │
       Confirmed │                   │ Confirmed
          down   │                   │ restored
                 ▼                   ▼
     ┌────────────────────────────────────────────────┐
     │            OFFLINE MODE                        │
     │                                                │
     │  ✓ Read vault from cache                      │
     │  ✓ View entries                               │
     │  ✓ Search/filter                              │
     │  ⚠ Cannot save changes                        │
     │  ⚠ "Offline" indicator shown                  │
     │  ⚠ "Vault may be out of date" warning         │
     └────────────────────────────────────────────────┘
```

## Test Data Structure

```
/home/queinnec/Passkeys/
│
├── data/                          # Test data directory
│   ├── users.json                 # User credentials
│   │   └── [admin, auth_test, history_test, q]
│   │
│   ├── admin/                     # Admin user vault
│   │   ├── vault-init.vault      # Initial vault
│   │   └── vault-*.vault         # Historical versions
│   │
│   ├── auth_test/                 # Auth testing vault
│   │   └── vault-*.vault
│   │
│   └── history_test/              # History testing vault
│       └── vault-*.vault
│
├── tests/
│   ├── e2e/
│   │   ├── vault_situations.spec.ts    # 18 E2E tests
│   │   └── [other E2E tests]
│   │
│   ├── unit/
│   │   ├── vault_sync.test.ts          # 38 unit tests
│   │   └── [other unit tests]
│   │
│   ├── VAULT_TESTS.md             # Full documentation
│   ├── QUICK_REFERENCE.md         # Quick guide
│   └── run-vault-tests.sh         # Test runner script
│
└── VAULT_TESTING_SUMMARY.md      # Implementation summary
```

## Test Execution Timeline

```
┌──────────────────────────────────────────────────────────────────┐
│                    TEST EXECUTION TIMELINE                        │
│                      (npm run test:vault)                        │
└──────────────────────────────────────────────────────────────────┘

0s ────┬────────────────────────────────────────────────────► 120s
       │
       ├─ Initialize env (./init.sh -t)
       │  └─ Create test users & vaults
       │                                     [~2s]
       │
       ├─ Unit Tests (vitest)
       │  ├─ Timestamp logic ────────────►  [~0.5s]
       │  ├─ Storage logic ──────────────►  [~0.5s]
       │  ├─ Conflict detection ─────────►  [~0.5s]
       │  ├─ Polling mechanism ─────────►   [~0.5s]
       │  ├─ Priority logic ────────────►   [~0.5s]
       │  ├─ Metadata validation ───────►   [~0.5s]
       │  ├─ Bootstrap detection ───────►   [~0.5s]
       │  ├─ Offline transitions ───────►   [~0.5s]
       │  └─ State validation ──────────►   [~0.5s]
       │                            Total: ~5s
       │
       └─ E2E Tests (playwright)
          ├─ Safe device ────────────────►  [~15s]
          ├─ Unsafe device ──────────────►  [~10s]
          ├─ Vault presence ─────────────►  [~10s]
          ├─ Synchronization ────────────►  [~20s]
          ├─ Online/offline ─────────────►  [~25s]
          └─ Edge cases ─────────────────►  [~15s]
                                  Total: ~95s

Total Execution Time: ~100-120 seconds
```

## Coverage Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                        COVERAGE MATRIX                          │
├─────────────┬────────────┬──────────┬─────────┬────────────────┤
│  Category   │ Unit Tests │ E2E Tests│  Total  │  Status        │
├─────────────┼────────────┼──────────┼─────────┼────────────────┤
│ Trust       │     4      │    3     │    7    │  ✓ Complete    │
│ Presence    │     4      │    2     │    6    │  ✓ Complete    │
│ Sync        │     8      │    3     │   11    │  ✓ Complete    │
│ Mode        │     3      │    5     │    8    │  ✓ Complete    │
│ Edge Cases  │     4      │    3     │    7    │  ✓ Complete    │
│ Storage     │     8      │    2     │   10    │  ✓ Complete    │
│ Metadata    │     4      │    0     │    4    │  ✓ Sufficient  │
│ Other       │     3      │    0     │    3    │  ✓ Sufficient  │
├─────────────┼────────────┼──────────┼─────────┼────────────────┤
│   TOTAL     │    38      │   18     │   56    │  ✓ Excellent   │
└─────────────┴────────────┴──────────┴─────────┴────────────────┘

Legend:
✓ Complete   - All critical scenarios covered
✓ Sufficient - Adequate coverage for current needs
⚠ Partial    - Some gaps exist
✗ Inadequate - Needs more coverage
```

---

**Generated**: January 2025  
**Test Suite Version**: 1.0  
**Total Tests**: 56
