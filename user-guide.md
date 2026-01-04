# Passkeys User Guide

## Introduction

**Passkeys** is a secure, web-based password manager that brings KeePass-like functionality to any modern browser. Unlike traditional password managers that are platform-specific, Passkeys works seamlessly across MacOS, Linux, Windows, Android, and iOS through a simple web interface.

### Key Features

- **End-to-End Encryption**: Your vault is encrypted client-side using AES-GCM. The server never sees your vault key or decrypted data.
- **Zero-Knowledge Architecture**: The server only stores encrypted vaults and cannot decrypt them.
- **Offline Access**: Your encrypted vault is cached locally for use without internet connectivity.
- **Progressive Web App**: Install Passkeys on desktop or mobile for a native-like experience.
- **Vault History**: Keep and restore previous versions of your vault.
- **Auto-Timeout**: Decrypted data automatically clears from memory after 60 seconds of inactivity.
- **Clipboard Security**: Copied credentials automatically clear from clipboard after 10 seconds.

### Security Model

Passkeys uses a two-layer security approach:

1. **Login Password**: Authenticates you to the server
2. **Vault Key**: Decrypts your vault in the browser

These are intentionally separate. Even if someone gains access to the server, they cannot decrypt your vault without your vault key.

---

## Using the Webapp

### First Login

1. Navigate to your Passkeys instance (e.g., `http://localhost:3000`)
2. Enter your **username** and **password**
3. Press `Enter` or click the login button

### Unlocking Your Vault

After successful login, you'll be prompted for your **vault key**:

1. Enter the passphrase that encrypts your vault
2. Toggle the eye icon to temporarily view your vault key
3. Press `Enter` or click the unlock button

**Note**: If the vault cannot be decrypted, you'll receive an error message. Ensure you're using the correct vault key.

### First-Time Setup

If this is your first time using Passkeys:

1. Your initial vault may be unencrypted (a plain JSON array)
2. When you first unlock it, enter a new **vault key** of your choice
3. Passkeys will immediately encrypt your vault with this key
4. Remember this vault key - you'll need it every time you access your vault

### Managing Password Entries

#### Viewing Entries

- All password entries are displayed by title in the main view
- Entries are organized hierarchically by group (folder structure)
- Click on any entry to view its full details in a popup

#### Filtering/Searching

- Use the search box to filter entries
- Search matches against all fields: title, username, site, tags, and notes
- Search is case-insensitive

#### Entry Details Popup

When you click an entry, you'll see:

- **Title**: The entry name
- **Username**: Click to copy to clipboard
- **Password**: Displayed as asterisks; click to copy to clipboard
- **Site URL**: Click to open in a new tab
- **Tags**: Associated keywords
- **Notes**: Additional information
- **Group**: The folder/category path

#### Quick Actions

- **Copy Username**: Click the username field to copy it
- **Copy Password**: Click the password field to copy it (shown as `***`)
- **Visit Site**: Click the site URL to open it in a new browser tab
- **Auto-Clear**: Copied credentials automatically clear from your clipboard after 10 seconds

#### Creating a New Entry

1. Click the **"Add Entry"** or **"+"** button
2. Fill in the entry details:
   - **Title** (required)
   - Username
   - Password
   - Site URL
   - Group (for organization)
   - Tags (space or comma-separated keywords)
   - Notes
3. Click **"Save"** to add the entry

#### Editing an Entry

1. Click on the entry to open it
2. Click the **"Edit"** button
3. Modify the fields as needed
4. Click **"Save"** to update

#### Deleting an Entry

1. Click on the entry to open it
2. Click the **"Delete"** button
3. Confirm the deletion

### Saving Changes

After modifying your vault (adding, editing, or deleting entries):

1. A **"Save Vault"** button will appear
2. Click it to encrypt and upload your vault to the server
3. Your changes are now persisted and synchronized

### Vault History

Passkeys maintains a history of your vault versions:

1. Click the **"History"** button or menu item
2. View all previous vault versions with timestamps and file sizes
3. **Restore**: Click a version to restore it
4. **Delete**: Remove old versions you no longer need

### Offline Mode

Passkeys caches your encrypted vault in browser storage:

- When offline, you can still unlock and view your vault
- A warning will indicate the vault may be out of date
- Changes made offline cannot be saved until connectivity is restored

### Security Features

#### Auto-Timeout

- After 60 seconds of inactivity, your decrypted vault is cleared from memory
- You'll need to re-enter your vault key to access it again
- This prevents unauthorized access if you step away from your device

#### Clipboard Auto-Clear

- Usernames and passwords copied to clipboard automatically clear after 10 seconds
- Reduces risk of accidentally pasting credentials in the wrong place

### Logging Out

Click the **"Logout"** button to:
- Clear your session from the server
- Remove decrypted vault data from browser memory
- Return to the login screen

---

## Docker Installation and Configuration

### Prerequisites

- Docker Engine (v20.10+)
- Docker Compose (v2.0+)
- Git

### Quick Start

Clone the repository:

```bash
git clone https://github.com/ChristianQueinnec/passkeys.git
cd passkeys
```

### Method 1: Using Make (Recommended)

Build the container:

```bash
make create.container
```

This command:
- Generates a timestamp tag for the image
- Builds the Docker image with your user's UID/GID
- Tags the image appropriately

Run the container:

```bash
make run.container
```

Access Passkeys at: **http://localhost:3000**

### Method 2: Using Docker Compose

For a simpler deployment, use Docker Compose:

```bash
docker compose up --build -d
```

View logs:

```bash
docker logs -f passkeys
```

### Initial Configuration

#### 1. Create the Data Directory

```bash
mkdir -p data
```

#### 2. Create Users File

Create `data/users.json` with your credentials:

```json
[
  {
    "username": "admin",
    "password": "your-secure-password"
  }
]
```

**Important**: 
- Passwords in this file will be automatically hashed on first server start
- Use a strong password different from your vault key
- Add multiple users if needed

#### 3. Bootstrap Your Initial Vault

Create a directory for your user:

```bash
mkdir -p data/admin
```

Create an initial unencrypted vault `data/admin/vault-init.vault`:

```json
[
  {
    "group": "Personal",
    "title": "Example Website",
    "username": "your.email@example.com",
    "password": "temporary-password",
    "site": "https://example.com",
    "tags": ["personal", "web"],
    "notes": "This is a sample entry",
    "created": 1704384000,
    "modified": 1704384000
  },
  {
    "group": "Work/Email",
    "title": "Company Email",
    "username": "you@company.com",
    "password": "another-temp-password",
    "site": "https://mail.company.com",
    "tags": ["work", "important"],
    "notes": "Work email account",
    "created": 1704384000,
    "modified": 1704384000
  }
]
```

**Timestamps**: Use Unix epoch time in seconds. You can generate the current timestamp with:

```bash
date +%s
```

#### 4. Using the Initialization Script

Alternatively, use the provided initialization script:

```bash
# Create test setup (user: admin, password: password)
./scripts/init.sh -t

# Create custom setup with generated password
./scripts/init.sh -u -v

# Initialize everything and start the server
./scripts/init.sh -i
```

### Docker Compose Configuration

Customize your `docker-compose.yml`:

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

**Key points**:
- The `./data` directory is mounted to `/app/data` inside the container
- Adjust UID/GID to match your host system for proper file permissions
- Port 3000 is exposed for web access

### Directory Structure

```
passkeys/
├── data/                       # Mounted volume
│   ├── users.json             # User credentials (auto-hashed)
│   ├── admin/                 # User vault directory
│   │   ├── vault-init.vault   # Initial/current vault
│   │   ├── vault-20250104_123456.vault  # Historical version
│   │   └── vault-20250103_091234.vault  # Historical version
│   └── other-user/            # Another user's vault directory
├── Dockerfile
├── docker-compose.yml
└── ...
```

### Security Considerations

1. **File Permissions**: Ensure `data/` is readable/writable only by the container user
2. **Backup**: Regularly backup the `data/` directory
3. **Network**: Consider using a reverse proxy with HTTPS in production
4. **Firewall**: Restrict access to port 3000 to trusted networks

### Updating Passkeys

Pull the latest changes:

```bash
git pull origin main
make create.container
make run.container
```

Or with Docker Compose:

```bash
git pull origin main
docker compose up --build -d
```

### Troubleshooting

**Container won't start:**
- Check logs: `docker logs passkeys`
- Verify `data/users.json` exists and is valid JSON
- Ensure port 3000 is not already in use

**Permission issues:**
- Verify UID/GID in build args match your system
- Check ownership: `ls -la data/`

**Cannot decrypt vault:**
- Ensure you're using the correct vault key
- Check that vault files are not corrupted
- Verify vault file format is correct JSON

### Development Mode

For development with hot-reload:

```bash
npm install
npm run dev
```

Access at: **http://localhost:3000**

---

## AI-Generated Development

Passkeys was developed primarily through collaboration with AI agents, specifically **Antigravity** and **Claude** from Anthropic.

### Development Process

The project was built iteratively through natural language conversations with AI:

1. **Initial Specification**: The project requirements were described in `CLAUDE.md`
2. **Iterative Development**: Features were added through conversational requests documented in `questions.md`
3. **Code Generation**: The AI generated TypeScript/Svelte code for both frontend and backend
4. **Testing**: Unit tests (Vitest) and E2E tests (Playwright) were AI-generated
5. **Documentation**: This user guide and technical documentation were AI-assisted

### Human Interventions

While most code was AI-generated, some manual interventions were necessary:

- **CSS Refinements**: Simplified or adjusted styling for better visual consistency
- **JavaScript Edge Cases**: Minor tweaks for browser-specific behaviors
- **Configuration**: Docker and deployment configurations fine-tuned manually

### AI Development Log

For complete details on the AI development process, see:

- **`AGENTS.md`**: Original project specification and evolution
- **`questions.md`**: Chronological log of feature requests and AI interactions
- **`REFACTORING_*.md`**: Documentation of major refactoring efforts

This approach demonstrates that complex, production-ready web applications can be effectively developed through human-AI collaboration, with AI handling the majority of implementation while humans provide direction, requirements, and quality oversight.

---

## Getting Help

### Resources

- **GitHub Repository**: https://github.com/ChristianQueinnec/passkeys
- **Issues**: Report bugs or request features on GitHub Issues
- **Source Code**: All code is open-source and available for review

### Common Issues

**Q: I forgot my vault key**  
A: Unfortunately, the vault key cannot be recovered. This is by design for security. You'll need to create a new vault.

**Q: Can I change my vault key?**  
A: Yes. Unlock your vault with the old key, then save it - during the save process, you'll encrypt with a new key.

**Q: How do I migrate from KeePass?**  
A: Export your KeePass database to CSV, then use the KeePass2Passkeys converter tool included in the repository.

**Q: Is Passkeys secure?**  
A: Passkeys uses industry-standard AES-GCM encryption. The server never sees unencrypted data. However, security also depends on choosing strong passwords and vault keys.

---

## License

Passkeys is open-source software. Check the repository for license details.

---

**Version**: 0.1.8  
**Last Updated**: January 2025  
**Documentation Generated**: With assistance from Claude AI
