# Passkeys

A secure, modern web application for managing your sensitive information, 
mimicking the capabilities of KeePass but with the convenience of a web platform.

## Features

- **End-to-End Encryption (E2EE)**: Sensitive data is encrypted in the browser using AES-GCM. The server never sees your vault key or unencrypted data.
- **Progressive Web App (PWA)**: Installable on Desktop, Android, and iOS for a native-like experience.
- **Offline Mode**: Access your vault even without an internet connection, thanks to secure local storage and periodic synchronization.
- **Security Timeouts**: Decrypted data is automatically cleared from browser memory after 60 seconds of inactivity.
- **Clipboard Security**: Copied usernames and passwords are automatically cleared from your clipboard after 10 seconds.
- **Vault History**: Keep track of previous vault versions and restore or delete them as needed.
- **Modern UI**: Clean, responsive interface built with Svelte, featuring quick-copy buttons and site links.

## Technology Stack

- **Frontend**: Svelte 5 (Runes), TypeScript
- **Backend**: SvelteKit, Node.js
- **Storage**: Local filesystem-based storage on the server, encrypted local storage in the browser.
- **Security**: AES-GCM encryption, CSRF protection, secure password hashing.
- **Testing**: Vitest for unit tests, Playwright for End-to-End (E2E) testing - 93+ tests with comprehensive vault scenario coverage.
- **Deployment**: Docker-ready with Docker Compose support.

## Getting Started

### Prerequisites

- Node.js (v20+)
- npm

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run the development server:
```bash
npm run dev
```

### Testing

Run all tests (unit and E2E):
```bash
npm run tests
```

Run vault-specific tests (comprehensive scenarios for safe/unsafe devices, online/offline modes, sync conflicts):
```bash
npm run test:vault
```

To run E2E tests specifically:
```bash
npm run test:e2e
```

For more details on testing, see [tests/README.md](tests/README.md) and the comprehensive vault testing documentation:
- [tests/VAULT_TESTS.md](tests/VAULT_TESTS.md) - Detailed vault test documentation
- [tests/QUICK_REFERENCE.md](tests/QUICK_REFERENCE.md) - Quick command reference
- [tests/ARCHITECTURE.md](tests/ARCHITECTURE.md) - Test architecture diagrams
- [VAULT_TESTING_SUMMARY.md](VAULT_TESTING_SUMMARY.md) - Implementation summary

### Docker Deployment

Build and run the Docker container with:
```bash
make create.container
make run.container
```

or build and run with Docker Compose:
```bash
docker compose up --build
```

The `docker-compose.yml` file shows a possible deployment.

The `./data/` directory should contain a `users.json` file with your credentials such as:

``` json
[
  {
    "username": "admin",
    "password": "password"
  }
]
```

The user's password will be hashed and ciphered as soon as that file is read by the backend.

Vaults are stored in `./data/admin/`. A first vault may be created as follows:

``` json
[ {
    "group": "",
    "title": "me at example",
    "username": "me@example.org",
    "password": "password",
    "site": "https://ex.ample.org/",
    "tags": ["test"],
    "notes": "A test password entry",
    "created": 1563434379,
    "modified": 1563434380
  },
  ...
]
```

This vault will be immediately ciphered when received by the frontend.

For a complete user guide including installation, usage, and Docker deployment, see [user-guide.md](user-guide.md).

## Testing Highlights

Passkeys includes a comprehensive test suite with 93+ tests covering:

- **Vault Situations**: 56 tests for safe/unsafe devices, vault presence, synchronization, online/offline modes, and edge cases
- **Authentication**: Login flows, device trust, session management
- **Cryptography**: Encryption/decryption, key derivation
- **Security Features**: Timeouts, clipboard clearing, CSRF protection
- **UI/UX**: User interactions, filtering, history management

The test suite ensures robust behavior across all scenarios users will encounter. See [tests/](tests/) for complete documentation.

## Project History

This project was developed with the assistance of AI agents (Antigravity and Claude). 
For more details, see:
- `AGENTS.md`: Initial project description and evolution.
- `questions.md`: Chronological log of additional feature requests and AI interactions.

A small number of interventions were done manually. For instance:
- some CSS parts were simplified or adjusted
- some Javascript modifications too simple to be processed by AI

## Documentation

- [README.md](README.md) - This file (project overview)
- [user-guide.md](user-guide.md) - Complete user and installation guide
- [CLAUDE.md](CLAUDE.md) - Original project specification
- [tests/README.md](tests/README.md) - Testing documentation
- [VAULT_TESTING_SUMMARY.md](VAULT_TESTING_SUMMARY.md) - Vault test implementation summary
