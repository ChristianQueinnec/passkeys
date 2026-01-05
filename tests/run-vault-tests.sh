#!/bin/bash

# Run vault-related tests
# Usage: ./run-vault-tests.sh [unit|e2e|all]

set -e

MODE=${1:-all}

echo "=================================="
echo "Passkeys Vault Test Suite Runner"
echo "=================================="
echo ""

# Initialize test environment
echo "📋 Initializing test environment..."
./scripts/init.sh -t
echo ""

case "$MODE" in
    unit)
        echo "🧪 Running unit tests for vault synchronization..."
        npm run test:unit -- vault_sync.test.ts
        ;;
    e2e)
        echo "🌐 Running E2E tests for vault situations..."
        npx playwright test tests/e2e/vault_situations.spec.ts --workers=1
        ;;
    all)
        echo "🧪 Running unit tests for vault synchronization..."
        npm run test:unit -- vault_sync.test.ts
        echo ""
        echo "🌐 Running E2E tests for vault situations..."
        npx playwright test tests/e2e/vault_situations.spec.ts --workers=1
        ;;
    *)
        echo "❌ Invalid mode: $MODE"
        echo "Usage: $0 [unit|e2e|all]"
        exit 1
        ;;
esac

echo ""
echo "✅ Vault tests completed!"
