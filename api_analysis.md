# Passkeys API Code Analysis & Improvement Proposals

## Executive Summary

The Passkeys API is well-structured with good security practices including input sanitization, CSRF protection, and proper authentication. However, there are several areas for improvement in security, architecture, error handling, and maintainability.

---

## 🔴 Critical Issues

### 1. **Insecure Authentication Token Design**

**Location:** `src/routes/api/login/+server.ts`, `src/lib/server/auth.ts`

**Problem:**
```typescript
const token = Buffer.from(`${sanitizedUsername}:${user.password}`).toString('base64');
```

The authentication token is simply a base64-encoded `username:hashedPassword`. This has several serious issues:

- **No Signature:** Anyone can create valid tokens by base64-encoding username and hash
- **No Expiration:** Tokens never expire
- **Password Hash Exposure:** The hashed password is transmitted in every request
- **No Session Management:** No way to invalidate tokens without changing passwords

**Impact:** High - Major security vulnerability

**Recommendation:**
Use proper JWT tokens with:
- HMAC/RSA signature
- Expiration claims (`exp`)
- Issued-at claims (`iat`)
- Secret key storage
- Token revocation list

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_EXPIRY = '24h';

export function generateToken(username: string): string {
    return jwt.sign(
        { username, type: 'auth' },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
}

export function verifyToken(token: string): { username: string } | null {
    try {
        return jwt.verify(token, JWT_SECRET) as { username: string };
    } catch {
        return null;
    }
}
```

---

### 2. **CSRF Token Storage in Memory**

**Location:** `src/lib/server/csrf.ts`

**Problem:**
```typescript
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();
```

CSRF tokens are stored in a simple in-memory Map that:
- **Doesn't survive restarts:** All tokens invalidated on server restart
- **Doesn't scale:** Won't work with multiple server instances
- **Memory leaks possible:** Cleanup interval may not run in all environments

**Impact:** Medium - Operational issues, poor user experience

**Recommendation:**
- Use Redis for production
- Use proper session storage
- Add configurable storage backend

```typescript
interface TokenStore {
    set(key: string, value: any, ttl: number): Promise<void>;
    get(key: string): Promise<any>;
    delete(key: string): Promise<void>;
}

class RedisTokenStore implements TokenStore {
    // Redis implementation
}

class MemoryTokenStore implements TokenStore {
    // Memory implementation with better cleanup
}
```

---

### 3. **Path Traversal Vulnerability in File Operations**

**Location:** `src/lib/server/storage.ts`

**Problem:**
```typescript
export const getUserDir = (username: string) => {
    const userDir = path.join(DATA_DIR, username);
    // ...
}
```

While `sanitizeUsername()` checks for `..`, the storage layer doesn't validate that the resolved path is within `DATA_DIR`:

```typescript
const filePath = path.join(userDir, filename);
```

**Impact:** Medium - Could access files outside user directory if sanitization bypassed

**Recommendation:**
Always validate resolved paths:

```typescript
import path from 'path';
import fs from 'fs';

export const getUserDir = (username: string) => {
    const userDir = path.resolve(path.join(DATA_DIR, username));
    
    // Ensure resolved path is within DATA_DIR
    if (!userDir.startsWith(path.resolve(DATA_DIR))) {
        throw new Error('Invalid username - path traversal detected');
    }
    
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
};

export const getVault = (username: string, filename: string) => {
    const userDir = getUserDir(username);
    const filePath = path.resolve(path.join(userDir, filename));
    
    // Double-check resolved path is within user directory
    if (!filePath.startsWith(userDir)) {
        throw new Error('Invalid filename - path traversal detected');
    }
    
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
};
```

---

## 🟡 High Priority Issues

### 4. **Missing Rate Limiting**

**Location:** All API endpoints

**Problem:**
No rate limiting on any endpoints, including authentication. This enables:
- Brute force password attacks
- DoS attacks
- CSRF token exhaustion

**Recommendation:**
Implement rate limiting middleware:

```typescript
// src/lib/server/rate-limit.ts
import { json } from '@sveltejs/kit';

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(config: RateLimitConfig) {
    return (request: Request): Response | null => {
        const identifier = getClientIdentifier(request);
        const now = Date.now();
        const record = requestCounts.get(identifier);

        if (!record || record.resetAt < now) {
            requestCounts.set(identifier, {
                count: 1,
                resetAt: now + config.windowMs
            });
            return null;
        }

        if (record.count >= config.maxRequests) {
            return json(
                { error: 'Too many requests' },
                { 
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil((record.resetAt - now) / 1000))
                    }
                }
            );
        }

        record.count++;
        return null;
    };
}

// Usage in login endpoint
const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 });

export async function POST({ request }: RequestEvent) {
    const rateLimitResponse = loginRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
    // ... rest of login logic
}
```

---

### 5. **Inconsistent Error Messages Reveal Information**

**Location:** `src/routes/api/login/+server.ts`

**Problem:**
```typescript
return json({ error: 'Invalid credentials1' }, { status: 401 });
// ...
return json({ error: 'Invalid credentials2' }, { status: 401 });
```

Different error messages (with debugging numbers) reveal whether the username exists. This enables username enumeration attacks.

**Recommendation:**
Use identical error messages and timing:

```typescript
if (!user || !await verifyPassword(sanitizedPassword, hash, salt)) {
    // Add constant-time delay to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 100));
    return json({ error: 'Invalid credentials' }, { status: 401 });
}
```

---

### 6. **No Request Logging/Audit Trail**

**Location:** All API endpoints

**Problem:**
Only error logging exists. No audit trail for:
- Login attempts (successful/failed)
- Vault access/modifications
- Password changes
- Failed authorization attempts

**Recommendation:**
Implement structured logging:

```typescript
// src/lib/server/audit-log.ts
export interface AuditEvent {
    timestamp: Date;
    username?: string;
    action: string;
    resource: string;
    result: 'success' | 'failure';
    ip?: string;
    details?: Record<string, any>;
}

export function logAudit(event: AuditEvent): void {
    const logEntry = {
        ...event,
        timestamp: event.timestamp.toISOString()
    };
    
    // Log to file, database, or external service
    console.log('[AUDIT]', JSON.stringify(logEntry));
    
    // Could also write to audit.log file
    // fs.appendFileSync('data/audit.log', JSON.stringify(logEntry) + '\n');
}

// Usage:
logAudit({
    timestamp: new Date(),
    username: sanitizedUsername,
    action: 'login',
    resource: '/api/login',
    result: isValid ? 'success' : 'failure',
    ip: request.headers.get('x-forwarded-for') || 'unknown'
});
```

---

### 7. **Synchronous File Operations Block Event Loop**

**Location:** `src/lib/server/storage.ts`, `src/lib/server/users.ts`

**Problem:**
All file operations use synchronous functions:
```typescript
fs.readFileSync(USERS_FILE, 'utf-8');
fs.writeFileSync(path.join(userDir, filename), content);
```

This blocks the Node.js event loop, hurting performance under load.

**Recommendation:**
Use async file operations with `fs/promises`:

```typescript
import { readFile, writeFile, mkdir, readdir, stat, unlink } from 'fs/promises';

export const getUsers = async (): Promise<User[]> => {
    try {
        const content = await readFile(USERS_FILE, 'utf-8');
        const users: User[] = JSON.parse(content);
        
        let modified = false;
        for (const user of users) {
            if (user.password && !user.password.includes(':')) {
                user.password = await createHashedEntry(user.password);
                modified = true;
            }
        }
        
        if (modified) {
            await writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        }
        
        return users;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
};
```

---

## 🟢 Medium Priority Issues

### 8. **No Input Validation for Request Body Structure**

**Location:** Multiple endpoints

**Problem:**
Request bodies are parsed but not validated against expected schemas:
```typescript
const body = await sanitizeRequestBody(request);
const { username, password } = body as LoginRequest;
```

The `as LoginRequest` cast doesn't provide runtime validation. Unexpected fields or types can cause issues.

**Recommendation:**
Use runtime validation library like Zod:

```typescript
import { z } from 'zod';

const LoginRequestSchema = z.object({
    username: z.string().min(1).max(50),
    password: z.string().min(8).max(1000)
});

export async function POST({ request }: RequestEvent) {
    try {
        const body = await request.json();
        const validated = LoginRequestSchema.parse(body);
        // ... use validated.username, validated.password
    } catch (error) {
        if (error instanceof z.ZodError) {
            return json(
                { error: 'Invalid request', details: error.errors },
                { status: 400 }
            );
        }
        throw error;
    }
}
```

---

### 9. **Password Hashing Uses scrypt Without Proper Configuration**

**Location:** `src/lib/server/crypto-utils.ts`

**Problem:**
```typescript
const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
```

Using default scrypt parameters without explicit configuration. The memory cost, CPU cost, and parallelization are not specified.

**Recommendation:**
Use explicit parameters and consider Argon2id:

```typescript
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

// Explicit scrypt parameters
const SCRYPT_OPTIONS = {
    N: 16384,      // CPU/memory cost (2^14)
    r: 8,          // Block size
    p: 1,          // Parallelization
    maxmem: 32 * 1024 * 1024  // 32MB
};

export const hashPassword = async (password: string, salt: string) => {
    const derivedKey = await scrypt(
        password,
        salt,
        64,
        SCRYPT_OPTIONS
    ) as Buffer;
    return derivedKey.toString('hex');
};

// Or consider using Argon2id:
// import argon2 from 'argon2';
// 
// export const hashPassword = async (password: string) => {
//     return await argon2.hash(password, {
//         type: argon2.argon2id,
//         memoryCost: 2 ** 16,  // 64MB
//         timeCost: 3,
//         parallelism: 1
//     });
// };
```

---

### 10. **No Health Check Endpoint**

**Problem:**
No endpoint to verify service health for monitoring/load balancing.

**Recommendation:**
Add health check endpoint:

```typescript
// src/routes/api/health/+server.ts
import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
    try {
        // Check if data directory is accessible
        const dataDir = path.join(process.cwd(), 'data');
        await fs.access(dataDir);
        
        return json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.APP_VERSION || 'unknown'
        });
    } catch (error) {
        return json(
            {
                status: 'unhealthy',
                error: 'Data directory inaccessible',
                timestamp: new Date().toISOString()
            },
            { status: 503 }
        );
    }
}
```

---

### 11. **CORS Headers Not Configured**

**Problem:**
No CORS configuration. This will cause issues if frontend is hosted on different domain.

**Recommendation:**
Add CORS handling in hooks:

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    // Add CORS headers for API routes
    if (event.url.pathname.startsWith('/api')) {
        if (event.request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
                    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }
    }

    const response = await resolve(event);

    if (event.url.pathname.startsWith('/api')) {
        response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
};
```

---

### 12. **Missing Request Size Limits**

**Location:** `src/lib/server/sanitizer.ts`

**Problem:**
While `sanitizeVaultContent` checks size (10MB), there's no early size check on the request body itself. Large requests are fully buffered before validation.

**Recommendation:**
Add request size middleware:

```typescript
// Check content-length header before parsing body
export async function sanitizeRequestBody(
    request: Request,
    maxSize = 10 * 1024 * 1024
): Promise<any> {
    const contentLength = request.headers.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
        throw new Error('Request body too large');
    }
    
    // ... rest of validation
}
```

---

## 🔵 Low Priority / Quality Improvements

### 13. **Inconsistent Error Response Format**

**Problem:**
Some endpoints return `{ error: string }`, others might return different formats.

**Recommendation:**
Standardize error responses:

```typescript
interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: any;
    };
    timestamp: string;
    path: string;
}

export function errorResponse(
    code: string,
    message: string,
    status: number,
    details?: any
): Response {
    return json(
        {
            error: { code, message, details },
            timestamp: new Date().toISOString(),
            path: 'set-by-middleware'
        },
        { status }
    );
}
```

---

### 14. **No API Versioning**

**Problem:**
All endpoints at `/api/*` with no versioning strategy. Breaking changes would affect all clients.

**Recommendation:**
Add versioning:
```
/api/v1/login
/api/v1/vault
```

---

### 15. **Vault History Endpoint Uses DELETE with Body**

**Location:** `src/routes/api/vault/history/+server.ts`

**Problem:**
```typescript
const filenameRaw = url.searchParams.get('filename');
```

Actually uses query parameter, but this is semantically awkward for DELETE.

**Recommendation:**
Use path parameter:
```
DELETE /api/vault/history/{filename}
```

Or keep as is but document clearly.

---

### 16. **No Pagination for Vault History**

**Location:** `src/routes/api/vault/history/+server.ts`

**Problem:**
Returns all vault versions. Could be large for long-term users.

**Recommendation:**
Add pagination:

```typescript
export const GET: RequestHandler = async ({ request, url }) => {
    const result = await verifyRequest(request);
    if (result instanceof Response) return result;
    const user = result;

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    try {
        const allVaults = listVaults(user.username);
        const totalCount = allVaults.length;
        const vaults = allVaults.slice(offset, offset + limit);
        
        return json({
            vaults,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (e: any) {
        return json({ error: 'Internal error' }, { status: 500 });
    }
}
```

---

## Architecture Improvements

### 17. **Create Middleware Layer**

**Recommendation:**
Extract common logic into middleware:

```typescript
// src/lib/server/middleware.ts
import type { RequestHandler } from '@sveltejs/kit';

export function withAuth(handler: RequestHandler): RequestHandler {
    return async (event) => {
        const user = getAuthUser(event.request);
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        event.locals.user = user;
        return handler(event);
    };
}

export function withCSRF(handler: RequestHandler): RequestHandler {
    return async (event) => {
        if (!event.locals.user) {
            throw new Error('withCSRF requires withAuth');
        }
        
        const csrfToken = event.request.headers.get('X-CSRF-Token');
        const sessionId = getSessionIdFromRequest(event.request);
        
        if (!csrfToken || !sessionId || !validateCSRFToken(sessionId, csrfToken)) {
            return json({ error: 'Invalid CSRF token' }, { status: 403 });
        }
        
        return handler(event);
    };
}

// Usage:
export const POST = withAuth(withCSRF(async ({ locals }) => {
    const user = locals.user;
    // ... handler logic
}));
```

---

### 18. **Create Centralized Configuration**

**Recommendation:**
Extract magic numbers and configuration:

```typescript
// src/lib/server/config.ts
export const config = {
    jwt: {
        secret: process.env.JWT_SECRET || generateSecret(),
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    csrf: {
        tokenLifetime: 60 * 60 * 1000, // 1 hour
        cleanupInterval: 5 * 60 * 1000  // 5 minutes
    },
    rateLimit: {
        login: {
            windowMs: 15 * 60 * 1000,  // 15 minutes
            maxRequests: 5
        },
        api: {
            windowMs: 1 * 60 * 1000,   // 1 minute
            maxRequests: 100
        }
    },
    vault: {
        maxSize: 10 * 1024 * 1024,  // 10MB
        historyLimit: 100
    },
    password: {
        minLength: 8,
        maxLength: 1000
    }
};
```

---

## Testing Recommendations

### 19. **Add Integration Tests for Security**

Create tests for:
- Rate limiting behavior
- CSRF token validation
- Path traversal attempts
- Invalid token handling
- Session expiration

### 20. **Add Load Testing**

Test with:
- Concurrent vault saves
- Large vault files
- Multiple simultaneous users

---

## Summary of Priorities

### 🔴 **Critical (Fix Immediately)**
1. Insecure authentication token design
2. CSRF token storage
3. Path traversal validation

### 🟡 **High (Fix Soon)**
4. Rate limiting
5. Error message information leakage
6. Audit logging
7. Async file operations

### 🟢 **Medium (Plan to Fix)**
8. Request body validation
9. Password hashing configuration
10. Health check endpoint
11. CORS configuration
12. Request size limits

### 🔵 **Low (Nice to Have)**
13. Error response standardization
14. API versioning
15. Vault history DELETE semantics
16. Pagination
17. Middleware layer
18. Centralized configuration

---

## Implementation Roadmap

### Phase 1: Security Hardening (Week 1-2)
- Replace authentication with proper JWT
- Add rate limiting
- Fix path traversal validation
- Implement audit logging
- Fix error message leakage

### Phase 2: Reliability (Week 3-4)
- Convert to async file operations
- Add request validation with Zod
- Implement proper CSRF storage
- Add health check endpoint

### Phase 3: Quality (Week 5-6)
- Refactor to middleware pattern
- Standardize error responses
- Add CORS support
- Add pagination
- Centralize configuration

### Phase 4: Testing & Documentation
- Add security integration tests
- Load testing
- Update API documentation
- Security audit
