# API Security & Code Review Report — 2026-05-30

**Scope:** `src/routes/api/**` and supporting server modules under `src/lib/server/`  
**Reviewer:** Independent analysis of current source code  
**Relation to prior report:** `APIsecurityReport.md` exists in this directory. Where an issue from that report has been **fully addressed** in the current code this is noted. New issues not present in the prior report are marked **[NEW]**.

---

## Summary table

| # | Severity | Area | File (line) | Title |
|---|----------|------|-------------|-------|
| 1 | **Critical** | Security | `csrf.ts:9` | CSRF token keyed on full JWT — token never rotates |
| 2 | **Critical** | Security | `users.ts:14-28` | Password migration writes file without lock |
| 3 | **High** | Security | `storage.ts:11-18` | `getUserDir` creates the directory for any sanitised username |
| 4 | **High** | Security | `renew/+server.ts` | Token renewal has no CSRF check |
| 5 | **High** | Security | `jwt.ts:122-134` | Signature comparison is not timing-safe |
| 6 | **High** | Bug | `user/password/+server.ts:40` | `updateUserPassword` is called without `await` |
| 7 | **High** | Security | `test/*` endpoints | Guard uses `NODE_ENV` — insufficient for staging/Docker |
| 8 | **Medium** | Security | `login/+server.ts:74` | Session cookie `maxAge` mismatch with JWT expiry |
| 9 | **Medium** | Security | `csrf.ts` | CSRF store is process-local; multi-process deployments silently broken |
| 10 | **Medium** | Bug | `storage.ts:22-37` | `listVaults` opens every file to read one byte — TOCTOU + resource leak |
| 11 | **Medium** | Bug | `sanitizer.ts:163-166` | Body size check after full read — OOM vector |
| 12 | **Medium** | Security | `sanitizer.ts:182-188` | `sanitizeVaultContent` accepts any truthy JSON — no schema |
| 13 | **Medium** | Security | `logout/+server.ts` | Logout does not require authentication or CSRF |
| 14 | **Medium** | Perf/Bug | `users.ts:14-28` | `getUsers()` reads and JSON-parses the file on every single request |
| 15 | **Medium** | Security | `hooks.server.ts` | Request path logged verbatim — log injection possible |
| 16 | **Medium** | Maintainability | `storage.ts` | All `fs` calls are synchronous — blocks Node.js event loop |
| 17 | **Low** | Bug | `storage.ts:57-62` | `saveVault` locks a file that does not yet exist — lock semantics unclear |
| 18 | **Low** | Security | `rate-limiter.ts:1` | `browser` import in a server-only module |
| 19 | **Low** | Maintainability | `test/cleanup-vault/+server.ts` | GET and POST handlers are identical |
| 20 | **Low** | Edge-case | `sanitizer.ts:99-108` | CSRF token regex rejects hex tokens (generated as hex by `csrf.ts`) |
| 21 | **Low** | Edge-case | `vault/+server.ts:15` | `GET /api/vault` double-parses JSON unnecessarily |
| 22 | **Low** | Maintainability | `jwt.ts` | Hand-rolled JWT instead of a vetted library |

---

## Detailed findings

---

### 1 · CRITICAL · CSRF token keyed on full JWT — token never rotates
**File:** `src/lib/server/csrf.ts:9`, `src/lib/server/auth.ts:56-68`

**What's wrong.**  
`generateCSRFToken(sessionId)` is called with the raw JWT as the `sessionId` key.  
`getSessionIdFromRequest` also returns the raw JWT.  
When the token is *renewed* (`/api/renew`), a brand-new JWT is generated — but the old CSRF token in the map (keyed on the old JWT) is never deleted, and the old JWT is accepted until it expires (up to 24 hours).  
Conversely, after renewal, the new JWT has no CSRF entry yet; the client must hit `/api/csrf` again, or mutation requests fail with 403. This is a usability cliff-edge that also creates a window where the old JWT + old CSRF pair can be replayed.

Additionally: using the entire JWT (up to ~250 chars) as a Map key is unnecessary; only the JWT's `iat`/`jti` is needed.

**Proposed fix.**
- Introduce a short opaque `sessionId` (e.g., `crypto.randomUUID()`) stored in the JWT payload.  
- Key the CSRF map on that `sessionId`.  
- In `/api/renew`, carry the `sessionId` forward into the new token, or explicitly evict the old entry and insert a new one atomically.

---

### 2 · CRITICAL · Password migration writes file without lock  [prior report issue — not yet fixed]
**File:** `src/lib/server/users.ts:14-28`

**What's wrong.**  
`getUsers()` is called on every single request (see finding #14). If two requests arrive simultaneously and the file contains plain-text passwords, both will enter the migration branch and call `fs.writeFileSync` concurrently without holding a lock. The second write can corrupt the file or silently drop a user record.

The comment `// Hope that this is atomic!` on line 26 confirms the author is aware of the risk.

`updateUserPassword` does acquire a lock, but `getUsers` does not; there is also no lock between the read inside `updateUserPassword` and the write (`getUsers()` is called again inside `updateUserPassword`, potentially after the outer lock is acquired by another caller).

**Proposed fix.**
```typescript
// In getUsers(): wrap the read-migrate-write block in a lockfile.lock call.
// Use lockfile.lock(USERS_FILE, { retries: 3 }) before any write.
// Or: perform migration once at startup (in hooks.server.ts) under a lock,
// and remove the migration logic from the hot path entirely.
```

---

### 3 · HIGH · `getUserDir` silently creates a directory for any authenticated username [NEW]
**File:** `src/lib/server/storage.ts:11-18`

**What's wrong.**  
```typescript
export const getUserDir = (username: string) => {
    let sanitizedUsername = sanitizeUsername(username);
    const userDir = path.join(DATA_DIR, sanitizedUsername);
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });   // ← creates on every call
    }
    return userDir;
};
```
Every call to `listVaults`, `getLatestVault`, `saveVault`, or `deleteVault` creates the user directory if it is absent. This means:

- **`GET /api/vault`** (read-only, unauthenticated from the storage perspective) creates an empty directory for any valid JWT bearer — even read-only GETs should not have write side effects.  
- If `sanitizeUsername` ever permits a username like `..` or an email with a dot sequence, `path.join` may resolve outside `DATA_DIR`. The current regex does permit dots.

**Proposed fix.**
- Move directory creation exclusively to a dedicated `createUserDir` function called only during user provisioning (or on first vault save).  
- Add a path-containment assertion: `assert(userDir.startsWith(DATA_DIR + path.sep))` and throw if not.

---

### 4 · HIGH · Token renewal endpoint has no CSRF check [NEW]
**File:** `src/routes/api/renew/+server.ts`

**What's wrong.**  
`POST /api/renew` issues a new JWT and a new CSRF token. It checks that the caller holds a valid JWT (via `getAuthPayload`) but does **not** verify a CSRF token. A malicious page that can trigger a cross-site POST to this endpoint (CSRF) can silently refresh the victim's session, extending it indefinitely.

Because `getAuthPayload` reads the cookie rather than an `Authorization` header, it is reachable from a third-party origin (cookies are sent automatically).

**Proposed fix.**
```typescript
// Change verifyRequest call to include csrf: true
const payload = await verifyRequest(request, { csrf: true });
```
Note: fixing finding #1 first is a prerequisite.

---

### 5 · HIGH · JWT signature comparison is not timing-safe [NEW]
**File:** `src/lib/server/jwt.ts:122-134`

**What's wrong.**  
```typescript
if (signature !== expectedSignature) {   // string equality — not constant-time
```
JavaScript's `===` operator on strings short-circuits on the first differing character, leaking timing information. In a local network or co-located attacker model this is exploitable to forge signatures incrementally.

**Proposed fix.**
```typescript
import { timingSafeEqual } from 'node:crypto';
const sigOk = timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
);
if (!sigOk) { ... }
```

---

### 6 · HIGH · `updateUserPassword` called without `await` [NEW]
**File:** `src/routes/api/user/password/+server.ts:40`

**What's wrong.**  
```typescript
const updatedUser = updateUserPassword(user.username, sanitizedNewPassword);
//                  ^^^^^^^^^^^^^^^^^ async function — Promise returned, not User
if (!updatedUser) {
    throw new Error('Failed to update password');
}
```
`updateUserPassword` is declared `async` in `users.ts`. Without `await`, `updatedUser` is always a `Promise` object (truthy), so the `if (!updatedUser)` guard never fires, errors are swallowed, and the response says "success" even if the disk write failed. The file lock acquired inside `updateUserPassword` is also never awaited, so subsequent operations may proceed before it is released.

**Proposed fix.**
```typescript
const updatedUser = await updateUserPassword(user.username, sanitizedNewPassword);
```

---

### 7 · HIGH · Test endpoint guard relies solely on `NODE_ENV` [prior report issue — partially fixed]
**File:** `src/routes/api/test/cleanup-vault/+server.ts`,  
         `src/routes/api/test/reset-rate-limit/+server.ts`

**What's fixed.** `cleanup-vault` now checks `NODE_ENV === 'production'` and returns 404.

**What remains.**  
`reset-rate-limit` uses a different condition:
```typescript
if (process.env.NODE_ENV !== 'development' && process.env.RATE_LIMIT_TEST_MODE !== 'true') {
```
This means that on a staging server (where `NODE_ENV` is often `'staging'` or `'test'`) neither condition is `'development'` but neither is `'production'`, so the endpoint is reachable. An attacker can reset the rate limiter to remove brute-force protection.

Furthermore, returning a 200 JSON body with `{ success: false }` (instead of 404) confirms to an attacker that the endpoint exists.

**Proposed fix.**
- Use a single, consistent guard across all test routes: `NODE_ENV === 'production'` → 404.
- Better: move all test routes behind a separate SvelteKit route group that is **not compiled** in the production build via a Vite plugin or `hooks.server.ts` guard.

---

### 8 · MEDIUM · `maxAge` on session cookie disagrees with JWT expiry [NEW]
**File:** `src/routes/api/login/+server.ts:74-80`

**What's wrong.**  
```typescript
cookies.set(AUTH_COOKIE_NAME, token, {
    maxAge: trustDevice ? 24 * 60 * 60 : undefined   // 24h or session cookie
});
```
The JWT itself always has `exp = now + TOKEN_EXPIRY_SECONDS` (24 hours, set in `jwt.ts:19`). When `trustDevice` is `false` the cookie is a session cookie (no `maxAge`) — it disappears when the browser closes — but the JWT inside it remains valid for 24 hours. If an attacker extracts the JWT (e.g., from browser memory, logs, or a MITM on HTTP in dev mode) before the browser closes, the token is replayable for up to 24 hours despite the "session" intent.

For `trustDevice = true`, the `maxAge` is 24 hours but the JWT expiry is also 24 hours — any skew in server clock between issuance and validation could cause the cookie to outlive or under-live the JWT.

**Proposed fix.**
- When `trustDevice` is false, set `exp` in the JWT to a much shorter window (e.g., 30 minutes) or issue a truly short-lived token with a refresh mechanism.
- Align `maxAge` precisely with `TOKEN_EXPIRY_SECONDS`.

---

### 9 · MEDIUM · CSRF store is process-local; broken with multiple workers [prior report — not yet fixed]
**File:** `src/lib/server/csrf.ts:5`

**What's wrong.**  
The `csrfTokens` Map lives in Node.js process memory. SvelteKit in production (and even `vite dev` with `--watch`) can spawn multiple worker processes. A CSRF token generated by worker A is invisible to worker B; the next request (handled by B) will get `validateCSRFToken → false`, returning 403.

The same applies to the in-memory rate-limiter cache: `inMemoryStats` in `rate-limiter.ts` is per-process, so each worker maintains its own failure count.

**Proposed fix.**  
Either:
- Run Node.js in single-process mode (set `adapter-node` worker count to 1) and document this constraint prominently, or
- Replace the in-memory CSRF map with a stateless HMAC-based double-submit pattern:  
  `csrfToken = HMAC(JWT_SECRET, sessionId)` — verifiable by any process, zero storage.

---

### 10 · MEDIUM · `listVaults` opens every file to read one byte — TOCTOU + fd leak [NEW]
**File:** `src/lib/server/storage.ts:22-37`

**What's wrong.**  
```typescript
const fd = fs.openSync(filePath, 'r');
const buffer = Buffer.alloc(1);
fs.readSync(fd, buffer, 0, 1, 0);
fs.closeSync(fd);
```
This runs inside a `.map()` over every vault file on every call to `listVaults`. Problems:

1. **File descriptor leak on error.** If `fs.readSync` throws (e.g., permissions error after open), `fs.closeSync` is never reached. No try/finally guard.
2. **TOCTOU.** The file is `stat`'d, then opened, then read in separate syscalls. Between `stat` and `open` the file could be deleted or replaced.
3. **Scalability.** A user with 1000 vaults triggers 1000 `openSync` + `readSync` + `closeSync` calls synchronously on the Node.js event loop for a single GET request.

**Proposed fix.**
```typescript
// Use fs.readFileSync with a small read and a try/finally, or read the
// first byte with: Buffer.from(fs.readFileSync(filePath)).slice(0,1)
// Wrap in try/finally to guarantee fd close.
// Consider caching the isCiphered flag alongside the filename.
```

---

### 11 · MEDIUM · Request body fully loaded before size check — OOM vector [prior report — not yet fixed]
**File:** `src/lib/server/sanitizer.ts:152-175`

**What's wrong.**  
```typescript
const text = await request.text();   // loads entire body into memory first
if (text.length > maxSize) {          // size check comes after
    throw new Error('Request body too large');
}
```
A client sending a 2 GB body will cause Node.js to allocate 2 GB of RAM before the check runs. The `Content-Length` header, if present, is never consulted.

**Proposed fix.**
```typescript
const contentLength = request.headers.get('content-length');
if (contentLength && parseInt(contentLength, 10) > maxSize) {
    throw new Error('Request body too large');
}
// Then stream-read with a byte counter, aborting at maxSize.
```

---

### 12 · MEDIUM · `sanitizeVaultContent` accepts any truthy JSON value [prior report — not yet fixed]
**File:** `src/lib/server/sanitizer.ts:182-188`

**What's wrong.**  
```typescript
if (vault /*&& vault.iv && vault.content*/) {
    return content;
}
throw new Error('Vault content is incorrect JSON');
```
The commented-out checks mean any non-falsy JSON value (`"hello"`, `42`, `[]`, `{}`) passes validation. An empty object `{}` or a JSON string `"x"` can be stored as a vault, later causing `JSON.parse(vault)` in `vault/+server.ts` to return a non-object silently.

The AGENTS.md spec states vaults are either a JSON object with an IV (ciphered) or an array of password entries (import). A proper schema check should enforce one of those two shapes.

**Proposed fix.**
```typescript
if (typeof vault === 'object' && vault !== null &&
    (Array.isArray(vault) || (typeof vault.iv === 'string' && typeof vault.content === 'string'))) {
    return content;
}
throw new Error('Vault content has unexpected structure');
```

---

### 13 · MEDIUM · Logout has no authentication or CSRF protection [NEW]
**File:** `src/routes/api/logout/+server.ts`

**What's wrong.**  
`POST /api/logout` deletes the auth cookie and removes the CSRF token. It does **not** verify that the caller is the authenticated user, nor does it check a CSRF token. Any page can issue:
```html
<img src="…" onload="" />
<!-- or a hidden form POST -->
```
…to silently log the victim out (logout CSRF). While the impact is lower than an action CSRF (no data modification), it is a denial-of-service on the user's session and may be chained with a session fixation attack.

`getAuthTokenFromRequest` is called but its return value is only used to look up the CSRF map — if the cookie is absent the logout still succeeds (deletes an already-absent cookie) without error.

**Proposed fix.**
- Require a valid JWT (call `getAuthUser`) before proceeding.  
- Require the CSRF token, or at minimum check `Origin`/`Referer` header against the expected host.

---

### 14 · MEDIUM · `getUsers()` reads and parses `users.json` on every request [NEW]
**File:** `src/lib/server/users.ts:14`, called from `auth.ts:getAuthUser`

**What's wrong.**  
Every authenticated API call reaches `getAuthUser → getUser → getUsers()`, which does:
```typescript
const content = fs.readFileSync(USERS_FILE, 'utf-8');
const users: User[] = JSON.parse(content);
```
…synchronously, on every request. With 10 concurrent users and 5 API calls each this is 50 synchronous disk reads per second, each blocking the event loop.

It also re-runs the migration check on every call, adding overhead even after all passwords are already hashed.

**Proposed fix.**
- Cache the user list in a module-level variable after the first load.  
- Invalidate the cache only inside `updateUserPassword` (after the write) and inside `getUsers` when a migration write occurs.  
- Alternatively, convert to `fs.promises.readFile` and cache the resulting Promise.

---

### 15 · MEDIUM · Request path logged verbatim — log injection [NEW]
**File:** `src/hooks.server.ts:13-16`

**What's wrong.**  
```typescript
logger.info({
    path: event.url.pathname,   // attacker-controlled
}, 'Incoming request');
```
A request to `/api/vault/%0a[CRITICAL]%20admin%20password%3d1234` will inject a newline (or structured-log field) into the log output. Depending on the log aggregation stack this can corrupt log entries or spoof audit records.

**Proposed fix.**
```typescript
// Sanitize or encode the path before logging:
path: event.url.pathname.replace(/[\r\n\t]/g, '_'),
// Or rely on the structured logger's field escaping (verify pino/winston behaviour).
```

---

### 16 · MEDIUM · All `storage.ts` file operations are synchronous [prior report — not yet fixed]
**File:** `src/lib/server/storage.ts`

`fs.readdirSync`, `fs.statSync`, `fs.readFileSync`, `fs.writeFileSync`, `fs.unlinkSync`, `fs.existsSync` — all blocking. Under any concurrent load these calls block the single Node.js event loop thread, causing all other in-flight requests to stall.

**Proposed fix.** Replace with `fs.promises` equivalents (`readdir`, `stat`, `readFile`, `writeFile`, `unlink`, `access`).

---

### 17 · LOW · `saveVault` locks a file before it exists [NEW]
**File:** `src/lib/server/storage.ts:57-62`

**What's wrong.**  
```typescript
const filename = `${timestamp}.vault`;
const filePath = path.join(userDir, filename);
release = await lockfile.lock(filePath, { realpath: false });
fs.writeFileSync(filePath, content);
```
`proper-lockfile` creates a `<file>.lock` directory as the lock mechanism. It requires the target file to exist when `realpath: true` (default), so `realpath: false` is used here. However, two concurrent saves for the same user at the same millisecond (unlikely but possible under load or in tests) generate the same `timestamp` filename and will race for the same lock file. The second write silently overwrites the first.

**Proposed fix.** Append a random suffix to the filename, or use `crypto.randomUUID()` instead of timestamp-only as the filename component.

---

### 18 · LOW · `browser` imported in a server-only module [NEW]
**File:** `src/lib/server/rate-limiter.ts:1`

**What's wrong.**  
```typescript
import { browser } from "$app/environment";
```
Files under `src/lib/server/` are, by convention, server-only. Importing `$app/environment` here is harmless at runtime because `browser` will always be `false` server-side, but it:
- Creates a dependency on the SvelteKit client runtime in a server module.
- Will cause confusing behaviour if the module is accidentally imported in a client context (e.g., during SSR with improper tree-shaking).

All `if (browser) return` guards are dead code on the server.

**Proposed fix.** Remove the `browser` import and all `if (browser) return/…` guards. Throw or log a warning instead, since these functions should simply never be called in a browser context.

---

### 19 · LOW · GET and POST in `cleanup-vault` are identical [prior report — not yet fixed]
**File:** `src/routes/api/test/cleanup-vault/+server.ts`

Both handlers are character-for-character identical. Extract into a single shared function.

---

### 20 · LOW · CSRF token regex rejects the actual token format [NEW]
**File:** `src/lib/server/sanitizer.ts:199-203`

**What's wrong.**  
`sanitizeCSRFToken` validates with:
```typescript
const csrfRegex = /^[a-zA-Z0-9-]+$/;
```
But `csrf.ts` generates tokens via:
```typescript
randomBytes(32).toString('hex')   // produces lowercase hex: [0-9a-f]+
```
Hex tokens only contain `[0-9a-f]`, which is a subset of the allowed regex, so this is actually fine for the current generator — but the comment says "UUID-like format: alphanumeric and dash" which is misleading and fragile. If the generator ever changes to base64 or UUID format, the regex will silently reject all tokens, causing 403 on every mutation request.

**Proposed fix.** Name the regex comment accurately: `// hex-encoded random bytes`, and add a test that round-trips a generated token through the sanitizer.

---

### 21 · LOW · `GET /api/vault` double-parses JSON [NEW]
**File:** `src/routes/api/vault/+server.ts:15`

**What's wrong.**  
```typescript
const vault = getLatestVault(user.username);   // returns string
return json(JSON.parse(vault));                 // parse to object, then re-serialise
```
`getLatestVault` returns the raw file contents as a UTF-8 string. `JSON.parse` deserialises it to an object, then SvelteKit's `json()` helper immediately `JSON.stringify`s it again. This round-trip is wasted CPU and, more importantly, can subtly corrupt data (e.g., keys with `undefined` values are dropped, `Date` strings remain strings but the intent might differ).

**Proposed fix.**
```typescript
// Return the raw string directly with the correct content-type:
return new Response(vault, {
    headers: { 'Content-Type': 'application/json' },
    status: 200
});
```

---

### 22 · LOW · Hand-rolled JWT implementation [prior report — partially noted]
**File:** `src/lib/server/jwt.ts`

The custom JWT is functional and avoids the `jsonwebtoken` prototype-pollution CVE history. However, it:
- Has no algorithm-agility protection (`"alg":"none"` not explicitly rejected in header validation).
- Does not validate the `alg` header claim (line 122 verifies the signature but never checks `header.alg === 'HS256'`).

An attacker who modifies `alg` in the header to a value the verifier ignores could potentially bypass signature checking if the code is refactored to switch on `alg`.

**Proposed fix.**  
Add explicit header validation after decoding:
```typescript
const header = JSON.parse(base64UrlDecode(encodedHeader));
if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    logger.warn('Unexpected JWT header');
    return null;
}
```

---

## Issues from the prior report — status update

| Prior issue | Status in current code |
|-------------|------------------------|
| Test endpoints exposed (Critical) | **Partially fixed** — `cleanup-vault` now checks `NODE_ENV === 'production'`. `reset-rate-limit` uses a weaker guard. See finding #7. |
| Race condition in password migration (Critical) | **Not fixed.** See finding #2. |
| JWT secret generation at startup (High) | **Fixed** — `jwt.ts` now throws at startup if `JWT_SECRET` is unset in production. |
| CSRF storage in memory (High) | **Not fixed.** See finding #9. |
| Path traversal in storage (High) | **Partially fixed** — `sanitizeUsername` in `getUserDir` prevents most traversal but no path-containment assertion exists. See finding #3. |
| Information disclosure in errors (Medium) | **Fixed** — `handleServerError` returns generic messages to clients, details only in dev. |
| Rate limiter file race (Medium) | **Fixed** — `proper-lockfile` is now used in `persistStatsToDisk`. |
| Timing attack in login (Low) | **Fixed** — dummy `verifyPassword` call and incremental delay added. |
| File ops on every request (High perf) | **Not fixed.** See finding #16. |
| Synchronous file operations (Medium perf) | **Not fixed.** See finding #16. |
| JSON parsing without size limit (Medium) | **Partially fixed** — `MAX_VAULT_SIZE` checked but *after* full read. See finding #11. |
| Vault content validation bypass (High) | **Not fixed.** Commented-out checks remain. See finding #12. |
| Username case sensitivity (Medium) | **Not fixed** — no normalisation to lowercase. |
| Large body loaded before size check (Medium) | **Not fixed.** See finding #11. |

---

## Priority action list

### Immediate (Critical/High)
1. **Finding #6** — Add `await` to `updateUserPassword` call. One-line fix, prevents silent data loss.  
2. **Finding #5** — Use `timingSafeEqual` for JWT signature check.  
3. **Finding #2** — Wrap password migration write in a lock.  
4. **Finding #4** — Add CSRF check to `/api/renew`.  
5. **Finding #1** — Introduce a stable `sessionId` in the JWT payload to decouple CSRF keys from JWT strings.

### Short-term (Medium)
6. **Finding #12** — Enforce vault schema (object with `iv+content`, or array).  
7. **Finding #13** — Require auth + CSRF on logout.  
8. **Finding #14** — Cache the user list; stop reading disk on every request.  
9. **Finding #11** — Check `Content-Length` header before reading body.  
10. **Finding #10** — Fix fd leak and TOCTOU in `listVaults`; use try/finally.  
11. **Finding #16** — Convert `storage.ts` to async `fs.promises` calls.  
12. **Finding #3** — Add `path.startsWith(DATA_DIR)` assertion; remove side-effect directory creation from read-only paths.

### Planned (Low)
13. **Finding #7** — Unify test-endpoint guards and consider build-time exclusion.  
14. **Finding #8** — Align cookie `maxAge` with JWT `exp`.  
15. **Finding #22** — Validate `alg` and `typ` in JWT header after decoding.  
16. **Finding #17** — Add random suffix to vault filenames to avoid same-millisecond collision.  
17. **Findings #18, #19, #20, #21** — Cleanup items (remove dead imports, deduplicate, fix misleading comments, avoid double-parse).

---

*Report generated 2026-05-30. Re-run after each fix cycle to track remediation.*
