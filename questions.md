# Additional requests to Antigravity

These requests are too specific to be present in `README.md`.

Does `fs-extra` really needed ? 
NO 

Generate a svg image showing a key in a cartoonish style. Derive a favicon from that image and install them in the webapp.
OK

Make the webapp a Progressive Web Application (aka PWA).
OK -- but sw.js and manifest are handled by Vite.
   -- however the Docker container generation is ok.

Also provide a `favicon.ico`
OK -- but specify that the favicon.ico should be derived from favicon.svg

Transform the logout button into a menu item under the username.
Provide also another menu item to change the user's password
OK

Is it possible to share common CSS sections in svelte files into `app.css`
OK

There are many missing test files not covering use cases. Please
add them as needed.
OK

Please add e2e test files using playwright.
UNFINISHED

offline mode (described in README)

If the vault received from the server is an array of JSON objects
instead of the usual `date` and `data` properties, then the vault is
not encrypted and the array is an array of entries. The client then
encrypts this array into the usual format and save the now ciphered
vault. Keep the extra properties that may appear in the items of the
array.
OK

Bug in saveVault: fixed by CLAUDE1.md


Add, in the user menu, a `synchronize` menu item to fetch the most
recent vault in order to replace the current local vault.
OK CLAUDE

unify button styles: adopt round corners and appropriate color.
OK CLAUDE BUTTON_STYLES.md

Add CSRF to forms
OK CLAUDE CSRF_PROTECTION.md

Add new tests to check the CSRF feature, add also missing tests 
related to the vault synchronization.
CLAUDE...

Fix the `npm run test:unit` 
OK Antigravity

For every entry in the dashboard, 
- use a more compact disposition, 
- the title is a link to the site URL 
- add a `copy username` and a `copy password` buttons using small icons rather than text. 
- Also use a small icon for the View button.
OK Antigravity

Fix the `npm run test:e2e` 
OK Antigravity

Add a test to check that, in Dashboard, entries are listed in
alphabetical order of titles.
OK Antigravity

In the `Filter` input, add a button (at the right of the input field)
to reset the filter.
OK Antigravity

In Dashboard function loadVault, when ciphering an array of
PasswordEntry, provide an id property when missing. This will help
when deleting a PasswordEntry.
OK Antigravity

For all input[type=password], provide a show password option as an 
eye (open or not) in the right part of the input field to control
whether the password is visible.
OK CLAUDE

When a username or a password is copied to the clipboard, ensure that the clipboard
is reset after 10 seconds. 
OK Antigravity

Please check unit tests and provide additional ones if some features are not covered.
OK Antigravity

In order to ensure more security, ensure that, if the webapp UI is not
used for a minute, then all usernames and passwords are erased from
browser active memory. The next user interaction will have then to
decipher again the vault without asking the user to input the vault key.
Antigravity + a la main

The Dashboard file is too big. Create new components for the History Modal, the
Editor Modal and the Dails Modal.
OK Antigravity

Fix the `tests/e2e/history.spec.ts` test. 
OK Antigravity
 
Periodically check if the webapp may quit the Offline Mode that is, if
saving or synchronizing the vault can be done safely. Report if a more
recent version the vault is available.
OK Antigravity

Please enhance the README of the Passkeys project.
OK Antigravity

update modified property
HAND made

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

Clicking on a folder that have subfolders does not display its subfolders.
CLAUDE SUBFOLDER_FIX.md
OK but not very satisfying

It would be better, when clicking on the '>' character preceding the
name of a folder, to display the subfolder right below it (with a small
indentation). It is still good to list the entries on the right pane.
CLAUDE FOLDER_NAVIGATION_IMPROVEMENT.md NAVIGATION_QUICKREF.md
OK but not at all satisfying
so we revert and prepare a new prompt.

## New prompt

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

There are too much common code between Dashboard and FolderDashboard,
propose a plan to refactor.
CLAUDE REFACTORING_*.md

proceed with that plan
CLAUDE 


## Future

bypass Login page if coming from authenticated nginx proxy ?

client-settings.json
  pollForUpdates
  inactivityTimer
  seed for hash
  s/useVaultSync/startVaultSync/g

drag and drop entry to folder

decipher only when copy to clipboard

rebuild folder tree after vault change.
