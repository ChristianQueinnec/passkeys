# Passkeys User Guide

**Version 0.2.0** | January 2025

## Introduction

Passkeys is a secure, cross-platform password manager accessible through any modern web browser. Unlike platform-specific tools like KeePass, Passkeys works identically on macOS, Linux, Windows, Android, and iOS.

### Core Features

**Security**: Client-side AES-GCM encryption ensures the server never sees your unencrypted data. Your vault key stays in your browser.

**Accessibility**: Progressive Web App (PWA) works online and offline. Install it on any device for native-like experience.

**Organization**: Hierarchical folder structure with tags and full-text search across all fields.

**History**: Automatic versioning lets you restore previous vault states.

**Auto-Security**: 60-second inactivity timeout clears decrypted data. 10-second clipboard auto-clear protects copied credentials.

### Security Model

Passkeys uses two separate credentials:

1. **Login Password**: Authenticates you to the server (stored as scrypt hash)
2. **Vault Key**: Decrypts your vault in the browser (never transmitted)

This separation ensures server compromise cannot expose vault contents.

---

## Using the Web Application

### First Login

1. Navigate to your Passkeys instance (e.g., `http://localhost:3000`)
2. Enter username and password
3. Press Enter or click Login

### Unlocking Your Vault

After authentication, provide your vault key:

1. Enter the passphrase that encrypts your vault
2. Toggle eye icon to reveal/hide the key
3. Press Enter or click Unlock

**First-time users**: If your vault is unencrypted, choose a new vault key. Passkeys encrypts it immediately.

### Managing Entries

#### Viewing

**Folder View**: Hierarchical tree navigation with expandable folders
**List View**: Flat, filterable list of all entries
**Toggle**: Switch between views using the view selector

#### Search and Filter

Type in the search box to filter entries by:
- Title
- Username  
- Site URL
- Tags
- Notes

Search is case-insensitive and matches partial text.

#### Entry Details

Click any entry to view:
- **Title**: Entry name
- **Username**: Click to copy
- **Password**: Masked; click to copy
- **Site**: Click to open URL
- **Tags**: Keywords for organization
- **Notes**: Additional information
- **Group**: Folder path

Copied credentials auto-clear from clipboard after 10 seconds.

#### Create Entry

1. Click **Add Entry** button
2. Fill required fields:
   - **Title** (required)
   - Username
   - Password
   - Site URL
   - Group (folder path, e.g., `Work/Email`)
   - Tags (space or comma-separated)
   - Notes
3. Click **Save**

#### Edit Entry

1. Click entry to open
2. Click **Edit**
3. Modify fields
4. Click **Save**

#### Delete Entry

1. Click entry to open
2. Click **Delete**
3. Confirm deletion

### Saving Changes

Modified vaults show a "Save Vault" button. Click it to encrypt and upload changes to the server.

### Vault History

Access previous vault versions:

1. Click **History** button
2. View timestamped versions with file sizes
3. **Restore**: Revert to selected version
4. **Delete**: Remove old versions

### Offline Mode

Passkeys caches encrypted vaults locally:

- Vault accessible without connectivity
- Offline indicator warns data may be stale  
- Changes require online connection to save

### Security Features

**Auto-Timeout**: After 60 seconds idle, decrypted vault clears from memory. Re-enter vault key to access.

**Clipboard Protection**: Copied credentials auto-clear after 10 seconds.

**Session Management**: Logout clears session tokens and decrypted data.

---

## Docker Installation

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

### Quick Start

```bash
# Clone repository
git clone https://github.com/ChristianQueinnec/passkeys.git
cd passkeys
```

### Setup Data Directory

```bash
# Create data directory
mkdir -p data

# Create users file
cat > data/users.json <<EOF
[
  {
    "username": "admin",
    "password": "your-secure-password-here"
  }
]
EOF
```

**Note**: Passwords auto-hash on first server start. Use strong, unique passwords.

### Bootstrap Initial Vault

```bash
# Create user directory
mkdir -p data/admin

# Create initial vault
cat > data/admin/vault-init.vault <<'EOF'
[
  {
    "group": "Personal",
    "title": "Example Website",
    "username": "user@example.com",
    "password": "temp-password",
    "site": "https://example.com",
    "tags": ["personal", "web"],
    "notes": "Sample entry",
    "created": 1704067200,
    "modified": 1704067200
  }
]
EOF
```

Generate current timestamp:
```bash
date +%s
```

### Using the Initialization Script

The `scripts/init.sh` script automates setup:

```bash
# Create test setup (admin/password)
./scripts/init.sh -t

# Create production setup with generated password
./scripts/init.sh -u -v

# Full initialization and server start
./scripts/init.sh -i
```

**Options**:
- `-u`: Create users.json
- `-v`: Create sample vault
- `-e`: Create .env file
- `-b`: Build and run container
- `-i`: Full initialization (equivalent to `-e -u -v -b`)
- `-t`: Test mode (admin/password credentials)
- `-r`: Run server

**Examples**:
```bash
# Test environment
./scripts/init.sh -t -r

# Production initialization
./scripts/init.sh -i
```

### Build and Run

#### Method 1: Using Make (Recommended)

```bash
# Build container with proper user permissions
make create.container

# Run container
make run.container
```

Access at: **http://localhost:3000**

The Makefile handles:
- Image tagging with timestamps
- User ID/Group ID mapping
- Container registry management

#### Method 2: Using Docker Compose

```bash
# Build and run
docker compose up --build -d

# View logs
docker logs -f passkeys

# Stop
docker compose down
```

### Docker Compose Configuration

Example `docker-compose.yml`:

```yaml
services:
  passkeys:
    build:
      context: .
      args:
        UID: 1001
        GID: 1001
        USER: passkeys
    container_name: passkeys
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

**Configuration Notes**:
- `UID/GID`: Match host system for file permissions
- `volumes`: Mount local `data/` directory
- `ports`: Expose port 3000 for web access
- `restart`: Auto-restart on failure

### Directory Structure

```
passkeys/
├── data/                          # Persistent storage
│   ├── users.json                # User credentials (hashed)
│   └── admin/                    # User vault directory
│       ├── vault-init.vault      # Current vault
│       └── vault-*.vault         # Historical versions
├── Dockerfile
├── docker-compose.yml
├── Makefile
└── scripts/
    └── init.sh                   # Setup automation
```

### Environment Variables

Create `.env` for JWT secret:

```bash
# Generate secure JWT secret
cat > .env <<EOF
export JWT_SECRET=$(openssl rand -hex 32)
EOF
chmod +x .env
```

Or use initialization script:
```bash
./scripts/init.sh -e
```

### Security Configuration

**File Permissions**: Restrict `data/` directory:
```bash
chmod 700 data
chmod 600 data/users.json
```

**Firewall**: Limit port 3000 to trusted networks

**HTTPS**: Use reverse proxy (nginx, Caddy) for TLS in production

**Backups**: Regularly backup `data/` directory:
```bash
tar -czf passkeys-backup-$(date +%F).tar.gz data/
```

### Development Mode

Run without Docker:

```bash
# Install dependencies
npm install

# Initialize test data
./scripts/init.sh -t

# Start development server
npm run dev
```

Access at: **http://localhost:3000**

Hot-reload enabled for rapid development.

### Updating Passkeys

```bash
# Pull latest changes
git pull origin main

# Rebuild container
make create.container
make run.container
```

Or with Docker Compose:
```bash
git pull origin main
docker compose up --build -d
```

### Troubleshooting

**Container won't start**:
```bash
# Check logs
docker logs passkeys

# Verify users.json exists and is valid
cat data/users.json | jq .

# Check port availability
lsof -i :3000
```

**Permission errors**:
```bash
# Verify ownership
ls -la data/

# Fix permissions
sudo chown -R $(id -u):$(id -g) data/
```

**Cannot decrypt vault**:
- Verify correct vault key
- Check vault file format: `cat data/admin/vault-init.vault | jq .`
- Ensure vault is valid JSON array

**Build failures**:
```bash
# Clean Docker cache
docker system prune -a

# Rebuild from scratch
make create.container
```

---

## AI-Generated Development

Passkeys was developed primarily through collaboration with AI assistants from Anthropic (Claude, Antigravity and a bit of Vibe Mistral and Kiro).

### Development Approach

**Conversational Programming**: Features requested in natural language, documented in `questions.md`

**Iterative Refinement**: Code generated, tested, and refined through dialog

**Comprehensive Testing**: 93+ tests (Vitest + Playwright) generated by AI

**Documentation First**: All docs AI-assisted, ensuring consistency

### Human Contributions

While AI generated most code, humans provided:

- **Requirements**: Clear project specifications in `AGENTS.md` and `CLAUDE.md`
- **Direction**: Feature priorities and architectural decisions
- **Refinement**: CSS adjustments and browser-specific fixes
- **Quality Control**: Code review and testing validation

### Development Artifacts

Key documentation of the AI development process:

- **`AGENTS.md`**: Original project specification
- **`questions.md`**: Chronological feature request log
- **`REFACTORING_*.md`**: Major architectural changes
- **`TESTING_GUIDE.md`**: Test development strategy

### Lessons Learned

**Strengths**:
- Rapid prototyping and implementation
- Consistent coding patterns
- Comprehensive documentation generation
- Test coverage from day one

**Challenges**:
- Occasional CSS inconsistencies requiring manual fixes
- Edge case handling in browser-specific code
- Need for human direction and priority setting

This development model demonstrates that complex, production-ready applications can be collaboratively built with AI handling implementation while humans provide vision, requirements, and quality oversight.

---

## Additional Resources

### Documentation

- **GitHub**: https://github.com/ChristianQueinnec/passkeys
- **Issues**: Report bugs or request features via GitHub Issues
- **Source Code**: All code is open-source and auditable

### Common Questions

**Q: I forgot my vault key**
**A**: Vault keys cannot be recovered by design. Create a new vault or restore from backup if you exported one.

**Q: Can I change my vault key?**
**A**: Yes. Unlock with current key, then save vault—you'll be prompted to encrypt with a new key.

**Q: How do I migrate from KeePass?**
**A**: Export KeePass to CSV, then use the included `KeePass2Passkeys` converter tool.

**Q: Is Passkeys secure for production use?**
**A**: Passkeys uses industry-standard AES-GCM encryption and follows security best practices. However, review the source code and deploy with HTTPS for production.

**Q: Can multiple users share a vault?**
**A**: No. Each user has separate vaults. Vaults are encrypted with personal vault keys.

**Q: What happens if the server is compromised?**
**A**: Encrypted vaults remain secure. Attackers cannot decrypt without your vault key, which never leaves your browser.

### Support

- **Bug Reports**: GitHub Issues
- **Feature Requests**: GitHub Issues
- **Questions**: Review `questions.md` for development Q&A

---

## License

Check repository for license details.

---

**Passkeys** | Secure Password Management for the Modern Web  
*Built with AI Assistance* | January 2025
