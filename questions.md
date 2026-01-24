# Additional requests to AI

This is the chronological set of prompts I gave to AI to further
develop the `Passkeys` webapp after the initial generation triggered
by the `CLAUDE.md` file. After every prompt, a git commit was
performed so it is possible to relate the prompts with the diffs.

Things proceed smoothly 
- with Antigravity (Gemini 3 pro or Gemini 3 flash). I especially like the Implementation plan and the final Walkthrough. The title of the Walkthrough is a good summary for the associated git commit.
- and with Claude (claude-desktop) 
except for a glitch in the development around step 41-43, where I decided 
to `git revert` and start again with a better written prompt.

This experience teaches me to proceed with small steps, with precise
prompts. 


## 1
Does `fs-extra` really needed ? 

NO 

## 2
Generate a svg image showing a key in a cartoonish style. Derive a favicon from that image and install them in the webapp.

OK

## 3
Make the webapp a Progressive Web Application (aka PWA).

OK -- but sw.js and manifest are handled by Vite.
   -- however the Docker container generation is ok.

## 4 favicon
Also provide a `favicon.ico`

OK -- but specify that the favicon.ico should be derived from favicon.svg

## 5 menu
Transform the logout button into a menu item under the username.
Provide also another menu item to change the user's password

OK

## 6 css
Is it possible to share common CSS sections in svelte files into `app.css`

OK

## 7 enrich tests
There are many missing test files not covering use cases. Please
add them as needed.

OK

## 8 enrich tests
Please add e2e test files using playwright.

UNFINISHED

## 9 offline
offline mode (described in README)

OK

## 10 unciphered vault
If the vault received from the server is an array of JSON objects
instead of the usual `date` and `data` properties, then the vault is
not encrypted and the array is an array of entries. The client then
encrypts this array into the usual format and save the now ciphered
vault. Keep the extra properties that may appear in the items of the
array.

OK

## 11 bug in saveVault
You are an expert in typescript debugging. You are in the directory
`/home/queinnec/Passkeys/` where was developped a password manager
named `Passkeys`. This webapp is a sveltekit project.

Starting the server with `npm run dev` allows a browser client to log
in, to input a vault password and to see the list of stored passwords.
However, the vault is not saved in localstorage with that error:

```
crypto.ts:52 Uncaught (in promise) RangeError: Maximum call stack size exceeded
    at encrypt (crypto.ts:52:29)
    at async Module.track_reactivity_loss (chunk-WHQ2SJII.js?v=9cc14843:1495:15)
    at async saveVault (Dashboard.svelte:90:24)
    at async Module.track_reactivity_loss (chunk-WHQ2SJII.js?v=9cc14843:1495:15)
    at async loadVault (Dashboard.svelte:59:33)
```

Can you propose a plan to fix it ?

OK CLaude

## 12 synchronize
Add, in the user menu, a `synchronize` menu item to fetch the most
recent vault in order to replace the current local vault.

OK CLAUDE

## 13 styling buttons
unify button styles: adopt round corners and appropriate color.

OK CLAUDE BUTTON_STYLES.md

## 14 csrf
Add CSRF to forms

OK CLAUDE CSRF_PROTECTION.md

## 15 enrich tests
Add new tests to check the CSRF feature, add also missing tests 
related to the vault synchronization.

CLAUDE

## 16 bug fix
Fix the `npm run test:unit` 

OK Antigravity

## 17 shortcuts
For every entry in the dashboard, 
- use a more compact disposition, 
- the title is a link to the site URL 
- add a `copy username` and a `copy password` buttons using small icons rather than text. 
- Also use a small icon for the View button.

OK Antigravity

## 18 bug fix
Fix the `npm run test:e2e` 

OK Antigravity

## 19 enrich tests
Add a test to check that, in Dashboard, entries are listed in
alphabetical order of titles.

OK Antigravity

## 20 filter
In the `Filter` input, add a button (at the right of the input field)
to reset the filter.

OK Antigravity

## 21 id
In Dashboard function loadVault, when ciphering an array of
PasswordEntry, provide an id property when missing. This will help
when deleting a PasswordEntry.
OK Antigravity

## 22 eye
For all input[type=password], provide a show password option as an 
eye (open or not) in the right part of the input field to control
whether the password is visible.

OK CLAUDE

## 23 timeout
When a username or a password is copied to the clipboard, ensure that the 
clipboard is reset after 10 seconds. 

OK Antigravity

## 24 enrich tests
Please check unit tests and provide additional ones if some features are 
not covered.

OK Antigravity

## 35 clear memory
In order to ensure more security, ensure that, if the webapp UI is not
used for a minute, then all usernames and passwords are erased from
browser active memory. The next user interaction will have then to
decipher again the vault without asking the user to input the vault key.

Antigravity + a la main

## 36 refactor
The Dashboard file is too big. Create new components for the History Modal, the
Editor Modal and the Dails Modal.

OK Antigravity

## 37 bug fix
Fix the `tests/e2e/history.spec.ts` test. 

OK Antigravity
 
## 38 monitor updates
Periodically check if the webapp may quit the Offline Mode that is, if
saving or synchronizing the vault can be done safely. Report if a more
recent version the vault is available.

OK Antigravity

## 39 README
Please enhance the README of the Passkeys project.

OK Antigravity

## 40
update modified property

HAND made

## 41 folder view
Create another dashboard with a hierarchical presentation with
folders, subfolders, etc. A toggle button in all dashboards will
trigger the presentation of the alternate dashboard. The new dashboard
will be presented by default. Password entries are sorted in folders
as indicated in their `group` property. A group property such as
`a/b` is considered to be in folder `a` and, within `a`, in
subfolder `b`. The presentation will use the classic folder icons.
Clicking on such an icon displays the associated password entries with
the same presentation as the filtered items of the original Dashboard.
Create a new component to display filtered items or folder-chosen items.

CLAUDE HIERARCHICAL_DASHBOARD.md HIERARCHICAL_QUICKREF.md
OK but not satisfying

## 42 bug fix
Clicking on a folder that have subfolders does not display its subfolders.

CLAUDE SUBFOLDER_FIX.md
OK but not very satisfying

## 43 bug fix
It would be better, when clicking on the '>' character preceding the
name of a folder, to display the subfolder right below it (with a small
indentation). It is still good to list the entries on the right pane.
CLAUDE FOLDER_NAVIGATION_IMPROVEMENT.md NAVIGATION_QUICKREF.md

OK but not at all satisfying
so we revert and prepare a new prompt.

## 44 revert and retry
Create another dashboard (a new component) with a hierarchical
presentation with folders, subfolders, etc. A toggle button in all
dashboards will trigger the presentation of the alternate dashboard.
The new dashboard will be presented by default. It contains a folder
pane on the left and a password entries pane on the right. Password
entries are sorted in folders as indicated in their `group` property.
A password entry with a `group` property such as `a/b` is considered
to be in folder `a` and, within `a`, in subfolder `b`. The
presentation of folders will use the classic folder icons. Clicking on
such an icon or folder name
- toggle the state of the folder (open or closed),
- opening the folder, displays the subfolders right under the name of the clicked folder
- and displays the associated password entries with the same
presentation as the filtered items of the original Dashboard. Also
create a new component to display filtered items of the original
`Dashboard` or the folder-chosen items of the new dashboard.

OK CLAUDE HIERARCHICAL_DASHBOARD.md VISUAL_GUIDE.md
with a little hand-made fix

## 45 refactor
There are too much common code between Dashboard and FolderDashboard,
propose a plan to refactor.

CLAUDE REFACTORING_*.md COMPOSABLES_GUIDE.md

## 46 refactor
proceed with that plan

CLAUDE + hand made changes

## 47 drag and drop
In the `FolderDashboard`, allow to drag and drop a PasswordEntry to a
folder. Remember that one can also directly change the `group`
property in the `Editor` component.

Antigravity

## 48 bug fix
Can you fix the drag and drop tests

OK Antigravity

## 49 highlight
In the dropping process, When hovering over a folder, highlight the
targetted folder.

OK Antigravity

## 50 bug fix
Can you fix tests/e2e/security.spec.ts:43:5 › Security Inactivity Timeout 
› should clear vault from memory after inactivity and restore on interaction 

OK Antigravity

## 51 improvements
Do you see code improvements in the Passkeys webapp

OK Antigravity

## 52 internationalization
I would like to have an English and a French version, can you
internationalize the Passkeys webapp.

OK Antigravity but only partial for Unlock

## 53 internationalize again
Enrich `translations.ts` with French and English sentences (for instance
in `Unlock`)

OK Antigravity

## 54 simplify
Are all these `$state()` really necessary ?

OK Antigravity

## 55 simplify imports
Check useless imports

OK Antigravity

## 56 settings
There are some constants hard coded in the client such as
pollForUpdates, inactivityTimer, mvp_salt_fixed, etc.. Identify them,
gather them in a `client-settings.json` file and fix client code to
use these settings. No need to provide a form to alter these settings.
These settings are read once at start up.

OK Antigravity

## 57 enrich tests
Enrich unit tests to check newly added features.

OK Antigravity

## 58 safe device
Do not store permanently authentication information (for instance,
token and username) on an insecure device. Ask the user if the device
is safe and act accordingly.

OK Antigravity

## 59 user-guide
Generate a MarkDown document (named `user-guide.md`) acting as a draft
for a future user's guide to Passkeys. Adopt a concise style and
communicate concepts clearly. After a general introduction, one
section should describe how to use the webap and another section
should describe how to install, configure and initialize the Docker
container. A short final section describe how Passkeys had been mostly
generated by AI. Give code examples to help future users to bootstrap
`Passkeys`. To help the generation of the document, take screenshots,
etc. the webapp is available at `http://localhost:3000` and you may
use login `admin` and password `password`. Remember that the Git
repository is on `https://github.com/ChristianQueinnec/passkeys`.

OK Claude

## 60 warn unciphered vaults
Vaults stored on the server are all ciphered. However to ease the
initialization of `Passkeys`, the first vault (often named
`vault-init.vault`) may be unciphered. This is a temporary state since
once downloaded on a client's browser it will ciphered and if the user
saves it, it will be stored ciphered on the server. Vaults are stored
as JSON object. A ciphered vault is an object while an unciphered
vault is an array. Change the vault history to flag (with a warning
sign) the unciphered vaults that should be deleted promptly. Propose a
button to do so.

OK Antigravity 

## 61 warn
At `Unlock` time, notify the user that if a vault is present in the
browser or on the server then the user should use its vault key. If
there is no vault, notify the user that the vault key to be entered
will be used, in the future, to decipher the vault still to be created.

OK Antigravity

## 62 Store Type Simplification
Simplify useVault or useVaultSecurity types according to their call sites.

OK Antigravity

## 63 Help
Add an `help` menu item that opens (in another tab) the documentation of
`Passkeys` held at
`https://github.com/ChristianQueinnec/passkeys/blob/main/user-guide.md`.

OK Antigravity

## 64 needless poll
No need to poll the server for newer vaults before successful Unlock.

OK Antigravity

## 64 enrich tests
Add tests to check the vault in various situations. Tests should
check safe or unsafe device, absent or present vault at unlock, 
synchronisation with vaults older or newer, when online or offline.

CLAUDE VAULT_TESTING_SUMMARY.md IMPLEMENTATION_COMPLETE.md
not ok: many tests fail!

## 65 Fix E2E Vault Situations Tests
Some tests of `tests/e2e/vault_situations.spec.ts` fail, please fix them.

Antigravity - long and painful fix

There are still tests that fail, fix them

Make sure no test fail

## 66 Change Master Vault Password 
Add a menu item to present a form allowing the user to change the
master vault password. Warn the user to not confuse vault password
change from login password change.

Antigravity unfinished.................

## 67 New improved README.md 
Read this AGENTS.md file and propose an improved README.md file that will 
help you to be up to date with Passkeys in order to answer new questions

CLAUDE improved_readme.md

## 68 
In HistoryModal, added a bin icon. Made the hint only visible when appropriate.

HAND-MADE

## 69 Fix Svelte check diagnostics
Fix Svelte check diagnostics

CLAUDE

For the diagnostic related to unlock_guidance.spec.ts - Line 13,
I prefer the creation of a new type `User` so reading `users.json`
yields an array of User. Please fix that test.

I copied the `User` type into `types.ts`, show me which files may
use with profit that new type. 

Yes implement these changes

CLAUDE OK 

## 70 Sanitize inputs to server API
All user's requests to the server API must be sanitized.

The `test-sanitization.sh` still shows some errors, fix them

Fix errors when running `npm run test:unit`

OK CLAUDE INPUT_SANITIZATION.md SANITIZATION_*.md SECURITY_CHECKLIST.md IMPLEMENTATION_COMPLETE.md

Finalized by hand. csrf tokens should be at least 32 chars.
Remove vitest.config.ts: npm run tests fails if present.

## 71 Refactor API routes
Refactor API routes in order to share getAuthUser() functions or other
similar functionalities.

Antigravity UNFINISHED

## 72 componentize svg 
There are some SVG icons (for instance in PasswordList, HistoryModal
and PasswordInput), generate UserIcon, PasswordIcon, DetailsIcon,
BinIcon, EyeIcon as Svelte components and use them where useful.

Hand made

In Unlock, focus on the input field.

## 73 OpenAPI specification
Generate an OpenAPI specification (in JSON format) of the Passkeys
server API.

OK CLAUDE passkeys_openapi.json

## 74 API Code Improvement

Analyze the server API in `src/routes/api/` and propose code improvements.

OK CLAUDE api_analysis.md

Please fix the first critical issues that is Insecure Authentication
Token Design

CLAUDE JWT_*.md 

Fix unit tests by hand.

## 75 random fixes
This is the Passkeys project @README.md

Mistral vibe - mainly unused code removal

## 76 fix tests/e2e/vault_situations.spec.ts

What do you propose to fix @tests/e2e/vault_situations.spec.ts

Mistral vibe - fixed imports in test:e2e but still failing

tests/run-vault-tests.sh e2e

CLAUDE fails - fixed by hand

## 77 Change Master Vault Password (continued)

Check whether the task `Change Master Vault Password` is completed.

Antigravity OK

## 78 API shared logic refactoring

Check whether the task `API shared logic refactoring`is completed.

## 79 Change FolderDashboard

In the FolderDashboard, the number after the name of a folder is the
number of password entries that directly belong to this folder. I
would prefer it to be the total number of password entries held in the
folder, its subfolders, its subsubfolders, etc.

OK Antigravity

## 80 upload unciphered vault

Allow to submit an initial unciphered vault as a JSON file (respecting
the structure of a vault) read by the browser. For that goal, create a
new menu item to submit this local file, cipher it in the browser and
propose to save the ciphered version onto the server. The unciphered
content of the file should not be seen by the server.

OK Antigravity

Check your new `tests/e2e/import_vault.spec.ts`

Antigravity UNFINISHED

## 81 missing delete vault test

Read the current README.md then check if there are tests (unit and
e2e) checking the deletion of a vault. If not, propose to generate
missing tests.

Kiro (Claude)

Act on task 2 `Generate the missing tests directly based on the gaps I
identified?`

OK Kiro

## 82 upgrade user-guide

Upgrade the MarkDown document (named `user-guide.md`) acting as a
draft for a future user's guide to Passkeys. Adopt a concise style and
communicate concepts clearly. After a general introduction, one
section should describe how to use the webap and another section
should describe how to install, configure and initialize the Docker
container. A short final section describe how Passkeys had been mostly
generated by AI. Give code examples to help future users to bootstrap
`Passkeys`. To help the generation of the document, take screenshots,
etc. the webapp is available at `http://localhost:3000` and you may
use login `admin` and password `password`. Remember that the Git
repository is on `https://github.com/ChristianQueinnec/passkeys`.

OK Claude

## 83 Rate limiting

Propose a plan to limit failed validation attempts per IP.

Antigravity

Fix unit tests

Fix tests e2e

## 84 French translation

translate `user-guide.md` into French, store the translated content
into file `guide-utilisateur.md`

Vibe Mistral - weird result still to be thoroughly verified

## 85 Use PasswordInput

When changing login password, use PasswordInput rather than
an `input type=password` HTML element.

OK Antigravity

## 86 Markdown for Notes

Permit markdown for the 'notes' property of Password entries.

Antigravity unfinished, tests not generated.

The `Passkeys` project is described in the `README.md` file.
The 'notes' property of Password entries now support Markdown.
Generate e2e test to check that implementation.

Claude + small hand made fixes

## 87 Error clearing

Typing character in an input field while in an erroneous state should make
visible previous errors or comments vanish. Propose a plan to fix this.

CLAUDE

Proceed with phase 1 of the implementation plan

CLAUDE ERROR_*.md PHASE1_*.md 

Proceed with phase 2 of the implementation plan

## 88 Code Review

Examine the code of the server API (in `src/routes/api`) and check for
- Bugs: logic errors, off-by-one, null handling, race condition
- Security: injection risk, auth issues, data exposure
- Performance: N+1 queries, unnecessary loops, memory leaks
- Maintainability: Naming, complexity, duplication
- Edge cases: what inputs would break the webapp
For each issue:
- Severity: Critical / High / Medium / Low
- Location: file, line number
- What's wrong
- proposed fix 
Be harsh but do not edit any files.

Kiro/claude 

Can you write this report `API Security & Code Analysis Report` 
in the `APIsecurityReport.md` file

Kiro/claude APIsecurityReport.md

Check the fixes I have done

Kiro/claude

## 89 Refactor Language Switcher into Dropdown

change the language buttons into a menu, the title of which is
the current language. This will make easy adding new languages.

Antigravity OK

## 90 check importations

Check that importation such as `import from 'fs'` is rewritten into
`import from 'node:fs'` and similarly for other libraries such as 
`path` or `crypto`

Antigravity

Fix the `test.describe initialization` problem

Antigravity 

## 91 Unify Server Logging with Pino

unify logging on the server side. Use `pino` as framework.

Antigravity


# Potential FUTURE

bypass Login page if coming from authenticated nginx proxy ?

decipher vault only when copy to clipboard

blob for vault rather than base64

Remove the hack on the server side that accepts to download an
unciphered vault. Remove also the hint about unciphered vaults
stored on the server since none can be written by the server.

__TESTING__ in client-settings ?

