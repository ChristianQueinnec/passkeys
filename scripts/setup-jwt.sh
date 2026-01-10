#!/bin/bash
# JWT Authentication Setup Script
# This script helps set up JWT authentication for Passkeys

set -e  # Exit on error

echo "=================================================="
echo "Passkeys JWT Authentication Setup"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}Warning: .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 1
    fi
fi

# Generate JWT secret
echo "Generating secure JWT secret..."
JWT_SECRET=$(openssl rand -hex 32)

if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}Error: Failed to generate JWT secret${NC}"
    exit 1
fi

echo -e "${GREEN}✓ JWT secret generated${NC}"

# Create .env file
echo "Creating .env file..."
cat > .env << EOF
# Passkeys Environment Configuration
# Generated on $(date)

# JWT Authentication (REQUIRED)
JWT_SECRET=$JWT_SECRET

# Server Configuration
PORT=3000
NODE_ENV=development

# Data Storage
DATA_DIR=./data

# Security
ALLOWED_ORIGIN=*
RATE_LIMIT_ENABLED=false

# Logging
LOG_LEVEL=info
AUDIT_LOG_ENABLED=false
EOF

echo -e "${GREEN}✓ .env file created${NC}"

# Set proper permissions
chmod 600 .env
echo -e "${GREEN}✓ Secure permissions set on .env${NC}"

echo ""
echo "=================================================="
echo "Setup Complete!"
echo "=================================================="
echo ""
echo "Your JWT secret has been generated and saved to .env"
echo ""
echo -e "${YELLOW}IMPORTANT SECURITY NOTES:${NC}"
echo "1. Never commit .env to version control"
echo "2. Use different secrets for dev/staging/production"
echo "3. Rotate the secret periodically"
echo "4. If secret is compromised, generate a new one"
echo ""
echo "Next steps:"
echo "1. Run tests:        npm run test:unit tests/unit/jwt.test.ts"
echo "2. Start dev server: npm run dev"
echo "3. Test login:       curl -X POST http://localhost:3000/api/login \\"
echo "                       -H 'Content-Type: application/json' \\"
echo "                       -d '{\"username\":\"admin\",\"password\":\"yourpass\"}'"
echo ""
echo -e "${GREEN}Ready to deploy!${NC}"
