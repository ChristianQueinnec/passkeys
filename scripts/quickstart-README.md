# Passkeys Quickstart Guide (`quickstart.mjs`)

`scripts/quickstart.mjs` is a zero-configuration script to quickly run Passkeys locally on **Linux**, **macOS**, and **Windows**.

It automatically synthesizes a local username, generates a secure random password, initializes server keys, and starts the development server.

---

## Prerequisites

- **Node.js** >= 18 installed.
- Dependencies installed in the repository (`npm install`).

The script itself has **zero external npm dependencies** and uses only the Node.js standard library (`node:os`, `node:crypto`, `node:fs`, `node:child_process`, `node:path`).

---

## Quickstart for New Users (From Scratch)

Passkeys is a full-stack web application requiring its source files and dependencies to run the local server. If you do not have the repository cloned yet, you can clone and run it with a single chained command:

### Linux & macOS

```bash
git clone https://github.com/ChristianQueinnec/passkeys.git && cd passkeys && npm install && ./scripts/quickstart.mjs
```

### Windows (PowerShell)

```powershell
git clone https://github.com/ChristianQueinnec/passkeys.git; cd passkeys; npm install; node scripts\quickstart.mjs
```

> **Note**: `quickstart.mjs` includes a preflight check. If run outside the root of a Passkeys repository (where `package.json` is missing), it halts safely without creating any data directories and displays the cloning command above.

---

## How to Run

### Linux & macOS

Make sure the script is executable (it usually is by default):

```bash
chmod +x scripts/quickstart.mjs
```

Then run:

```bash
./scripts/quickstart.mjs
```

*(or `node scripts/quickstart.mjs`)*

### Windows (Command Prompt or PowerShell)

```powershell
node scripts\quickstart.mjs
```

### Custom Port (Optional)

By default, the server runs on port **3000**. To run on another port, set the `PORT` environment variable:

- **Linux / macOS**:

  ```bash
  PORT=5000 ./scripts/quickstart.mjs
  ```

- **Windows (PowerShell)**:

  ```powershell
  $env:PORT=5000; node scripts\quickstart.mjs
  ```

---

## What the Script Does

1. **Synthesizes a Username**:
   - Generates an identifier in the form `<os_user>@<hostname>` (for example, `alice@macbook` or `alex@desktop`).
   - This fits Passkeys' email suggestion format while ensuring a recognizable identity.
2. **Generates a Random Password**:
   - Generates an 8-character random password.
   - Excludes visually ambiguous characters (`0`, `O`, `1`, `l`, `I`, `i`).
3. **Generates Session Keys**:
   - Generates a secure, cryptographically random `JWT_SECRET` in memory for signing session tokens.
4. **Initializes Data Storage**:
   - Creates the `data/` directory with restricted permissions (`0700`).
   - Creates `data/users.json` with the generated user credentials (`0600`).
   - *(Note: Passkeys will automatically hash this password with PBKDF2 on first server startup).*
   - If `data/users.json` already exists from a previous run, the script preserves your existing user accounts and will not overwrite them.
5. **Starts the Server**:
   - Spawns the web server and prints the access URL: `http://localhost:3000`.

---

## Using the Application

1. Open your browser and navigate to the printed URL (e.g., `http://localhost:3000`).
2. Log in using the **Username** and **Password** displayed in your terminal.
3. Decipher or create your vault using your chosen vault key.

---

## How to Shut Down

Press `Ctrl+C` in the terminal running `quickstart.mjs`. The script catches the interrupt signal (`SIGINT`) and gracefully terminates the web server process.

---

## How to Completely Remove Created Data

To remove all traces of local data created by the server and browser:

### 1. Delete Server Data Directory

- **Linux / macOS**:

  ```bash
  rm -rf data/
  ```

- **Windows (Command Prompt)**:

  ```cmd
  rmdir /s /q data
  ```

- **Windows (PowerShell)**:

  ```powershell
  Remove-Item -Recurse -Force data
  ```

### 2. Clear Browser Offline Cache & Storage

Passkeys is a Progressive Web App (PWA) that caches the ciphered vault in browser storage (`localStorage` and Cache API) for offline access:

1. Open your browser to `http://localhost:3000`.
2. Open Developer Tools (`F12` or `Ctrl+Shift+I` / `Cmd+Option+I`).
3. Go to **Application** (Chrome/Edge) or **Storage** (Firefox) tab.
4. Click **Clear site data** (or clear `Storage` / `Local Storage` for `http://localhost:3000`).
