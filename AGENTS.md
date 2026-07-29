# The Passkeys project

The Passkeys project aims to produce a webapp mimicing Keepass.
Keepass (and its derivates Keepassx, Keepassxc, etc.) is great but
does not work equally on MacOS, Linux, Android, etc. so I want to
create a webapp with these capabilities.

This `AGENTS.md` file is thoroughly expanded in `README.md`.

The webapp has two sides: the server side and the client side both
written in Typescript with help of SvelteKit and Vite.

## Server side

The server side will offer an API (prefixed by `/api/`)
- to post login information (with username and password),
- to get the vault associated to the authenticated user,
- to list the vaults associated to the authenticated user with their date of recording,
- to put a revised vault associated to the authenticated user,
- to remove a vault based on its date of recording.

The default url of the server side (the `/` url) will deliver the
code of the client side. 

The server has no clue about how to decipher the vaults that is, the
crypted files of information. The server stores these vaults with
their date in a directory proper to every user. The vault file is a
JSON file that also contains a date property. Dates should be
displayed with ISO convention. However there is a special case needed
when importing passwords information (from Keepass for instance): a
vault may contain an unciphered array of Password entries. This
unciphered vault will be rewritten as soon as downloaded to a client
that cipher it and store it back ciphered. Unciphered vaults are 
explicitly signalled in the vault history.

Users' names and their hashed passwords are stored in a json file
(named `data/users.json`) only available to the server side. However
if the password does not contain a colon sign, that means that the
password is not hashed. In that case, the server should rewrite the
`users.json` file with all passwords hashed.

All the accesses to the server are logged. The server
will be ultimately deployed as a Docker container mounting the `data`
directory where are stored information files.

The `Passkeys` webapp can be installed as a PWA (Progressive Web
Application) with its appropriate favicon. Full internationalization
is provided for English and French users.

## Client side

The client side will run in any modern browser. It will allow some
user to authenticate and get the most recent associated vault. When
authenticated, the name of the user reveals a menu containing a
`logout` button. The webapp will then ask for the vault key allowing
to decipher that file. It must be possible to see temporarily the
vault or login password. Report explicitly if the vault cannot be
deciphered.

Authentication tokens are automatically renewed when the vault is
successfully unlocked. If an API call is rejected with a 401 
Unauthorized error (e.g., due to session expiration), the client 
automatically forces reauthentication by clearing sensitive data and 
returning to the login screen.

if on a safe device, when the client receives a vault, it stores it
persistently but still ciphered in the browser so it may be used in
case of missing Internet connectivity. Storage operations are 
resilient to corruption or environmental restrictions. Of course, 
reusing that stored vault requires vault key. Report to the user that 
the vault might be out of date and allow to synchronize with the new 
version held in the server.

On an unsafe device, the vault and authentication information should
not be stored persistently.

Information stored in a vault are made of a title, a group, a
username, a password, a site URL, some tags (simple words) as well as
some textual notes. Only the title is mandatory.

Once deciphered in the browser, the vault entries' titles are displayed
and may be filtered. The filter is a string that may appear in all the
textual fields of an information (case is not important). When one
information is clicked, it is fully displayed in a popup (the password
is rendered with stars), the site url when clicked will display the
site in another tab. the username and the password may be clicked and
copied in order to be pasted elsewhere.

A view with folders based on the `group` properties of vault entries
is also provided. Entries may be dragged and dropped onto folders in
order to group related vault entries.

Vault entries may be individually managed that is, removed or edited.
When the vault is modified, propose a button to save it on the
server after ciphering it.

## Rules

The webapp may be used on a device you trust or not. Moreover this
device may be online or offline.

Of course, test files should also be generated to test the server and
the client sides. Use Vitest for unit testing and Playwright for
component and E2E testing. Place these files under the `tests`
directory and add scripts entries in `package.json`.

After a prompt is successfully complete, run all tests to avoid
regression, also run Svelte check diagnostics.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
