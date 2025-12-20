# Passkeys

A secure, modern web application for managing your sensitive information, mimicking the capabilities of KeePass but with the convenience of a web platform.

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
- **Testing**: Vitest for unit tests, Playwright for End-to-End (E2E) testing.
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

To run E2E tests specifically:
```bash
npm run test:e2e
```

### Docker Deployment

Build and run with Docker Compose:
```bash
docker compose up --build
```

## Project History

This project was developed with the assistance of AI agents (Antigravity and Claude). For more details, see:
- `AGENTS.md`: Initial project description and evolution.
- `questions.md`: Chronological log of additional feature requests and AI interactions.
