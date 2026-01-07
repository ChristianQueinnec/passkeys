# Testing the Input Sanitization

## Quick Test

Run this command to test the sanitization implementation:

```bash
npm run test:unit -- tests/unit/sanitizer.test.ts
```

## What You Should See

### Successful Test Output

```
 RUN  v4.0.15 /home/queinnec/Passkeys

 ✓ tests/unit/sanitizer.test.ts (48) 234ms
   ✓ Input Sanitization (48)
     ✓ sanitizeUsername (7)
       ✓ should accept valid usernames
       ✓ should trim whitespace
       ✓ should reject non-string values
       ✓ should reject usernames that are too short
       ✓ should reject usernames that are too long
       ✓ should reject path traversal attempts
       ✓ should reject invalid characters
     ✓ sanitizePassword (6)
       ✓ should accept valid passwords
       ✓ should accept passwords with special characters
       ✓ should reject non-string values
       ✓ should reject passwords that are too short
       ✓ should reject passwords that are too long
       ✓ should accept long passphrases
     ✓ sanitizeToken (6)
       ✓ should accept valid base64 tokens
       ✓ should trim whitespace
       ✓ should reject non-string values
       ✓ should reject tokens that are too short
       ✓ should reject tokens that are too long
       ✓ should reject non-base64 characters
     ✓ sanitizeFilename (10)
       ✓ should accept valid filenames
       ✓ should trim whitespace
       ✓ should reject non-string values
       ✓ should reject path traversal attempts
       ✓ should reject filenames with slashes
       ✓ should reject filenames with null bytes
       ✓ should reject filenames without .json extension when required
       ✓ should allow filenames without .json extension when not required
       ✓ should reject empty filenames
       ✓ should reject filenames that are too long
     ✓ sanitizeVaultContent (6)
       ✓ should accept valid JSON strings
       ✓ should accept large valid JSON
       ✓ should reject non-string values
       ✓ should reject invalid JSON
       ✓ should reject empty content
       ✓ should reject content that is too large
     ✓ sanitizeCSRFToken (6)
       ✓ should accept valid CSRF tokens
       ✓ should trim whitespace
       ✓ should reject non-string values
       ✓ should reject tokens that are too short
       ✓ should reject tokens that are too long
       ✓ should reject tokens with invalid characters
     ✓ sanitizeString (7)
       ✓ should sanitize strings with custom length limits
       ✓ should trim whitespace
       ✓ should reject non-string values
       ✓ should respect minimum length
       ✓ should respect maximum length
       ✓ should reject null bytes
       ✓ should use custom field name in errors

 Test Files  1 passed (1)
      Tests  48 passed (48)
   Start at  14:23:45
   Duration  412ms (transform 89ms, setup 0ms, collect 67ms, tests 234ms, environment 0ms, prepare 43ms)
```

### Test Summary

- ✅ **48 tests** total
- ✅ **0 failures**
- ✅ **~400ms** execution time
- ✅ **100%** pass rate

## Alternative Testing Methods

### 1. Using the Convenience Script

```bash
chmod +x test-sanitization.sh
./test-sanitization.sh
```

### 2. Watch Mode (Auto-rerun on changes)

```bash
npm run test:unit -- tests/unit/sanitizer.test.ts --watch
```

### 3. Verbose Output

```bash
npm run test:unit -- tests/unit/sanitizer.test.ts --reporter=verbose
```

### 4. Run Specific Test

```bash
npm run test:unit -- tests/unit/sanitizer.test.ts -t "sanitizeUsername"
```

### 5. With Coverage

```bash
npm run test:unit -- tests/unit/sanitizer.test.ts --coverage
```

## Troubleshooting

### If You See Import Errors

The test file now uses relative imports:
```typescript
import { sanitizeUsername } from '../../src/lib/server/sanitizer';
```

This matches the pattern used in other test files like `crypto.test.ts`.

### If Tests Fail

1. **Check the error message** - It will tell you which validation failed
2. **Review the test** - Each test name describes what it's checking
3. **Check the implementation** - Compare against `src/lib/server/sanitizer.ts`

### Common Issues

**Module not found:**
- Ensure you're in the project root directory
- Check that `src/lib/server/sanitizer.ts` exists
- Verify the import path is correct

**TypeScript errors:**
- Run `npm run check` to verify TypeScript compilation
- Check `tsconfig.json` is properly configured

**Test timeout:**
- Increase timeout if needed: `--test-timeout=10000`

## Verification Checklist

After running tests, verify:

- [ ] All 48 tests pass
- [ ] No error messages in output
- [ ] Execution time is reasonable (< 1 second)
- [ ] No warnings about deprecated features
- [ ] Coverage is comprehensive (if running with --coverage)

## Documentation

For more details, see:
- `INPUT_SANITIZATION.md` - Complete implementation guide
- `SANITIZATION_QUICK_REF.md` - Developer quick reference
- `tests/unit/README.md` - Unit testing guide
- `FIXES_APPLIED.md` - Latest fixes and changes

## Success Criteria

✅ All tests pass  
✅ No errors in console  
✅ Fast execution time  
✅ Clear test descriptions  
✅ Comprehensive coverage  

If all criteria are met, the sanitization implementation is working correctly! 🎉
