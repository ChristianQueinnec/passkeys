# JWT Authentication Migration Guide

## Overview

This document describes the migration from insecure base64-encoded tokens to secure JWT (JSON Web Token) authentication.

## What Changed

### Before (Insecure)
```typescript
// Login endpoint generated tokens like this:
const token = Buffer.from(`${username}:${hashedPassword}`).toString('base64');

// Auth verification decoded and compared:
const decoded = Buffer.from(token, 'base64').toString('utf-8');
const [username, passwordHash] = decoded.split(':');
```

**Problems:**
- ❌ No signature - anyone can forge tokens
- ❌ No expiration - tokens valid forever
- ❌ Password hash transmitted in every request
- ❌ No session management
- ❌ No way to invalidate tokens

### After (Secure)
```typescript
// Login endpoint generates JWT:
const token = generateToken(username);

// Auth verification validates JWT:
const payload = verifyToken(token);
if (payload) {
  const user = getUser(payload.username);
}
```

**Benefits:**
- ✅ HMAC-SHA256 signature prevents forgery
- ✅ 24-hour expiration (configurable)
- ✅ No password data in token
- ✅ Standard JWT format
- ✅ Issued-at and expiration claims
- ✅ Timezone-safe (uses Unix timestamps)

## JWT Structure

Our tokens follow the standard JWT format (RFC 7519):

```
header.payload.signature
```

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "username": "user123",
  "iat": 1704067200,     // Issued at (Unix timestamp)
  "exp": 1704153600      // Expires at (Unix timestamp, +24h)
}
```

**Signature:**
```
HMAC-SHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

## Security Improvements

### 1. Signature Verification
Every token is signed with a secret key using HMAC-SHA256. Any modification to the token invalidates the signature.

### 2. Expiration
Tokens automatically expire after 24 hours. After expiration, users must log in again.

### 3. Timing Attack Protection
The login endpoint now:
- Uses constant-time password comparison
- Adds a 100ms delay on failed login
- Performs dummy password verification even if user doesn't exist
- Returns identical error messages for all auth failures

### 4. No Sensitive Data
Tokens contain only the username and timestamps - no password hashes or other sensitive data.

## Configuration

### JWT Secret

The JWT secret is critical for security. Set it via environment variable:

```bash
# Generate a secure secret
openssl rand -hex 32

# Set in environment
export JWT_SECRET="your-generated-secret-here"
```

**Important:** 
- Use a cryptographically random secret (at least 32 bytes)
- Never commit secrets to version control
- Rotate secrets periodically
- If secret is compromised, all tokens become invalid

### Token Expiration

Default: 24 hours (86400 seconds)

To change, modify in `src/lib/server/jwt.ts`:
```typescript
const TOKEN_EXPIRY_SECONDS = 24 * 60 * 60; // Change as needed
```

## API Changes

### Login Response
No changes to the API response format - still returns `{ token, username }`:

```typescript
// Request
POST /api/login
{
  "username": "user",
  "password": "pass"
}

// Response (unchanged format, but token is now JWT)
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "user"
}
```

### Password Change Response
Returns a new JWT token after password change:

```typescript
// Response
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // New JWT
  "username": "user"
}
```

**Note:** Old tokens remain valid until their expiration time. This is intentional to avoid disrupting other active sessions.

## Client Impact

### No Changes Required
The client code doesn't need to change because:

1. ✅ Token is still sent in `Authorization: Bearer {token}` header
2. ✅ Login response format is unchanged
3. ✅ Token is still opaque to the client

### Optional Client Enhancements

Clients can now decode the JWT (without verification) to:

```typescript
// Decode JWT payload (client-side)
function decodeJWT(token: string) {
  const [, payloadB64] = token.split('.');
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
  return payload;
}

// Check expiration client-side
const payload = decodeJWT(token);
const expiresAt = new Date(payload.exp * 1000);
const isExpired = Date.now() > expiresAt;

// Proactively refresh token before expiration
if (Date.now() > (payload.exp - 3600) * 1000) {
  // Token expires in less than 1 hour - consider refreshing
}
```

## Migration Steps

### 1. Deploy Server Update
```bash
# Set JWT secret
export JWT_SECRET="$(openssl rand -hex 32)"

# Deploy new code
npm run build
npm run preview
```

### 2. Invalidate Old Tokens
All existing base64 tokens become invalid immediately after deployment. Users will need to log in again.

### 3. Monitor Logs
Check for authentication errors:
```bash
grep "AUTH" logs/app.log
grep "JWT" logs/app.log
```

### 4. Verify JWT Generation
Test the login endpoint:
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}'
```

Should return a JWT token (three base64-url-encoded parts separated by dots).

## Testing

Run the new JWT tests:
```bash
npm run test:unit tests/unit/jwt.test.ts
```

Expected: All 30+ JWT tests pass.

## Troubleshooting

### "Invalid signature" errors
- Check JWT_SECRET environment variable is set correctly
- Ensure secret hasn't changed between token generation and verification
- Verify no proxy/middleware is modifying the token

### "Token expired" errors
- Expected after 24 hours
- User needs to log in again
- Consider implementing token refresh if needed

### "Unauthorized" 401 errors
- Token may be malformed
- Check Authorization header format: `Bearer {token}`
- Verify token is being sent correctly

### Performance Issues
- JWT verification is fast (~0.1ms per token)
- No external dependencies or database lookups
- Signature verification is CPU-bound but minimal

## Future Enhancements

### Token Refresh
Add a refresh token mechanism:
```typescript
POST /api/refresh
Authorization: Bearer {token}

Response:
{
  "token": "new-jwt-token"
}
```

### Token Revocation
Implement a revocation list:
```typescript
// On logout or security event
addToRevocationList(tokenId);

// In verification
if (isRevoked(tokenId)) {
  return null;
}
```

### Shorter Expiration
For higher security environments:
```typescript
const TOKEN_EXPIRY_SECONDS = 1 * 60 * 60; // 1 hour
```

### Multiple Device Sessions
Add device fingerprinting to payload:
```typescript
{
  "username": "user",
  "device": "device-id",
  "iat": 1704067200,
  "exp": 1704153600
}
```

## Security Considerations

### Secret Management
- ✅ Use environment variables
- ✅ Rotate secrets periodically
- ✅ Use different secrets for dev/staging/prod
- ❌ Never hardcode secrets
- ❌ Never commit secrets to git

### Token Storage (Client)
- ✅ Store in memory for maximum security
- ✅ Use httpOnly cookies if implementing
- ⚠️ localStorage/sessionStorage acceptable for low-risk apps
- ❌ Never store in URL parameters

### Network Security
- ✅ Always use HTTPS in production
- ✅ Set secure headers (HSTS, etc.)
- ❌ Never send tokens over HTTP

## Rollback Plan

If issues arise, rollback is possible but will invalidate all active sessions:

1. Revert to previous commit
2. Redeploy
3. All users must log in again with old token format

**Note:** This is a breaking change for active sessions regardless of rollback.

## Summary

This migration significantly improves authentication security by:
- Preventing token forgery
- Adding automatic expiration
- Removing password data from tokens
- Following industry standards (JWT/RFC 7519)
- Maintaining client compatibility

Users will need to log in once after deployment, after which the system operates normally with improved security.
