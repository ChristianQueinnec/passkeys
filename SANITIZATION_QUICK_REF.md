# Input Sanitization Quick Reference

Quick reference guide for developers working with the Passkeys API sanitization system.

## Quick Import

```typescript
import {
    sanitizeUsername,
    sanitizePassword,
    sanitizeToken,
    sanitizeFilename,
    sanitizeVaultContent,
    sanitizeCSRFToken,
    sanitizeString
} from '$lib/server/sanitizer';
```

## Common Patterns

### Basic API Endpoint Pattern

```typescript
export async function POST({ request }: RequestEvent) {
    try {
        // 1. Parse request body
        const body = await request.json();
        const { field1, field2 } = body;

        // 2. Validate required fields
        if (!field1 || !field2) {
            return json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 3. Sanitize inputs
        let sanitizedField1, sanitizedField2;
        try {
            sanitizedField1 = sanitizeUsername(field1);
            sanitizedField2 = sanitizePassword(field2);
        } catch (sanitizeError: any) {
            return json({ error: sanitizeError.message }, { status: 400 });
        }

        // 4. Use sanitized values
        const result = doSomething(sanitizedField1, sanitizedField2);
        
        return json({ success: true, result });
    } catch (e: any) {
        console.error('API error:', e);
        return json({ error: 'Internal error' }, { status: 500 });
    }
}
```

### Authentication Token Pattern

```typescript
function getAuthUser(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

    try {
        const sanitizedToken = sanitizeToken(parts[1]);
        // ... decode and verify token
    } catch (e) {
        return null;
    }
}
```

### CSRF Validation Pattern

```typescript
// Validate CSRF token
const csrfTokenRaw = request.headers.get('X-CSRF-Token');
const sessionId = getSessionIdFromRequest(request);

if (!csrfTokenRaw || !sessionId) {
    return json({ error: 'Missing CSRF token' }, { status: 403 });
}

let csrfToken: string;
try {
    csrfToken = sanitizeCSRFToken(csrfTokenRaw);
} catch (sanitizeError: any) {
    return json({ error: 'Invalid CSRF token format' }, { status: 403 });
}

if (!validateCSRFToken(sessionId, csrfToken)) {
    return json({ error: 'Invalid CSRF token' }, { status: 403 });
}
```

## Function Reference

### `sanitizeUsername(username: unknown): string`

**Use for:** User login names, account identifiers

```typescript
const username = sanitizeUsername(input);
// Length: 3-50 chars
// Chars: a-zA-Z0-9._-
// No paths: ../, /, \
```

**Common errors:**
- `"Username must be a string"`
- `"Username must be between 3 and 50 characters"`
- `"Username contains invalid characters"`

---

### `sanitizePassword(password: unknown): string`

**Use for:** Passwords, passphrases, encryption keys

```typescript
const password = sanitizePassword(input);
// Length: 8-1000 chars
// Chars: any
```

**Common errors:**
- `"Password must be a string"`
- `"Password must be between 8 and 1000 characters"`

---

### `sanitizeToken(token: unknown): string`

**Use for:** JWT tokens, Base64 encoded data

```typescript
const token = sanitizeToken(input);
// Length: 10-500 chars
// Format: Base64 (A-Za-z0-9+/=)
```

**Common errors:**
- `"Token must be a string"`
- `"Invalid token format"`

---

### `sanitizeFilename(filename: unknown, requireJson?: boolean): string`

**Use for:** Vault filenames, document names

```typescript
const filename = sanitizeFilename(input, true);
// Length: 1-255 chars
// Chars: a-zA-Z0-9._-
// Extension: .json (if required)
// No paths: ../, /, \, null bytes
```

**Common errors:**
- `"Filename must be a string"`
- `"Filename contains invalid characters"`
- `"Filename must have .json extension"`

---

### `sanitizeVaultContent(content: unknown): string`

**Use for:** Encrypted vault data, JSON payloads

```typescript
const content = sanitizeVaultContent(input);
// Must be valid JSON
// Max size: 10MB
```

**Common errors:**
- `"Vault content must be a string"`
- `"Vault content must be valid JSON"`
- `"Vault content size is invalid"`

---

### `sanitizeCSRFToken(token: unknown): string`

**Use for:** CSRF protection tokens

```typescript
const csrfToken = sanitizeCSRFToken(input);
// Length: 32-128 chars
// Chars: a-zA-Z0-9-
```

**Common errors:**
- `"CSRF token must be a string"`
- `"Invalid CSRF token format"`

---

### `sanitizeString(value: unknown, minLength?: number, maxLength?: number, fieldName?: string): string`

**Use for:** Custom string validation

```typescript
const custom = sanitizeString(input, 5, 100, 'CustomField');
// Custom length limits
// No null bytes
```

**Common errors:**
- `"{fieldName} must be a string"`
- `"{fieldName} must be between {min} and {max} characters"`
- `"{fieldName} contains invalid characters"`

## Validation Rules Cheat Sheet

| Function | Min | Max | Allowed Characters | Special Rules |
|----------|-----|-----|-------------------|---------------|
| `sanitizeUsername` | 3 | 50 | `a-zA-Z0-9._-` | No `../`, `/`, `\` |
| `sanitizePassword` | 8 | 1000 | Any | - |
| `sanitizeToken` | 10 | 500 | Base64 | Must be valid Base64 |
| `sanitizeFilename` | 1 | 255 | `a-zA-Z0-9._-` | Must end `.json`, no paths, no `\0` |
| `sanitizeVaultContent` | 1 | 10MB | Any | Must be valid JSON |
| `sanitizeCSRFToken` | 32 | 128 | `a-zA-Z0-9-` | - |

## Error Handling

### Try-Catch Pattern

```typescript
try {
    const sanitized = sanitizeUsername(input);
    // Use sanitized value
} catch (error: any) {
    return json({ error: error.message }, { status: 400 });
}
```

### Multiple Fields

```typescript
try {
    const username = sanitizeUsername(userInput);
    const password = sanitizePassword(passInput);
    // All sanitization successful
} catch (error: any) {
    // First error caught
    return json({ error: error.message }, { status: 400 });
}
```

## Testing

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeUsername } from '$lib/server/sanitizer';

describe('Custom Validation', () => {
    it('should accept valid input', () => {
        expect(sanitizeUsername('valid_user')).toBe('valid_user');
    });

    it('should reject invalid input', () => {
        expect(() => sanitizeUsername('../admin')).toThrow(
            'Username contains invalid characters'
        );
    });
});
```

### Run Tests

```bash
# Run sanitization tests only
npm run test:unit -- tests/unit/sanitizer.test.ts

# Run all unit tests
npm run test:unit

# Run with watch mode
npm run test:unit -- --watch
```

## Security Checklist

When adding a new API endpoint:

- [ ] Import required sanitization functions
- [ ] Validate all user inputs
- [ ] Check authentication token if needed
- [ ] Validate CSRF token for state changes
- [ ] Use sanitized values only
- [ ] Handle sanitization errors gracefully
- [ ] Return appropriate HTTP status codes
- [ ] Log suspicious patterns
- [ ] Add unit tests for the endpoint
- [ ] Update documentation

## Common Mistakes

### ❌ Don't Do This

```typescript
// Using raw input directly
const user = getUser(username);

// Ignoring sanitization errors
try {
    const name = sanitizeUsername(input);
} catch (e) {
    // Empty catch - bad!
}

// Generic error messages
return json({ error: 'Error' }, { status: 500 });
```

### ✅ Do This

```typescript
// Sanitize before use
const sanitizedUsername = sanitizeUsername(username);
const user = getUser(sanitizedUsername);

// Handle errors properly
try {
    const name = sanitizeUsername(input);
} catch (sanitizeError: any) {
    return json({ error: sanitizeError.message }, { status: 400 });
}

// Descriptive errors
return json({ 
    error: 'Username contains invalid characters' 
}, { status: 400 });
```

## Performance Tips

1. **Fail Fast**: Validate as early as possible
2. **Validate Once**: Don't re-sanitize already sanitized data
3. **Specific Functions**: Use the most specific sanitizer for the data type
4. **Early Returns**: Return errors immediately, don't continue processing

## Examples by Endpoint

### Login Endpoint

```typescript
import { sanitizeUsername, sanitizePassword } from '$lib/server/sanitizer';

export async function POST({ request }) {
    const { username, password } = await request.json();
    
    try {
        const user = sanitizeUsername(username);
        const pass = sanitizePassword(password);
        // ... authenticate
    } catch (e: any) {
        return json({ error: e.message }, { status: 400 });
    }
}
```

### Vault Save Endpoint

```typescript
import { 
    sanitizeToken, 
    sanitizeCSRFToken, 
    sanitizeVaultContent 
} from '$lib/server/sanitizer';

export async function POST({ request }) {
    // Validate auth token
    const token = sanitizeToken(authHeader.split(' ')[1]);
    
    // Validate CSRF
    const csrf = sanitizeCSRFToken(request.headers.get('X-CSRF-Token'));
    
    // Validate content
    const { content } = await request.json();
    const vault = sanitizeVaultContent(content);
    
    // ... save vault
}
```

### File Delete Endpoint

```typescript
import { sanitizeFilename } from '$lib/server/sanitizer';

export async function DELETE({ url }) {
    const filenameRaw = url.searchParams.get('filename');
    
    try {
        const filename = sanitizeFilename(filenameRaw, true);
        // ... delete file
    } catch (e: any) {
        return json({ error: e.message }, { status: 400 });
    }
}
```

## Documentation

- **Full Guide**: [INPUT_SANITIZATION.md](INPUT_SANITIZATION.md)
- **Implementation**: [SANITIZATION_SUMMARY.md](SANITIZATION_SUMMARY.md)
- **Security**: [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)

## Support

Questions? Check:
1. This quick reference
2. Full documentation in `INPUT_SANITIZATION.md`
3. Test examples in `tests/unit/sanitizer.test.ts`
4. Implementation in `src/lib/server/sanitizer.ts`
