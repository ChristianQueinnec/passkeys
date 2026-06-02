# API Security Report — 2026-05-31 (final)

**Scope:** `src/routes/api/**`, `src/lib/server/**`, `src/hooks.server.ts`, `Dockerfile`
**Basis:** Full re-read of current source after all fix sessions of 2026-05-30 and 2026-05-31.

---

## 1 · Complete issue status

| ID | Title | Status |
|----|-------|--------|
| #1 | CSRF token keyed on full JWT | ✅ Fixed |
| #2 | Password migration race condition | ✅ Fixed |
| #3 | `getUserDir` creates directory on reads | ✅ Fixed |
| #4 | Token renewal has no CSRF check | ✅ Fixed |
| #5 | JWT signature comparison not timing-safe | ✅ Fixed |
| #6 | Missing `await` on `updateUserPassword` | ✅ Fixed |
| #7 | Test endpoint guard insufficient | ✅ Fixed |
| #8 | Cookie `maxAge` disagrees with JWT expiry | ✅ Fixed |
| #9 | CSRF store is process-local | ✅ Fixed — stateless HMAC double-submit |
| #10 | `listVaults` fd leak | ✅ Fixed |
| #11 | Body fully loaded before size check | ✅ Fixed |
| #12 | `sanitizeVaultContent` accepts any truthy JSON | ✅ Fixed |
| #13 | Logout has no auth or CSRF protection | ✅ Fixed — `verifyRequest({ csrf: true })`; client sends header |
| #14 | `getUsers()` disk read on every request | ✅ Fixed — module-level cache; invalidated on write |
| #15 | Request path logged verbatim | ✅ Fixed — control characters replaced with `_` before logging |
| #16 | All storage ops are synchronous | ✅ Fixed — rewritten with `fs/promises`; event loop unblocked |
| #17 | `saveVault` same-millisecond filename collision | ✅ Fixed — 4-byte random hex suffix added |
| #18 | `browser` import in server-only module | ✅ Fixed |
| #19 | Duplicate test endpoint handlers | ✅ Fixed |
| #20 | CSRF regex comment wrong, over-accepts | ✅ Fixed — `/^[0-9a-f]{64}$/`; redundant length check removed |
| #21 | `GET /api/vault` double-parses JSON | ✅ Fixed — raw `Response` with `Content-Type: application/json` |
| #22 | JWT `alg`/`typ` header not validated | ✅ Fixed — header parsed first; rejects `alg:none` and unexpected values |
| N1 | `verifyPassword` non-constant-time | ✅ Fixed — `timingSafeEqual` |
| N2 | (duplicate of #4) | ✅ Fixed |
| N3 | Rate-limiting ineffective behind reverse proxy | ⚠️ **Open** — deployment concern; see below |
| N4 | `users.json` no schema validation | ✅ Fixed — `Array.isArray` check in `getUsers` and `migrateUsersFile` |
| N5 | `SameSite=Lax` leaves future endpoints vulnerable | ⚠️ **Open** — consider `SameSite=Strict`; low priority now all endpoints have CSRF |
| N6 | Dockerfile bakes `JWT_SECRET=building` into image | ✅ Fixed — placeholder value; `.env` write moved to entrypoint |
| N7 | CSRF regex comment misleading | ✅ Fixed (same as #20) |
| N8 | Username not lowercased | ✅ Fixed — `toLowerCase()` in `sanitizeUsername`; regex tightened to `[a-z]` |
| N9 | `GET /api/vault` double-parses JSON | ✅ Fixed (same as #21) |
| N10 | `saveVault` same-millisecond collision | ✅ Fixed (same as #17) |

**All code issues resolved.  Two deployment/architecture notes remain.**

---

## 2 · Remaining open items (non-code)

### N3 · Rate-limiting ineffective behind a reverse proxy

`getClientAddress()` returns the socket-level peer address. Behind nginx, a cloud load-balancer, or Docker, this is always the proxy's IP — all users share one rate-limit bucket.

**Action required at deployment time:**
- Set `ADDRESS_HEADER=X-Forwarded-For` (or `X-Real-IP`) in the container environment **only when** the app sits behind a trusted proxy that sets this header.
- Alternatively, move rate-limiting to the reverse-proxy layer (nginx `limit_req`).
- Do **not** blindly trust `X-Forwarded-For` without a trusted-proxy check — an attacker can forge it to bypass rate-limiting.

### N5 · `SameSite=Lax` on auth cookie

All mutation endpoints now have CSRF protection, so `Lax` is not currently exploitable. However, `SameSite=Strict` would provide defence-in-depth: any future endpoint added without a CSRF check would be unexploitable from cross-site navigations.

**Suggested change** in `login/+server.ts` and `renew/+server.ts`:
```typescript
sameSite: 'strict'   // was 'lax'
```
Cost: users following an external link to the app will appear logged out and must re-authenticate once.

---

## 3 · Summary of all fixes applied

### Original report issues
- CSRF keyed on raw JWT (#1) — stable `sid` in JWT payload; CSRF map keyed on `sid`
- Password migration race condition (#2) — `migrateUsersFile()` locked; once-only at startup
- `getUserDir` side-effect directory creation (#3) — `getUserDir`/`ensureUserDir` split
- Token renewal had no CSRF check (#4) — `verifyCSRF()` helper; called in `renew`; client sends header
- JWT signature used plain `!==` (#5) — `timingSafeEqual` on decoded Buffers
- Missing `await` on `updateUserPassword` (#6)
- Test endpoint guard insufficient (#7) — single hook guard; `NODE_ENV === 'test'` allowlist
- Cookie `maxAge`/JWT `exp` misaligned (#8) — exported constants; session login gets explicit short `maxAge`
- CSRF store process-local (#9) — stateless HMAC double-submit; zero shared state
- `listVaults` fd leak (#10) — `try/finally` wraps close; now uses async file handle
- Body fully loaded before size check (#11) — streaming read; `Content-Length` fast-path
- `sanitizeVaultContent` accepted any truthy JSON (#12) — strict two-shape schema
- Logout required no auth or CSRF (#13) — `verifyRequest({ csrf: true })`; client sends header
- `getUsers()` disk read on every request (#14) — module-level cache; invalidated on every write
- Request path logged verbatim (#15) — control characters replaced with `_`
- All storage ops synchronous (#16) — rewritten with `fs/promises`
- Same-millisecond vault filename collision (#17) — 4-byte random hex suffix
- `browser` import in server-only module (#18)
- Duplicate test endpoint handlers (#19)
- CSRF regex wrong comment and over-accepts (#20) — `/^[0-9a-f]{64}$/`
- `GET /api/vault` double-parses JSON (#21) — raw `Response` with correct `Content-Type`
- JWT `alg`/`typ` header not validated (#22) — header decoded and checked before signature

### New issues found in 2026-05-31 review
- `verifyPassword` non-constant-time (N1) — `timingSafeEqual`; length guard
- Dockerfile bakes `JWT_SECRET=building` into image layer (N6) — placeholder; `.env` removed from `RUN` layer
- `users.json` parsed without schema validation (N4) — `Array.isArray` check added
- Username not lowercased — case-sensitive filesystem divergence (N8) — `toLowerCase()` in `sanitizeUsername`

---

*Report closed 2026-05-31. Previous reports: `APIsecurityReport.md` (original), `APIsecurityReport-20260530.md` (first revision).*
