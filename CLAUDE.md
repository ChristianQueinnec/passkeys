# The Passkeys project

## Project Overview

You are an expert in typescript debugging. You are in the directory
`/home/queinnec/Passkeys/` where was developped a password manager
named `Passkeys`. The Passkeys project aims to produce a webapp
mimicing keepass. Keepass (and its derivates keepassx, keepassxc,
etc.) is great but does not work equally on MacOS, Linux, Android,
etc. so I want to create a webapp with these capabilities.

## Context

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
The webapp will then ask for the vault key allowing to decipher that
file. The `Enter` key submits the form if a vault key is present. It
must be possible to see temporarily the vault key. Report explicitly
if the vault cannot be deciphered and ask to input again another vault
key.

When the client receives a vault, it stores it persistently but always
ciphered in the browser so it may be used in case of missing Internet
connectivity. Of course, reusing that stored vault requires vault key.
Report to the user that the vault might be out of date. If the
received vault is an array, then the vault is not crypted and should
be: this is to help the bootstrap of the vault.

Information stored in a vault are made of PaswordEntries. A
PasswordEntry is made of a group, a title, a username, a password, a
site URL, some tags (simple words) as well as some textual notes. Only
the title is mandatory.

Once deciphered in the browser, the information titles are displayed
and may be filtered. The filter is a string that may appear in all the
textual fields of an information (case is not important). When one
information is clicked, it is fully displayed in a popup (the password
is rendered with stars), the site url when clicked will display the
site in another tab. the username and the password may be clicked and
copied in order to be pasted elsewhere.

PasswordEntries may be individually managed that is, removed or edited.
When the vault is modified, propose a button to save it on the server
after ciphering it.

Of course, test files should also be generated to test the server and
the client sides. Use Vitest for unit testing and Playwright for
component and E2E testing. Place these files under the `tests`
directory and add scripts entries in `package.json`.
