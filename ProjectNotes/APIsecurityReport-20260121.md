# API Security & Code Analysis Report

## Executive Summary

This report analyzes the Passkeys application's server API code (`src/routes/api`) for security vulnerabilities, bugs, performance issues, maintainability problems, and edge cases. The analysis identified **24 issues** across different severity levels, with **2 critical issues** requiring immediate attention.

## Critical Issues

### 1. **CRITICAL - Test Endpoints Exposed in Production**
- **Location:** `src/routes/api/test/cleanup-vault/+server.ts`, `src/routes/api/test/reset-rate-limit/+server.ts`
- **Severity:** Critical
- **Issue:** Test endpoints are accessible without authentication and can delete all user vaults or reset rate limiting
- **Impact:** Complete data loss, security bypass
- **Proposed Fix:** 
```typescript
// Add environment check at top of each test endpoint
if (process.env.NODE_ENV === 'production') {
    return json({ error: 'Not found' }, { status: 404 });
}
```

### 2. **CRITICAL - Race Condition in User Password Migration**
- **Location:** `src/lib/server/users.ts:15-25`
- **Severity:** Critical
- **Issue:** Multiple concurrent requests can trigger password migration simultaneously, causing file corruption
- **Impact:** User lockout, data corruption
- **Proposed Fix:** Add file locking or atomic operations for user file updates

### 3. **HIGH - JWT Secret Generation in Production**
- **Location:** `src/lib/server/jwt.ts:8-12`
- **Severity:** High
- **Issue:** If JWT_SECRET is not set, a random secret is generated, invalidating all tokens on restart
- **Impact:** All users logged out on server restart
- **Proposed Fix:** Fail fast if JWT_SECRET is not set in production

## Security Issues

### 4. **HIGH - CSRF Token Storage in Memory**
- **Location:** `src/lib/server/csrf.ts:5`
- **Severity:** High
- **Issue:** CSRF tokens stored in memory are lost on server restart, breaking active sessions
- **Impact:** Users need to refresh to get new CSRF tokens
- **Proposed Fix:** Use persistent storage (Redis/database) or make tokens stateless

### 5. **HIGH - Path Traversal in Storage Functions**
- **Location:** `src/lib/server/storage.ts:13-18`
- **Severity:** High
- **Issue:** `getUserDir()` doesn't validate username, allowing path traversal like `../../../etc`
- **Impact:** Access to arbitrary filesystem locations
- **Proposed Fix:** Add username validation in `getUserDir()`

### 6. **MEDIUM - Information Disclosure in Error Messages**
- **Location:** Multiple files (e.g., `src/routes/api/vault/+server.ts:15`)
- **Severity:** Medium
- **Issue:** Generic "Internal error" messages don't help debugging, but detailed errors could leak info
- **Impact:** Harder debugging vs information disclosure
- **Proposed Fix:** Log detailed errors server-side, return generic messages to client

### 7. **MEDIUM - Rate Limiter File Race Condition**
- **Location:** `src/lib/server/rate-limiter.ts:25-35, 40-50`
- **Severity:** Medium
- **Issue:** Concurrent read/write operations on rate limiter stats file can cause corruption
- **Impact:** Rate limiting bypass or false positives
- **Proposed Fix:** Use file locking or atomic operations

### 8. **LOW - Timing Attack in Login**
- **Location:** `src/routes/api/login/+server.ts:42-48`
- **Severity:** Low
- **Issue:** Despite dummy verification, timing differences might still leak user existence
- **Impact:** Username enumeration
- **Proposed Fix:** Use constant-time comparison and ensure identical execution paths

## Performance Issues

### 9. **HIGH - File System Operations on Every Request**
- **Location:** `src/lib/server/storage.ts:22-40` (listVaults)
- **Severity:** High
- **Issue:** `listVaults()` reads directory and stats every file on each call
- **Impact:** Poor performance with many vault files
- **Proposed Fix:** Implement caching with file system watchers

### 10. **MEDIUM - Synchronous File Operations**
- **Location:** `src/lib/server/storage.ts` (multiple functions)
- **Severity:** Medium
- **Issue:** All file operations are synchronous, blocking the event loop
- **Impact:** Server becomes unresponsive under load
- **Proposed Fix:** Use async file operations (`fs.promises`)

### 11. **MEDIUM - JSON Parsing Without Size Limits**
- **Location:** `src/routes/api/vault/+server.ts:14`
- **Severity:** Medium
- **Issue:** `JSON.parse(vault)` on potentially large vault files without streaming
- **Impact:** Memory exhaustion with large vaults
- **Proposed Fix:** Stream parsing or enforce size limits before parsing

### 12. **LOW - Inefficient Vault Sorting**
- **Location:** `src/lib/server/storage.ts:35-36`
- **Severity:** Low
- **Issue:** Sorts all vaults by date even when only latest is needed
- **Impact:** Unnecessary CPU usage
- **Proposed Fix:** Add `getLatestVaultMetadata()` function that finds max without sorting

## Maintainability Issues

### 13. **MEDIUM - Inconsistent Error Handling**
- **Location:** Multiple files
- **Severity:** Medium
- **Issue:** Some endpoints catch all errors, others don't; inconsistent error response formats
- **Impact:** Debugging difficulty, inconsistent API behavior
- **Proposed Fix:** Standardize error handling middleware

### 14. **MEDIUM - Magic Numbers and Hardcoded Values**
- **Location:** `src/lib/server/sanitizer.ts` (various limits), `src/lib/server/rate-limiter.ts:55-57`
- **Severity:** Medium
- **Issue:** Hardcoded limits (50 chars, 10MB, etc.) without configuration
- **Impact:** Difficult to tune for different deployments
- **Proposed Fix:** Move to configuration file or environment variables

### 15. **LOW - Duplicate Code in Test Endpoints**
- **Location:** `src/routes/api/test/cleanup-vault/+server.ts`
- **Severity:** Low
- **Issue:** GET and POST handlers have identical implementation
- **Impact:** Code duplication
- **Proposed Fix:** Extract common logic to shared function

### 16. **LOW - Inconsistent Naming**
- **Location:** `src/lib/server/requestTypes.ts:35-40`
- **Severity:** Low
- **Issue:** `LatestVaultResponse` type doesn't match actual response (returns parsed JSON, not metadata)
- **Impact:** Type confusion
- **Proposed Fix:** Rename or fix type definition

## Edge Cases & Input Validation

### 17. **HIGH - Vault Content Validation Bypass**
- **Location:** `src/lib/server/sanitizer.ts:130-140`
- **Severity:** High
- **Issue:** Vault validation only checks if JSON is parseable and has truthy value, not actual structure
- **Impact:** Invalid vault data can be stored
- **Proposed Fix:** Implement proper vault schema validation

### 18. **MEDIUM - Username Case Sensitivity**
- **Location:** `src/lib/server/users.ts:25`
- **Severity:** Medium
- **Issue:** Username lookup is case-sensitive, but filesystem might not be
- **Impact:** Potential user conflicts on case-insensitive filesystems
- **Proposed Fix:** Normalize usernames to lowercase

### 19. **MEDIUM - Large Request Body Handling**
- **Location:** `src/lib/server/sanitizer.ts:155-175`
- **Severity:** Medium
- **Issue:** `request.text()` loads entire body into memory before size check
- **Impact:** Memory exhaustion with large requests
- **Proposed Fix:** Check Content-Length header first

### 20. **LOW - Empty Vault List Handling**
- **Location:** `src/routes/api/vault/metadata/+server.ts:9`
- **Severity:** Low
- **Issue:** Returns `null` for mtime when no vaults exist, but type suggests string
- **Impact:** Type inconsistency
- **Proposed Fix:** Return consistent type or update interface

### 21. **LOW - File Extension Case Sensitivity**
- **Location:** `src/lib/server/storage.ts:23`
- **Severity:** Low
- **Issue:** Filter for `.vault` files is case-sensitive
- **Impact:** Files with `.VAULT` or `.Vault` would be ignored
- **Proposed Fix:** Use case-insensitive comparison

## Additional Observations

### 22. **MEDIUM - No Request Size Limits at Server Level**
- **Severity:** Medium
- **Issue:** No global request size limits, only in individual sanitizers
- **Impact:** DoS via large requests
- **Proposed Fix:** Add server-level request size limits

### 23. **LOW - Missing Content-Type Validation**
- **Location:** Multiple POST endpoints
- **Severity:** Low
- **Issue:** Only `sanitizeRequestBody` checks Content-Type, but it's not used everywhere
- **Impact:** Inconsistent API behavior
- **Proposed Fix:** Standardize Content-Type validation

### 24. **LOW - No Request Logging**
- **Severity:** Low
- **Issue:** No structured logging of API requests for monitoring/debugging
- **Impact:** Difficult to debug issues in production
- **Proposed Fix:** Add request logging middleware

## Issue Summary by Severity

| Severity | Count | Issues |
|----------|-------|---------|
| **Critical** | 2 | Test endpoints exposed, Race condition in user migration |
| **High** | 4 | JWT secret handling, CSRF storage, Path traversal, File operations performance |
| **Medium** | 8 | Error handling, Rate limiter races, Username case sensitivity, etc. |
| **Low** | 10 | Code duplication, Type inconsistencies, Edge cases |
| **Total** | **24** | |

## Immediate Action Items

### Priority 1 (Critical - Fix Immediately)
1. **Disable test endpoints in production** - Add environment checks
2. **Fix race conditions in user file operations** - Implement file locking

### Priority 2 (High - Fix Soon)
3. **Implement proper JWT secret handling** - Fail fast if not configured
4. **Add input validation for usernames** - Prevent path traversal in storage
5. **Implement caching for file system operations** - Improve performance

### Priority 3 (Medium - Plan for Next Sprint)
6. **Standardize error handling** - Create consistent error middleware
7. **Move hardcoded values to configuration** - Make limits configurable
8. **Fix CSRF token persistence** - Use stateless tokens or persistent storage

## Security Best Practices Recommendations

1. **Input Validation**: Implement comprehensive input validation at API boundaries
2. **Error Handling**: Standardize error responses and logging
3. **Rate Limiting**: Fix race conditions and consider distributed rate limiting
4. **Authentication**: Ensure JWT secrets are properly managed
5. **File Operations**: Use async operations and implement proper access controls
6. **Monitoring**: Add structured logging and monitoring for security events

## Conclusion

The Passkeys API has a solid foundation with good security practices like input sanitization, CSRF protection, and rate limiting. However, the critical issues around test endpoint exposure and race conditions need immediate attention. The high-severity performance issues with file operations should also be addressed soon to ensure the application scales properly.

Most issues are fixable with targeted improvements rather than architectural changes, indicating the codebase is generally well-structured but needs security and performance hardening for production use.