# The Passkeys project

The Passkeys project aims to produce a webapp mimicing keepass.
Keepass (and its derivates keepassx, keepassxc, etc.) is great but
does not work equally on MacOS, Linux, Android, etc. so I want to
create a webapp with these capabilities.

The webapp has two sides: the server side and the client side both
written in Typescript with help of SvelteKit.

The server side will offer an API (prefixed by `/api/`)
- to post login information (with username and password),
- to get the crypted file of information associated to the authenticated user,
- to list the crypted files of information associated to the authenticated user with their date of recording,
- to put a revised version of information associated to the authenticated user,
- to remove a crypted file of information based on its date of recording.

The default url of the server side (the `/` url) will deliver the
code of the client side. 

The server has no clue about how to decipher the vaults that is, the
crypted files of information. The server stores these vaults
with their date in a directory proper to every user. The vault file
is a JSON file that also contains a date property. Dates should be
displayed with ISO convention.

Users' names and their hashed passwords are stored in a json file only
available to the server side. However if the password does not contain
a colon sign, that means that the password is not hashed. In that case,
the `users.json` file should be rewritten with all passwords hashed.

All the accesses to the server are logged. The server
will be ultimately deployed as a Docker container mounting the `data`
directory where are stored information files.

The client side will run in any modern browser. It will allow some
user to authenticate and get the most recent associated vault. When
authenticated, the name of the user appears along a `logout` button.
The `Enter` key submits the form if username and password are filled.
The webapp will then ask for the pass phrase allowing to decipher that
file. The `Enter` key submits the form if a pass phrase is present.
It must be possible to see temporarily the pass phrase.
Report explicitly if the vault cannot be deciphered.

Information stored in a vault are made of a title, a username, a
password, a site URL, some tags (simple words) as well as some textual
notes. Only the title is mandatory.

Once deciphered in the browser, the information titles are displayed
and may be filtered. The filter is a string that may appear in all the
textual fields of an information (case is not important). When one
information is clicked, it is fully displayed in a popup (the password
is rendered with stars), the site url when clicked will display the
site in another tab. the username and the password may be clicked and
copied in order to be pasted elsewhere.

Information may be individually managed that is, removed or edited.
When the vault is modified, propose a button to save it on the
server after ciphering it.

Of course, test files should also be generated to test the server and
the client sides. Use Vitest for unit testing and Playwright for
component and E2E testing. Place these files under the `tests`
directory and add scripts entries in `package.json`.

Systematically When a new version of the webapp is ready and checked,
increment the `version` property in `package.json`. Also add new test
files to check the newly implemented features.
