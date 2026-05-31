# API Security Report — 2026-05-31

**Scope:** `src/routes/api/**`, `src/lib/server/**`, `src/hooks.server.ts`, `Dockerfile`
**Basis:** Full re-read of current source after the fix sessions of 2026-05-30.
**Purpose:** Track what has been fixed, what remains open, and document newly-found issues.

---

## 1 · Fix status of every issue from the 2026-05-30 report

| ID | Title | Status |
|----|-------|--------|
| #1 | CSRF token keyed on full JWT | ✅ **Fixed** — stable `sid` in JWT payload; CSRF map keyed on `sid` |
| #2 | Password migration writes file without lock | ✅ **Fixed** — `migrateUsersFile()` locked, once-only at startup; hot path is now a pure read |
| #3 | `getUserDir` creates directory on reads | ✅ **Fixed** — `getUserDir`/`ensureUserDir` split; only `saveVault` creates the directory |
| #4 | Token renewal has no CSRF check | ❌ **Still open** — `renew/+server.ts` calls `getAuthPayload` only; no CSRF token verified |
| #5 | JWT signature comparison not timing-safe | ❌ **Still open** — `signature !== expectedSignature` is still plain `!==` |
| #6 | `updateUserPassword` called without `await` | ✅ **Fixed** |
| #7 | Test endpoint guard insufficient | ✅ **Fixed** — single `hooks.server.ts` guard; `NODE_ENV === 'test'` allowlist; bare 404 with no body |
| #8 | Session cookie `maxAge` disagrees with JWT expiry | ❌ **Still open** |
| #9 | CSRF store is process-local | ❌ **Still open** — `csrfTokens` Map is still in-process memory |
| #10 | `listVaults` fd leak on `readSync` throw | ✅ **Fixed** — `try/finally` now wraps `closeSync` |
| #11 | Body fully loaded before size check | ❌ **Still open** — `request.text()` before length check in `sanitizeRequestBody` |
| #12 | `sanitizeVaultContent` accepts any truthy JSON | ❌ **Still open** — commented-out schema checks remain |
| #13 | Logout has no auth or CSRF protection | ❌ **Still open** |
| #14 | `getUsers()` disk read on every request | ⚠️ **Partially fixed** — migration removed from hot path; `getUsers()` still does `readFileSync` + `JSON.parse` on every authenticated request |
| #15 | Request path logged verbatim — log injection | ❌ **Still open** (mitigated in prod by pino's JSON serialisation; still raw in pino-pretty dev mode) |
| #16 | All `storage.ts` ops are synchronous | ❌ **Still open** |
| #17 | `saveVault` same-millisecond filename collision | ❌ **Still open** |
| #18 | `browser` import in server-only `rate-limiter.ts` | ✅ **Fixed** |
| #19 | GET and POST in `cleanup-vault` identical | ✅ **Fixed** — shared `handleCleanupVault` function |
| #20 | CSRF token regex comment misleading | ❌ **Still open** — comment still says "UUID-like"; hex-only tokens pass the regex but the mismatch is a maintenance trap |
| #21 | `GET /api/vault` double-parses JSON | ❌ **Still open** |
| #22 | JWT `alg`/`typ` header not validated | ❌ **Still open** |

**Summary:** 8 fixed, 1 partially fixed, 13 still open.

---

## 2 · New issues found in this review

---

### N1 · HIGH · `verifyPassword` uses non-constant-time string comparison
**File:** `src/lib/server/crypto-utils.ts:21`

```typescript
export const verifyPassword = async (password: string, hash: string, salt: string) => {
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return hash === derivedKey.toString('hex');   // ← plain === on strings
};
```

This is the same class of timing oracle as issue #5 in the JWT verifier. `===` on strings short-circuits on the first differing byte. An attacker who can make many login attempts at low latency can statistically distinguish a correct prefix from a wrong one, enabling an incremental offline attack against the stored hash.

The fix for login's rate-limiter slows individual attempts, but rate-limiting is per-IP and resets on success, so a distributed attacker is not fully stopped.

**Proposed fix:**
```typescript
import { timingSafeEqual } from 'node:crypto';

export const verifyPassword = async (password: string, hash: string, salt: string) => {
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const hashBuffer = Buffer.from(hash, 'hex');
    if (derivedKey.length !== hashBuffer.length) return false;
    return timingSafeEqual(derivedKey, hashBuffer);
};
```

---

### N2 · HIGH · `renew/+server.ts` has no CSRF protection (same as original #4, still unresolved)

This was reported as #4 on 2026-05-30. The code has not changed. Repeated here for priority visibility because fixing issue #1 (sid) was listed as a prerequisite — that prerequisite is now met, so this is unblocked and should be addressed immediately.

`POST /api/renew` extends the session of any user whose browser visits a page that silently POSTs to it (CSRF). Because the auth cookie has `sameSite: 'lax'`, cross-site top-level navigations include the cookie. A malicious link clicked by the victim extends their session indefinitely.

**Proposed fix:**
```typescript
// renew/+server.ts
const result = await verifyRequest(request, { csrf: true });
if (result instanceof Response) return result;
const user = result;
// carry sid forward from user's current JWT payload
```

---

### N3 · MEDIUM · Rate-limiting is ineffective behind a reverse proxy
**File:** `src/routes/api/login/+server.ts:20`, `src/lib/server/rate-limiter.ts`

`getClientAddress()` in SvelteKit returns the socket-level peer address. When the application runs behind a reverse proxy (nginx, Caddy, Docker, cloud load-balancer), this is always the proxy's IP. All users share a single rate-limit bucket and the first 5 failures from any user block every subsequent user — a trivial denial-of-service.

Conversely, if `X-Forwarded-For` is consumed without validation, an attacker can set `X-Forwarded-For: 1.2.3.4` to use a fresh bucket on every attempt, bypassing rate-limiting entirely.

The Dockerfile exposes port 3000 directly and does not configure a `TRUST_PROXY` mechanism. SvelteKit's `adapter-node` supports `ADDRESS_HEADER` env var to trust a specific header.

**Proposed fix:**
- Set `ADDRESS_HEADER=X-Forwarded-For` (or `X-Real-IP`) in the Docker environment **only when** the application is known to sit behind a trusted proxy.
- Alternatively, move rate-limiting to the reverse-proxy layer (nginx `limit_req`), which cannot be bypassed by header spoofing.
- Document this deployment requirement prominently.

---

### N4 · MEDIUM · `users.json` has no schema validation on load
**File:** `src/lib/server/users.ts:18`

```typescript
const content = fs.readFileSync(USERS_FILE, 'utf-8');
return JSON.parse(content) as User[];
```

`JSON.parse` is cast directly to `User[]` with no runtime validation. If the file is manually edited, truncated, or corrupted (e.g., by a partial write before the lock fix), `JSON.parse` may return a non-array, and the subsequent `.find()` call in `getUser` throws a `TypeError: users.find is not a function` that propagates to `getAuthUser` and makes every authenticated endpoint return 500 — a complete availability failure.

Worse, a malicious `users.json` entry with `password: null` or `password: ""` (no colon) would cause `user.password.split(':')` in `login/+server.ts` to throw, also producing a 500.

**Proposed fix:**
```typescript
const parsed = JSON.parse(content);
if (!Array.isArray(parsed)) {
    throw new Error('users.json is malformed: expected an array');
}
// Optionally: filter/validate each entry
return parsed as User[];
```

---

### N5 · MEDIUM · `SameSite=Lax` cookie + no CSRF on `/api/renew` widens CSRF surface
**File:** `src/routes/api/login/+server.ts:75`, `src/routes/api/renew/+server.ts`

The auth cookie is set with `sameSite: 'lax'`. `Lax` blocks cross-site subresource requests (images, iframes, XHR) but allows the cookie to be sent on **top-level cross-site navigations** — i.e., when the user clicks a link or submits a `<form method="POST">` from another origin.

`POST /api/renew` accepts the cookie and issues a new session without verifying a CSRF token. The combination means:
1. Attacker hosts a page with `<form action="https://passkeys.example/api/renew" method="POST"><input type="submit"></form>` auto-submitted via JS.
2. Victim visits the page; browser sends the auth cookie; session is extended.
3. The attacker now knows the victim's session will remain active longer than intended.

Changing to `sameSite: 'strict'` would close this entirely, at the cost of requiring re-login when arriving via an external link. Adding CSRF to `/api/renew` (issue #4 / N2) is the minimal fix.

**Proposed fix (pick one or both):**
- Change `sameSite: 'lax'` to `sameSite: 'strict'` — strongest protection, no CSRF possible.
- Add CSRF check to `/api/renew` (see N2) — retains `lax` behaviour for UX.

---

### N6 · MEDIUM · Dockerfile bakes a known `JWT_SECRET` into the image layer
**File:** `Dockerfile:12-13`

```dockerfile
RUN export JWT_SECRET=building ; \
    export NODE_ENV=production ; \
    npm run build
```

The value `JWT_SECRET=building` is used during the build. While it is overwritten at runtime by the `openssl rand` call, Docker image layers are immutable and inspectable:

```bash
docker history --no-trunc passkeys | grep building
# or: dive passkeys
```

Any party with read access to the image (Docker Hub, a private registry with broad access, a CI artefact store) can extract the build-time value. If the runtime `.env` generation step is ever skipped, misconfigured, or the container is started without running the entrypoint script (e.g., `docker run passkeys node build/index.js`), the hard-coded value `building` becomes the active JWT secret. All tokens can then be forged.

Additionally, `JWT_SECRET` is written to a `.env` file inside the container image's filesystem (`RUN echo "JWT_SECRET=..." > .env`), meaning the secret is present in the final image layer at a predictable path.

**Proposed fix:**
- Remove `JWT_SECRET=building` from the build command. The build does not need a real secret — add a conditional in `jwt.ts` that only throws on missing secret when a request is actually handled, not at module import time during build.
- Pass `JWT_SECRET` as a Docker runtime secret (`--secret` or Compose `secrets:`) rather than embedding it in the image at all.
- At minimum, document that `docker run passkeys node build/index.js` bypasses the entrypoint and will run with a predictable secret.

---

### N7 · LOW · `sanitizeCSRFToken` regex mismatch with actual token format (report #20, detail added)
**File:** `src/lib/server/sanitizer.ts:183-191`

The regex is `/^[a-zA-Z0-9-]+$/` (comment: "UUID-like format: alphanumeric and dash"). Tokens are generated as `randomBytes(32).toString('hex')` — 64 lowercase hex characters, no dashes. The regex over-accepts (allows dashes and uppercase that will never appear) and its comment is wrong.

This is not a security hole today, but it is a maintenance trap: if a developer sees the comment and assumes UUID format is required, they may change the generator to `randomUUID()`, which produces dashes — accepted by the regex. Conversely, if they change the regex to `/^[0-9a-f]{64}$/` to tighten it, they break UUID-format tokens. The comment and the implementation are in conflict with each other.

**Proposed fix:** Change the comment to `// 64-character lowercase hex string` and tighten the regex to `/^[0-9a-f]{64}$/`. Add a round-trip test.

---

### N8 · LOW · `users.json` not normalised for username case
**File:** `src/lib/server/users.ts:24`, `src/lib/server/sanitizer.ts:21-31`

`sanitizeUsername` is case-preserving. `getUser` does a case-sensitive `.find()`. On a case-insensitive filesystem (macOS HFS+, Windows NTFS, some Docker volumes), the user directory `Alice` and `alice` are the same on disk, but two separate `User` records could exist in `users.json`. An attacker who registers `ADMIN` on a case-insensitive deployment gets access to the `admin` user's vault directory. Conversely, a user who registers as `Alice` on macOS and then tries to log in as `alice` on a Linux deployment will be denied.

**Proposed fix:** Normalise all usernames to lowercase in `sanitizeUsername`, and enforce that `users.json` contains no duplicate lowercase usernames in `migrateUsersFile`.

---

### N9 · LOW · `vault/+server.ts` `GET` double-parses JSON (report #21, still open)
**File:** `src/routes/api/vault/+server.ts:17`

```typescript
return json(JSON.parse(vault));
```

`getLatestVault` returns the raw file string. `JSON.parse` deserialises it to a JS object; `json()` re-serialises it. This is wasted work and can subtly alter the data (e.g., large integers lose precision, `undefined` values are stripped). The fix is to return the raw string with the correct `Content-Type`.

---

### N10 · LOW · `saveVault` same-millisecond filename collision (report #17, still open)
**File:** `src/lib/server/storage.ts` — `saveVault`

Two concurrent `saveVault` calls in the same millisecond produce the same filename (timestamp-only). The `lockfile` lock with `realpath: false` serialises the writes but does not prevent the second write from overwriting the first — both will acquire locks on `<timestamp>.vault.lock` sequentially and write to the same file. One vault version is silently lost.

**Proposed fix:** Append a short random suffix: `` `${timestamp}-${crypto.randomBytes(4).toString('hex')}.vault` ``.

---

## 3 · Open issues consolidated — priority order

### Critical / unblocked (fix next)

| ID | File | Issue |
|----|------|-------|
| #4 / N2 | `renew/+server.ts` | POST renew has no CSRF check — prerequisite (#1) now fixed |
| #5 | `jwt.ts` | JWT signature uses `!==` not `timingSafeEqual` |
| N1 | `crypto-utils.ts` | `verifyPassword` uses `===` not `timingSafeEqual` |

### High

| ID | File | Issue |
|----|------|-------|
| N3 | `login/+server.ts`, `rate-limiter.ts` | Rate-limiting by socket IP fails behind a reverse proxy |
| #9 | `csrf.ts` | CSRF token store is process-local — broken with multiple workers |
| N5 | `login/+server.ts`, `renew/+server.ts` | `SameSite=Lax` + no CSRF on renew widens CSRF surface |
| N6 | `Dockerfile` | Build-time `JWT_SECRET=building` baked into image layer |

### Medium

| ID | File | Issue |
|----|------|-------|
| #8 | `login/+server.ts` | `maxAge` / JWT `exp` misaligned for non-trust-device sessions |
| #11 | `sanitizer.ts` | Body read entirely before size check — OOM vector |
| #12 | `sanitizer.ts` | `sanitizeVaultContent` accepts any truthy JSON, no schema |
| #13 | `logout/+server.ts` | Logout requires no authentication or CSRF |
| #14 | `users.ts` / `auth.ts` | `getUsers()` synchronous disk read on every authenticated request |
| #15 | `hooks.server.ts` | Request path logged verbatim (raw in dev/pino-pretty) |
| #16 | `storage.ts` | All storage operations are synchronous — blocks event loop |
| N4 | `users.ts` | `users.json` parsed with no schema/type validation |

### Low

| ID | File | Issue |
|----|------|-------|
| #17 / N10 | `storage.ts` | Same-millisecond vault filename collision |
| #20 / N7 | `sanitizer.ts` | CSRF regex comment wrong; regex over-accepts |
| #21 / N9 | `vault/+server.ts` | `GET /api/vault` double-parses JSON |
| #22 | `jwt.ts` | JWT `alg`/`typ` header not validated |
| N8 | `users.ts`, `sanitizer.ts` | Username not lowercased — case-sensitive filesystem divergence |

---

## 4 · Issues now fully resolved (no further action needed)

- CSRF keyed on raw JWT (was #1)
- Password migration race condition (was #2)
- `getUserDir` side-effect directory creation (was #3)
- Missing `await` on `updateUserPassword` (was #6)
- Test endpoint guard insufficient (was #7)
- `listVaults` file descriptor leak (was #10)
- `browser` import in server-only module (was #18)
- Duplicate test endpoint handlers (was #19)
- JWT secret absent in production fails silently (original report #3)
- Rate-limiter file write race condition (original report #7)
- Timing attack in login — dummy verification + incremental delay (original report #8)
- Error messages expose internals (original report #6)

---

*Report generated 2026-05-31. Previous reports: `APIsecurityReport.md` (original), `APIsecurityReport-20260530.md` (first revision).*
