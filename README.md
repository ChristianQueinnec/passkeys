# Passkeys

A secure, modern web application for managing passwords and sensitive information, inspired by KeePass but designed as a web-first Progressive Web App (PWA).

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Security Model](#security-model)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Project History](#project-history)

---

## Overview

Passkeys solves the cross-platform limitations of traditional password managers like KeePass by providing a web-based solution that works consistently across all platforms (macOS, Linux, Windows, Android, iOS) while maintaining strong security through client-side encryption.

### Why Passkeys?

- **Platform Independence**: Works identically on any modern browser
- **End-to-End Encryption**: Your vault is encrypted client-side; the server never sees your data
- **Offline Capable**: Access your passwords even without internet connectivity
- **Progressive Web App**: Install as a native-like app on any device
- **Open Source**: Built with modern, maintainable technologies

---

## Key Features

### 🔐 Security First

- **End-to-End Encryption (E2EE)**: All sensitive data encrypted in browser using AES-GCM
- **Client-Side Cryptography**: Vault key never transmitted to server
- **JWT Authentication**: Secure token-based authentication with automatic expiration
- **Input Sanitization**: Comprehensive validation of all API inputs to prevent injection attacks
- **Security Timeouts**: Auto-clears decrypted data after 60 seconds of inactivity
- **Clipboard Protection**: Copied passwords auto-cleared after 10 seconds
- **CSRF Protection**: Token-based protection for all state-changing operations
- **Password Hashing**: Server-side scrypt hashing for authentication credentials
- **Safe/Unsafe Device Modes**: Configurable persistence based on device trust level
- **Configurable Security Delays**: Set inactivity-lock and quick-unlock durations in minutes; trusted devices persist them locally

### 📱 Progressive Web App

- **Installable**: Add to home screen on any device
- **Offline Mode**: Full functionality without internet connection
- **Background Sync**: Automatic detection of newer vault versions
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Service Worker**: Efficient caching and offline support

### 🗂️ Flexible Organization

- **Hierarchical Folders**: Organize entries with nested folder structures
- **Flat List View**: Quick filtering across all entries
- **Toggle Views**: Switch between folder tree and flat list views
- **Drag & Drop**: Move entries between folders (folder view)
- **Smart Filtering**: Search across all fields (title, username, site, tags, notes)
- **Tagging System**: Add multiple tags for flexible categorization

### 🔄 Synchronization

- **Multi-Device Support**: Sync encrypted vaults across devices
- **Version History**: Maintain and restore previous vault versions
- **Conflict Detection**: Alerts when newer version exists on server
- **Automatic Polling**: Background checks for updates every 60 seconds
- **Offline Queue**: Changes saved locally and synced when online

### 🎨 Modern User Experience

- **Clean Interface**: Minimalist design focused on usability
- **Quick Actions**: One-click copy for usernames and passwords
- **Site Integration**: Direct links to login pages
- **Visual Feedback**: Clear indicators for offline mode, dirty state, sync status
- **Dismissible Feedback**: Toast warnings and errors can be closed with their close button
- **Keyboard Shortcuts**: Efficient navigation and actions
- **Consistent Styling**: Unified button design with proper visual hierarchy
- **Entry Editing Assistance**: Generate strong, readable passwords and reuse frequently used email addresses through the username combobox

---

## Architecture

Passkeys follows a client-server architecture with clear separation of concerns:

### Server Side (`/src/routes/api/*`)

The server provides a RESTful API for vault management:

- **Authentication**: Username/password login with JWT tokens
- **Vault Storage**: Encrypted vault files stored per user
- **Version Management**: Maintains history of vault revisions with timestamps
- **Static Delivery**: Serves client application at root path
- **Security**: CSRF protection, rate limiting, secure headers

**Key Principle**: The server has zero knowledge of vault contents. All encryption/decryption happens client-side.

### Client Side (`/src/lib/components/*`)

The client is a Svelte 5 application with reactive state management:

- **Authentication Flow**: Login → Unlock vault with encryption key
- **Vault Management**: Load → Decrypt → Edit → Encrypt → Save
- **Two View Modes**:
  - **Folder Dashboard**: Hierarchical navigation with folder tree
  - **List Dashboard**: Flat filtered list of all entries
- **Composable Architecture**: Reusable stores for vault logic, security, and sync

### Data Flow

```
User Login
    ↓
Server Authentication (JWT token issued)
    ↓
Fetch Encrypted Vault from Server
    ↓
User Provides Vault Key (passphrase)
    ↓
Client-Side Decryption (AES-GCM)
    ↓
Edit Vault Entries in Memory
    ↓
Client-Side Encryption (AES-GCM)
    ↓
Save Encrypted Vault to Server
    ↓
Server Stores Encrypted File (no decryption)
```

---

## Technology Stack

### Frontend

- **Svelte 5**: Modern reactive framework with Runes API
- **TypeScript**: Type-safe development
- **SvelteKit**: Full-stack framework with routing
- **Web Crypto API**: Browser-native encryption (AES-GCM)

### Backend

- **SvelteKit**: Server-side API routes
- **Node.js**: Runtime environment
- **Configurable storage**: local filesystem or Google Drive for vault files
- **Local server data**: JSON-based user credentials and rate-limit state
- **bcrypt**: Secure password hashing

### Testing

- **Vitest**: Fast unit testing with excellent Svelte support
- **Playwright**: End-to-end testing for UI flows
- **93+ Tests**: Comprehensive coverage of vault scenarios

### Deployment

- **Docker**: Containerized deployment
- **Docker Compose**: Multi-container orchestration
- **PWA**: Service worker for offline functionality

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/Passkeys.git
cd Passkeys

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Initial Setup

1. Create `data/users.json` (required for both storage providers):
```json
[
  {
    "username": "admin",
    "password": "your-password-here"
  }
]
```

2. Passwords will be automatically hashed on first server read

3. With the default filesystem provider, create an initial vault (optional) in `data/admin/`:
```json
[
  {
    "title": "Example Entry",
    "username": "user@example.com",
    "password": "secret",
    "site": "https://example.com",
    "group": "Personal/Email",
    "tags": ["test"],
    "notes": "Sample entry",
    "created": 1563434379,
    "modified": 1563434380
  }
]
```

4. Vault will be encrypted on first client download

---

## Security Model

### Encryption Details

- **Algorithm**: AES-GCM (256-bit)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **IV**: Random 12-byte initialization vector per encryption
- **Salt**: Random 16-byte salt per vault key

### Storage Model

**Server Side:**
- Encrypted vault JSON files in `data/{username}/`
- Hashed passwords in `data/users.json`
- No decryption keys stored anywhere

**Client Side (Safe Device):**
- Encrypted vault in IndexedDB/localStorage
- Session JWT in memory only
- Vault key never persisted

**Client Side (Unsafe Device):**
- Nothing persisted
- All data cleared on page close
- Session only

### Security Features

1. **Memory Clearing**: After 60s inactivity, decrypted data removed from memory
2. **Clipboard Clearing**: Copied passwords cleared after 10s
3. **CSRF Tokens**: All state-changing requests protected
4. **Secure Headers**: CSP, HSTS, X-Frame-Options configured
5. **Password Visibility**: Toggle to temporarily reveal passwords
6. **Explicit Device Trust**: Users mark devices as safe/unsafe

---

## API Reference

### Authentication

**POST /api/login**
```json
Request:  { "username": "user", "password": "pass" }
Response: { "token": "jwt-token-here" }
```

**POST /api/logout**
```json
Response: { "success": true }
```

### Vault Management

**GET /api/vault**
```
Headers: Authorization: Bearer {token}
Response: Encrypted vault JSON
```

**POST /api/vault**
```json
Headers: 
  Authorization: Bearer {token}
  X-CSRF-Token: {csrf-token}
Body: { "content": "encrypted-vault-data" }
Response: { "success": true, "date": "ISO-timestamp" }
```

**GET /api/vault/history**
```
Headers: Authorization: Bearer {token}
Response: [{ "filename": "...", "date": "..." }]
```

**DELETE /api/vault/history**
```json
Headers:
  Authorization: Bearer {token}
  X-CSRF-Token: {csrf-token}
Body: { "filename": "vault-timestamp.json" }
Response: { "success": true }
```

### User Management

**POST /api/user/password**
```json
Headers:
  Authorization: Bearer {token}
  X-CSRF-Token: {csrf-token}
Body: { "oldPassword": "...", "newPassword": "..." }
Response: { "success": true }
```

**GET /api/csrf**
```
Headers: Authorization: Bearer {token}
Response: { "csrfToken": "random-token" }
```

---

## Testing

Passkeys includes comprehensive test coverage:

### Test Categories

1. **Vault Situations** (56 tests)
   - Safe/unsafe device scenarios
   - Online/offline modes
   - Synchronization conflicts
   - Version management

2. **Authentication** (15 tests)
   - Login flows
   - Session management
   - Token validation

3. **Cryptography** (10 tests)
   - Encryption/decryption
   - Key derivation
   - Error handling

4. **Security** (12 tests)
   - CSRF protection
   - Clipboard clearing
   - Memory timeouts

### Running Tests

```bash
# All tests
npm run tests

# Unit tests only
npm test

# E2E tests only
npm run test:e2e

# Vault-specific tests
npm run test:vault
```

### Test Documentation

- [tests/README.md](tests/README.md) - Complete testing guide
- [tests/VAULT_TESTS.md](tests/VAULT_TESTS.md) - Vault test scenarios
- [tests/QUICK_REFERENCE.md](tests/QUICK_REFERENCE.md) - Quick command reference
- [tests/ARCHITECTURE.md](tests/ARCHITECTURE.md) - Test architecture diagrams

---

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t passkeys .

# Run container
docker run -p 5173:5173 -v ./data:/app/data passkeys
```

### Docker Compose

```bash
# Build and run
docker compose up --build

# Run in background
docker compose up -d

# Stop
docker compose down
```

### Configuration

Set environment variables in `docker-compose.yml` or `.env`:

```bash
PORT=5173
NODE_ENV=production
DATA_DIR=/app/data
STORAGE_PROVIDER=filesystem
```

Vault storage can be moved from the server filesystem to Google Drive. Set
`STORAGE_PROVIDER=google-drive` and provide an OAuth refresh-token
configuration:

```bash
STORAGE_PROVIDER=google-drive
GOOGLE_DRIVE_FOLDER_ID=optional-parent-folder-id
GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...
GOOGLE_DRIVE_REFRESH_TOKEN=...
```

`GOOGLE_DRIVE_ACCESS_TOKEN` may be used for short-lived development sessions,
but a refresh token is recommended for production. The Drive account must
have access to the configured parent folder. Passkeys creates one folder per
user and stores each vault revision as a `.vault` file. The server still keeps
`users.json` and rate-limit state locally; only vault files use the selected
provider.

### Production Considerations

1. **HTTPS Required**: Always use TLS in production
2. **Secure local data**: Restrict permissions on `data/`, which still contains
   authentication data even when vaults use Google Drive
3. **Regular Backups**: Back up the local data directory and the configured
   Google Drive folder, according to the selected provider
4. **Rate Limiting**: Implement request rate limits
5. **Monitoring**: Log authentication attempts and errors

---

## Documentation

### User Documentation

- [user-guide.md](user-guide.md) - Complete user guide with screenshots
- [VISUAL_GUIDE.md](VISUAL_GUIDE.md) - Visual architecture and UI guide

### Technical Documentation

- [AGENTS.md](AGENTS.md) - Original project specification and requirements
- [DESIGN.md](DESIGN.md) - Current architecture and design boundaries
- [CLAUDE.md](CLAUDE.md) - Alternative project description
- [CSRF_PROTECTION.md](CSRF_PROTECTION.md) - CSRF implementation details
- [INPUT_SANITIZATION.md](INPUT_SANITIZATION.md) - Input validation and sanitization guide
- [HIERARCHICAL_DASHBOARD.md](HIERARCHICAL_DASHBOARD.md) - Folder view implementation

### Style Guides

- [BUTTON_STYLES.md](BUTTON_STYLES.md) - Button styling reference
- [COMPOSABLES_GUIDE.md](COMPOSABLES_GUIDE.md) - Using composable stores

### Development Documentation

- [REFACTORING_COMPLETE.md](REFACTORING_COMPLETE.md) - Refactoring history
- [VAULT_TESTING_SUMMARY.md](VAULT_TESTING_SUMMARY.md) - Test implementation summary
- [questions.md](questions.md) - Development Q&A log

---

## Project History

Passkeys was developed collaboratively with AI assistance (Anthropic Claude, Antigravity, Codex, Mistral) to explore modern web development practices and AI-assisted coding.

### Development Approach

- **Iterative Development**: Features added incrementally with testing
- **AI-Assisted**: Claude helped with architecture, implementation, and testing
- **Manual Refinements**: Some CSS and minor JavaScript adjustments done manually
- **Documentation First**: Comprehensive docs written alongside code

### Key Milestones

1. Initial implementation with basic vault management
2. Added hierarchical folder organization
3. Implemented comprehensive security features
4. Developed PWA capabilities with offline support
5. Created extensive test suite (93+ tests)
6. Refactored to composable architecture
7. Added CSRF protection and security hardening

### Contributing

While this project was primarily a learning exercise, contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request with clear description

---

## License

This project is licensed under the GPL-3.0 License - see the [gpl-3.0.txt](gpl-3.0.txt) file for details.

---

## Acknowledgments

- Built with assistance from Anthropic's Claude AI
- Inspired by KeePass and KeePassXC
- Thanks to the Svelte and SvelteKit communities

---

## Support

- **Issues**: Report bugs via GitHub Issues
- **Questions**: See [questions.md](questions.md) for common questions
- **Documentation**: Check the docs/ directory for detailed guides

---

**Note**: This is a personal project designed for learning and exploration. While security best practices have been followed, please review the code thoroughly before using for sensitive data in production environments.
tation**: Check the docs/ directory for detailed guides

---

**Note**: This is a personal project designed for learning and exploration. While security best practices have been followed, please review the code thoroughly before using for sensitive data in production environments.
