# Passkeys Design

This document describes the implemented design of Passkeys: a browser-first
password vault with a deliberately unaware server. It is a companion to
`README.md` and the user guides. The source code remains the authority when
details change.

## Design goals

- Keep vault contents and the vault key out of the server's trust boundary.
- Provide the same workflow online, offline, and on trusted or untrusted
  devices.
- Make common vault operations quick without hiding important security state.
- Keep UI components small and keep vault security logic out of components.
- Make behavior testable through unit tests and Playwright flows.

The server is not intended to decrypt vaults, recover a lost vault key, or
merge conflicting vault edits.

## System boundary

```text
                         ┌──────────────────────────────┐
                         │             Browser           │
                         │                              │
 Login credentials ────▶ │ Login / session              │
                         │        │                     │
                         │        ▼                     │
                         │ Encrypted vault ── decrypt ─┐ │
                         │                             │ │
                         │ Vault key + plaintext state │ │
                         │                             │ │
                         │ encrypt ──▶ encrypted copy ┘ │
                         └──────────────┬───────────────┘
                                        │ HTTPS API
                         ┌──────────────▼───────────────┐
                         │             Server            │
                         │ authentication, sessions,     │
                         │ encrypted vault files, logs   │
                         └───────────────────────────────┘
```

The server stores authentication data and encrypted vault snapshots. It may
handle an explicitly imported unciphered initial vault, but the client marks
such history entries and the user is expected to remove them promptly after
the vault has been encrypted and saved.

## Client architecture

The application shell is `src/routes/+page.svelte`. It owns the high-level
phase transition:

1. Login (`phase = 0`).
2. Vault unlock (`phase = 1`), where the browser derives the encryption key.
3. Dashboard (`phase = 2`), showing either list or folder view.

The `useVault` store is the client façade. Its implementation is divided by
responsibility:

- `vault/state.svelte.ts`: reactive vault state, including dirty state,
  selected/editing entries, offline state, and history state.
- `vault/core.ts`: load, decrypt, import, save, and synchronization flows.
- `vault/crypto.ts`: decrypt individual entries or the complete vault.
- `vault/crud.ts`: create, edit, select, delete, and close modal operations.
- `vault/history.ts`: history listing and deletion.
- `vault/activity.svelte.ts`: inactivity locking, clipboard handling, and
  site opening.
- `useVaultSync.svelte.ts`: online/offline monitoring and newer-version
  detection.

Components receive callbacks and state through props. They should not call
the API directly or implement encryption. Shared modal wiring lives in
`VaultModals.svelte`; list and folder dashboards use the same editor and
details components.

## Vault lifecycle

### Load and unlock

The browser authenticates first, then derives a key from the vault password.
The server response is preferred; a trusted-device encrypted local copy is a
fallback when the server cannot be reached. The client then:

- recognizes an unciphered entry array and marks the vault dirty;
- decrypts ciphered vault data with the derived key;
- sanitizes the reactive list so plaintext secrets are not unnecessarily
  exposed in list state;
- retains encrypted data for later merging and saving.

An incorrect key or corrupt data produces an explicit user-facing error.

### Edit and save

Edits update the in-memory list and mark the vault dirty. Secret-bearing
versions are retained only in the vault security layer while needed. Saving
reconstructs the complete entry list, encrypts it in the browser, uploads the
new dated snapshot, and updates the trusted-device encrypted cache.

The editor has two deliberate conveniences:

- The username field is an editable native combobox. It suggests only valid
  email addresses present in at least two *other* entries; arbitrary
  usernames remain possible.
- The password generator emits `XXXX-XXXX.XXXX;XXXX=XXXX` using secure random
  letters and digits while excluding visually ambiguous characters such as
  `O`, `0`, `I`, `l`, `1`, and `i`.

### User-configurable security delays

The user menu exposes security-delay settings in minutes for the inactivity lock and quick-unlock availability. On a trusted device, these values are persisted locally; on an untrusted device, they apply only to the current session.

### Synchronization

Synchronization can discard unsaved local changes only after confirmation.
Background polling reports a newer server snapshot after unlock; it does not
silently overwrite the current vault. Offline edits remain local until a
later online save or synchronization.

## Data model

A `PasswordEntry` has a mandatory title and optional username, password, site,
tags, notes, group, and timestamps. Groups use slash-separated paths such as
`Work/Email`; the folder dashboard derives its tree from those paths.

The server-facing encrypted vault is a dated object containing cipher text
and an initialization vector. History metadata includes the snapshot date,
size, and whether the snapshot is ciphered.

## Security design

- Vault encryption and decryption happen in the browser.
- The vault key is never sent to the server and is not persisted.
- Trusted devices may persist an encrypted vault and session information;
  untrusted devices avoid persistent sensitive storage.
- A security timeout clears active plaintext and requires unlocking again.
- Clipboard contents are cleared after the configured timeout.
- Unauthorized API responses clear sensitive client state and return to login.
- Login credentials are server-hashed; API state-changing requests use CSRF
  protection and input validation.
- Password visibility is opt-in and temporary.

These controls reduce exposure; they do not protect a device already under
attacker control or recover a forgotten vault key.

## User-interface conventions

- The folder dashboard is the default view where appropriate; list and folder
  views share entry presentation and editor behavior.
- Modal components close through their shared `Modal` close action or
  backdrop behavior.
- Toasts provide transient success, info, warning, and error feedback. Every
  toast has an explicit close button; persistent banners, such as offline
  status, remain while their condition is true.
- Text shown to users goes through the English/French translation store.
- Buttons expose stable `data-testid` values when they are part of tested
  workflows.

## Server responsibilities

API routes under `src/routes/api/` authenticate requests, validate input,
manage CSRF tokens, and read or write per-user vault snapshots. Shared auth
and storage helpers should remain server-only. API responses must never
return plaintext vault secrets or password hashes.

## Testing and change guidelines

Use Vitest for pure utilities and store logic, Svelte diagnostics for
component/type correctness, and Playwright for browser behavior such as
unlocking, offline operation, editing, and synchronization.

When adding a feature:

1. Put domain logic in a store or utility, not in a presentational component.
2. Preserve the encrypted/plaintext boundary.
3. Add translations for English and French.
4. Add unit coverage for deterministic rules and E2E coverage for important
   user-visible flows.
5. Run `npm run check`, `npm run test:unit`, and `npm run test:e2e` when the
   environment permits.

