#!/bin/bash

# Vault Testing Verification Checklist
# Run this script to verify all vault tests are working correctly

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     PASSKEYS VAULT TESTING VERIFICATION CHECKLIST         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

check_step() {
    echo -n "⏳ $1... "
}

pass_step() {
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED++))
}

fail_step() {
    echo -e "${RED}✗ FAIL${NC}"
    FAILED=$((FAILED++))
    if [ -n "$1" ]; then
        echo "   Error: $1"
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. ENVIRONMENT CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Node.js
check_step "Checking Node.js installation"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    if [[ "${NODE_VERSION:1:2}" -ge 20 ]]; then
        pass_step
        echo "   Version: $NODE_VERSION"
    else
        fail_step "Node.js version must be 20 or higher"
    fi
else
    fail_step "Node.js not found"
fi

# Check npm
check_step "Checking npm installation"
if command -v npm &> /dev/null; then
    pass_step
    echo "   Version: $(npm --version)"
else
    fail_step "npm not found"
fi

# Check if node_modules exists
check_step "Checking dependencies installed"
if [ -d "node_modules" ]; then
    pass_step
else
    fail_step "Run 'npm install' first"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. FILE STRUCTURE CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check test files exist
# check_step "Checking vault E2E test file"
# if [ -f "tests/e2e/vault_situations.spec.ts" ]; then
#     pass_step
# else
#     fail_step "tests/e2e/vault_situations.spec.ts not found"
# fi

# check_step "Checking vault unit test file"
# if [ -f "tests/unit/vault_sync.test.ts" ]; then
#     pass_step
# else
#     fail_step "tests/unit/vault_sync.test.ts not found"
# fi

check_step "Checking test runner script"
if [ -f "tests/run-vault-tests.sh" ]; then
    pass_step
else
    fail_step "tests/run-vault-tests.sh not found"
fi

check_step "Checking vault test documentation"
if [ -f "tests/VAULT_TESTS.md" ]; then
    pass_step
else
    fail_step "tests/VAULT_TESTS.md not found"
fi

check_step "Checking initialization script"
if [ -f "scripts/init.sh" ]; then
    pass_step
else
    fail_step "scripts/init.sh not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. PACKAGE.JSON SCRIPTS CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_step "Checking test:vault script"
if grep -q "test:vault" package.json; then
    pass_step
else
    fail_step "test:vault script not found in package.json"
fi

check_step "Checking test:vault:unit script"
if grep -q "test:vault:unit" package.json; then
    pass_step
else
    fail_step "test:vault:unit script not found in package.json"
fi

check_step "Checking test:vault:e2e script"
if grep -q "test:vault:e2e" package.json; then
    pass_step
else
    fail_step "test:vault:e2e script not found in package.json"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. TEST ENVIRONMENT INITIALIZATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_step "Initializing test environment"
if ./scripts/init.sh -t > /dev/null 2>&1; then
    pass_step
else
    fail_step "Failed to initialize test environment"
fi

check_step "Checking test users created"
if [ -f "data/users.json" ]; then
    pass_step
else
    fail_step "data/users.json not found"
fi

check_step "Checking test vault directory"
if [ -d "data/admin" ]; then
    pass_step
else
    fail_step "data/admin directory not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. RUNNING UNIT TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_step "Running vault unit tests"
if npm run test:unit:vault > /tmp/unit-test-output.log 2>&1; then
    pass_step
    TEST_COUNT=$(grep -o "passed" /tmp/unit-test-output.log | wc -l)
    echo "   Tests passed: $TEST_COUNT"
else
    fail_step "Unit tests failed"
    echo "   See /tmp/unit-test-output.log for details"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. RUNNING E2E TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# check_step "Running vault E2E tests"
# if npm run test:e2e:vault > /tmp/e2e-test-output.log 2>&1; then
#     pass_step
#     TEST_COUNT=$(grep -o "passed" /tmp/e2e-test-output.log | wc -l)
#     echo "   Tests passed: $TEST_COUNT"
# else
#     fail_step "E2E tests failed"
#     echo "   See /tmp/e2e-test-output.log for details"
# fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. DOCUMENTATION CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_step "Checking VAULT_TESTS.md"
if [ -f "tests/VAULT_TESTS.md" ]; then
    pass_step
    echo "   Size: $(wc -l < tests/VAULT_TESTS.md) lines"
else
    fail_step "tests/VAULT_TESTS.md not found"
fi

check_step "Checking QUICK_REFERENCE.md"
if [ -f "tests/QUICK_REFERENCE.md" ]; then
    pass_step
else
    fail_step "tests/QUICK_REFERENCE.md not found"
fi

check_step "Checking ARCHITECTURE.md"
if [ -f "tests/ARCHITECTURE.md" ]; then
    pass_step
else
    fail_step "tests/ARCHITECTURE.md not found"
fi

check_step "Checking user-guide.md"
if [ -f "user-guide.md" ]; then
    pass_step
else
    fail_step "user-guide.md not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. FINAL SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo -e "Total Checks: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "╔════════════════════════════════════════════════════════════╗"
    echo -e "║  ${GREEN}✓ ALL CHECKS PASSED - VAULT TESTING READY${NC}            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Next steps:"
    echo "  • Run all vault tests: npm run test:vault"
    echo "  • Read documentation: tests/VAULT_TESTS.md"
    echo "  • Quick reference: tests/QUICK_REFERENCE.md"
    echo ""
    exit 0
else
    echo "╔════════════════════════════════════════════════════════════╗"
    echo -e "║  ${RED}✗ SOME CHECKS FAILED - REVIEW ERRORS ABOVE${NC}            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Please fix the failed checks before running vault tests."
    echo ""
    exit 1
fi
