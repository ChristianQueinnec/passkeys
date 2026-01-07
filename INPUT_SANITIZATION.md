# Input Sanitization Documentation

## Overview

All API endpoints in Passkeys implement comprehensive input sanitization to protect against:
- **Injection attacks** (SQL injection, command injection, etc.)
- **Path traversal attacks** (accessing files outside allowed directories)
- **Cross-Site Scripting (XSS)** (malicious scripts in user input)
- **Buffer overflow attacks** (excessively large inputs)
- **Malformed data** (invalid JSON, wrong data types)

## Sanitization Functions

### `sanitizeUsername(username: unknown): string`

Validates and sanitizes username input.

**Rules:**
- Must be a string
- Length: 3-50 characters
- Allowed characters: alphanumeric, underscore, hyphen, dot (`a-zA-Z0-9._-`)
- No path traversal attempts (`..`, `/`, `\`)
- Whitespace is trimmed

**Examples:**
```typescript
sanitizeUsername('john_doe')      // ✓ 'john_doe'
sanitizeUsername('user.123')      // ✓ 'user.123'
sanitizeUsername('ab')            // ✗ Too short
sanitizeUsername('../admin')      // ✗ Path traversal
sanitizeUsername('user@domain')   // ✗ Invalid character
```

### `sanitizePassword(password: unknown): string`

Validates password input.

**Rules:**
- Must be a string
- Length: 8-1000 characters
- All characters allowed (for passphrase flexibility)
- No trimming (preserves spaces)

**Examples:**
```typescript
sanitizePassword('SecureP@ss123')              // ✓
sanitizePassword('my secure passphrase')       // ✓
sanitizePassword('short')                      // ✗ Too short
```

### `sanitizeToken(token: unknown): string`

Validates authentication tokens (JWT/Base64).

**Rules:**
- Must be a string
- Length: 10-500 characters
- Base64 format only (`A-Za-z0-9+/=`)
- Whitespace is trimmed

**Examples:**
```typescript
sanitizeToken('dXNlcjpwYXNz')           // ✓
sanitizeToken('invalid!token')          // ✗ Invalid characters
```

### `sanitizeFilename(filename: unknown, requireJsonExtension?: boolean): string`

Validates filename input for vault files.

**Rules:**
- Must be a string
- Length: 1-255 characters
- Allowed characters: alphanumeric, dash, underscore, dot (`a-zA-Z0-9._-`)
- No path traversal (`..`, `/`, `\`, null bytes)
- Optional: must end with `.json`
- Whitespace is trimmed

**Examples:**
```typescript
sanitizeFilename('vault.json')               // ✓
sanitizeFilename('backup-2024.json')         // ✓
sanitizeFilename('../../../etc/passwd')      // ✗ Path traversal
sanitizeFilename('data/vault.json')          // ✗ Contains slash
sanitizeFilename('vault.txt', true)          // ✗ Must be .json
```

### `sanitizeVaultContent(content: unknown): string`

Validates encrypted vault content.

**Rules:**
- Must be a string
- Must be valid JSON
- Size limit: 10MB
- Not empty

**Examples:**
```typescript
sanitizeVaultContent('{"entries":[]}')       // ✓
sanitizeVaultContent('invalid json')         // ✗ Not valid JSON
sanitizeVaultContent('')                     // ✗ Empty
```

### `sanitizeCSRFToken(token: unknown): string`

Validates CSRF protection tokens.

**Rules:**
- Must be a string
- Length: 32-128 characters
- Allowed characters: alphanumeric and dash (`a-zA-Z0-9-`)
- Whitespace is trimmed

**Examples:**
```typescript
sanitizeCSRFToken('a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6')  // ✓
sanitizeCSRFToken('short')                                 // ✗ Too short
sanitizeCSRFToken('token_with_underscore')                 // ✗ Invalid character
```

### `sanitizeString(value: unknown, minLength?: number, maxLength?: number, fieldName?: string): string`

General-purpose string sanitizer with custom constraints.

**Parameters:**
- `value`: Value to sanitize
- `minLength`: Minimum length (default: 0)
- `maxLength`: Maximum length (default: 10000)
- `fieldName`: Field name for error messages (default: 'Field')

**Rules:**
- Must be a string
- Respects length constraints
- No null bytes
- Whitespace is trimmed

**Examples:**
```typescript
sanitizeString('test', 1, 10)                 // ✓
sanitizeString('ab', 3, 10, 'Username')       // ✗ 'Username must be between 3 and 10 characters'
sanitizeString('test\0value')                 // ✗ Contains null byte
```

## API Endpoint Protection

### `/api/login` (POST)

**Sanitized Inputs:**
- `username` → `sanitizeUsername()`
- `password` → `sanitizePassword()`

**Example Request:**
```typescript
POST /api/login
{
  "username": "john_doe",
  "password": "SecurePassword123"
}
```

### `/api/vault` (GET/POST)

**Sanitized Inputs:**
- `Authorization` header token → `sanitizeToken()`
- `X-CSRF-Token` header → `sanitizeCSRFToken()` (POST only)
- `content` field → `sanitizeVaultContent()` (POST only)

**Example Request:**
```typescript
POST /api/vault
Headers:
  Authorization: Bearer dXNlcjpwYXNz
  X-CSRF-Token: a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
Body:
{
  "content": "{\"entries\":[],\"folders\":[]}"
}
```

### `/api/user/password` (POST)

**Sanitized Inputs:**
- `Authorization` header token → `sanitizeToken()`
- `X-CSRF-Token` header → `sanitizeCSRFToken()`
- `oldPassword` → `sanitizePassword()`
- `newPassword` → `sanitizePassword()`

**Example Request:**
```typescript
POST /api/user/password
Headers:
  Authorization: Bearer dXNlcjpwYXNz
  X-CSRF-Token: a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
Body:
{
  "oldPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```

### `/api/vault/history` (GET/DELETE)

**Sanitized Inputs:**
- `Authorization` header token → `sanitizeToken()`
- `X-CSRF-Token` header → `sanitizeCSRFToken()` (DELETE only)
- `filename` query parameter → `sanitizeFilename()` (DELETE only)

**Example Request:**
```typescript
DELETE /api/vault/history?filename=vault-1234567890.json
Headers:
  Authorization: Bearer dXNlcjpwYXNz
  X-CSRF-Token: a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
```

## Error Handling

All sanitization functions throw descriptive errors when validation fails:

```typescript
try {
  const username = sanitizeUsername(userInput);
  // ... use sanitized username
} catch (error) {
  return json({ error: error.message }, { status: 400 });
}
```

**Common Error Messages:**
- `"Username must be a string"`
- `"Username must be between 3 and 50 characters"`
- `"Username contains invalid characters"`
- `"Password must be between 8 and 1000 characters"`
- `"Invalid token format"`
- `"Filename contains invalid characters"`
- `"Vault content must be valid JSON"`
- `"Invalid CSRF token format"`

## Security Benefits

### 1. **Path Traversal Prevention**
```typescript
// Blocked attempts:
sanitizeUsername('../../../etc/passwd')
sanitizeFilename('../../root/vault.json')
```

### 2. **Injection Attack Prevention**
```typescript
// Blocked attempts:
sanitizeUsername('admin; DROP TABLE users;')
sanitizeUsername('user<script>alert(1)</script>')
```

### 3. **Type Safety**
```typescript
// Blocked attempts:
sanitizeUsername(123)           // Not a string
sanitizePassword(null)          // Not a string
sanitizeToken(undefined)        // Not a string
```

### 4. **Size Limits**
```typescript
// Blocked attempts:
sanitizeUsername('a'.repeat(1000))      // Too long
sanitizeVaultContent('a'.repeat(11MB))  // Exceeds 10MB limit
```

### 5. **Format Validation**
```typescript
// Blocked attempts:
sanitizeToken('invalid!@#$')           // Not base64
sanitizeFilename('vault.txt', true)    // Not .json
sanitizeVaultContent('not json')       // Not valid JSON
```

## Testing

Comprehensive unit tests cover all sanitization functions:

**Location:** `/tests/unit/sanitizer.test.ts`

**Coverage:**
- Valid input acceptance
- Invalid input rejection
- Edge cases (empty, too long, too short)
- Type validation
- Character validation
- Path traversal attempts
- Whitespace handling
- Error message accuracy

**Run tests:**
```bash
npm run test tests/unit/sanitizer.test.ts
```

## Best Practices

1. **Always sanitize at the API boundary** - Don't trust client input
2. **Fail closed** - Reject invalid input rather than trying to fix it
3. **Use specific validators** - Don't use generic sanitizers for specific data
4. **Provide clear error messages** - Help legitimate users fix issues
5. **Log suspicious activity** - Track repeated validation failures
6. **Keep validators strict** - Start restrictive, loosen if needed
7. **Test thoroughly** - Include malicious input in test cases

## Integration Checklist

✅ All API endpoints sanitize user input  
✅ Authorization tokens validated  
✅ CSRF tokens validated  
✅ Filenames checked for path traversal  
✅ JSON content validated  
✅ Size limits enforced  
✅ Type checking on all inputs  
✅ Comprehensive unit tests  
✅ Error handling implemented  
✅ Security documentation complete  

## Future Enhancements

Potential improvements for even stronger security:

1. **Rate limiting** - Limit failed validation attempts per IP
2. **Input logging** - Track and alert on malicious input patterns
3. **Advanced CSRF** - Use signed tokens with expiration
4. **Content Security Policy** - Strengthen XSS protection
5. **Request signing** - Add HMAC signatures to requests
6. **Audit trail** - Log all sanitization failures with context

## References

- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)
