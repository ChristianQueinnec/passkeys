# CSRF Protection Implementation

## Overview

Cross-Site Request Forgery (CSRF) protection has been implemented for all state-changing operations in Passkeys. This prevents malicious websites from making unauthorized requests on behalf of authenticated users.

## How It Works

### 1. Token Generation
- When a user logs in, a CSRF token is automatically generated
- The token is a cryptographically secure 32-byte random hex string
- Tokens are stored server-side with a 1-hour expiration
- Session ID is derived from the user's authentication token

### 2. Token Usage
- Client automatically fetches CSRF token after login
- All POST, PUT, DELETE requests include the token in `X-CSRF-Token` header
- Server validates the token before processing state-changing operations

### 3. Token Lifecycle
- **Generated**: On login or when first needed
- **Validated**: On every state-changing request
- **Expired**: After 1 hour of inactivity
- **Removed**: On logout
- **Cleanup**: Expired tokens are automatically removed every 5 minutes

## Protected Endpoints

### ✅ POST /api/vault
**Purpose**: Save vault data  
**Protection**: Requires valid CSRF token  
**Error**: 403 "Invalid CSRF token"

### ✅ POST /api/user/password
**Purpose**: Change user password  
**Protection**: Requires valid CSRF token  
**Error**: 403 "Invalid CSRF token"

### ✅ DELETE /api/vault/history
**Purpose**: Delete vault history  
**Protection**: Requires valid CSRF token  
**Error**: 403 "Invalid CSRF token"

## Unprotected Endpoints

### GET /api/vault
**Purpose**: Retrieve vault data  
**Why**: Read-only operation, no state change

### GET /api/vault/history
**Purpose**: List vault history  
**Why**: Read-only operation, no state change

### POST /api/login
**Purpose**: User authentication  
**Why**: No existing session to protect (creates new session)

### GET /api/csrf
**Purpose**: Get CSRF token  
**Why**: Required to bootstrap CSRF protection

## Client-Side Implementation

### Automatic Token Management

The API client (`src/lib/api.ts`) automatically handles CSRF tokens:

```typescript
// Token is fetched after login
await api.login(username, password);
// CSRF token is now available

// Token is automatically included in requests
await api.saveVault(content);          // ✅ Includes CSRF token
await api.changePassword(old, new);    // ✅ Includes CSRF token
await api.deleteVault(filename);       // ✅ Includes CSRF token
```

### Token Refresh

If a CSRF token is missing, it's automatically fetched:

```typescript
if (!this.csrfToken) {
    await this.getCSRFToken();
}
```

## Server-Side Implementation

### Token Validation Pattern

All protected endpoints follow this pattern:

```typescript
export async function POST({ request }) {
    // 1. Authenticate user
    const user = getAuthUser(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Validate CSRF token
    const csrfToken = request.headers.get('X-CSRF-Token');
    const sessionId = getSessionIdFromRequest(request);
    
    if (!sessionId || !csrfToken || !validateCSRFToken(sessionId, csrfToken)) {
        return json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    // 3. Process request
    // ...
}
```

## Security Features

### 1. Cryptographically Secure Tokens
- Generated using Node.js `crypto.randomBytes(32)`
- 256-bit entropy makes tokens unpredictable

### 2. Server-Side Validation
- Tokens never exposed to client storage (except in memory)
- Server-side verification prevents token forgery
- Timing-safe comparison (implicit in Map lookup)

### 3. Token Expiration
- 1-hour lifetime limits window of vulnerability
- Automatic cleanup prevents memory leaks

### 4. Session Binding
- Tokens bound to authentication session
- Can't reuse token across different sessions

### 5. Defense in Depth
- Works alongside CORS (if configured)
- Complements authentication requirements
- Protects against malicious third-party sites

## Attack Scenarios Prevented

### ❌ CSRF Attack (Without Protection)
```
1. User logs into Passkeys (passkeys.example.com)
2. User visits malicious site (evil.com)
3. Evil.com makes POST request to passkeys.example.com/api/vault
4. Browser includes authentication cookie/token
5. Vault is saved with malicious content ⚠️
```

### ✅ CSRF Attack (With Protection)
```
1. User logs into Passkeys (passkeys.example.com)
2. User visits malicious site (evil.com)
3. Evil.com makes POST request to passkeys.example.com/api/vault
4. Browser includes authentication, but NO CSRF token
5. Server rejects request: "Invalid CSRF token" ✅
```

## Error Handling

### Client-Side
```typescript
try {
    await api.saveVault(content);
} catch (e) {
    if (e.message.includes('CSRF')) {
        // Token expired or invalid
        // Automatic retry with new token
        await api.getCSRFToken();
        await api.saveVault(content);
    }
}
```

### Server-Side Error Responses
- **403 Forbidden**: Invalid or missing CSRF token
- **401 Unauthorized**: Not authenticated
- **400 Bad Request**: Malformed request

## Testing CSRF Protection

### Test 1: Valid Request
```bash
# Login
TOKEN=$(curl -X POST http://localhost:5173/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  | jq -r .token)

# Get CSRF token
CSRF=$(curl http://localhost:5173/api/csrf \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r .csrfToken)

# Make protected request (should succeed)
curl -X POST http://localhost:5173/api/vault \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{"content":"..."}'
```

### Test 2: Missing CSRF Token
```bash
# Make protected request without CSRF token (should fail)
curl -X POST http://localhost:5173/api/vault \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"..."}'

# Expected: 403 "Invalid CSRF token"
```

### Test 3: Invalid CSRF Token
```bash
# Make protected request with wrong token (should fail)
curl -X POST http://localhost:5173/api/vault \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: invalid-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"content":"..."}'

# Expected: 403 "Invalid CSRF token"
```

## Maintenance

### Token Cleanup
Expired tokens are automatically cleaned up every 5 minutes:
```typescript
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, data] of csrfTokens.entries()) {
        if (data.expiresAt < now) {
            csrfTokens.delete(sessionId);
        }
    }
}, 5 * 60 * 1000);
```

### Production Considerations

⚠️ **Current Implementation Uses In-Memory Storage**

For production, consider:
1. **Redis**: Distributed token storage for multiple servers
2. **Database**: Persistent token storage
3. **Signed Tokens**: Self-validating JWT-style tokens
4. **Rate Limiting**: Prevent token exhaustion attacks

Example Redis implementation:
```typescript
import Redis from 'ioredis';
const redis = new Redis();

export async function generateCSRFToken(sessionId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await redis.setex(`csrf:${sessionId}`, 3600, token);
    return token;
}
```

## Best Practices

1. ✅ Always validate CSRF tokens for state-changing operations
2. ✅ Use cryptographically secure random token generation
3. ✅ Bind tokens to user sessions
4. ✅ Implement token expiration
5. ✅ Clean up expired tokens
6. ✅ Return clear error messages (403 for CSRF failures)
7. ✅ Log CSRF validation failures for security monitoring

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [SvelteKit Security Best Practices](https://kit.svelte.dev/docs/security)
