# Passkeys

The Passkeys project aims to produce a webapp mimicing keepass.
Keepass (and its derivates keepassx, keepassxc, etc.) is great but
does not work equally on MacOS, Linux, Android, etc. so I want to
create a webapp with these capabilities.

The webapp will consist of a server and a client both written in
Typescript with help of Svelte5. 

The server will offer an API 
- to post login information (with username and password),
- to get the crypted file of information associated to the authenticated user,
- to list the crypted files of information associated to the authenticated user with their date of recording,
- to put a revised version of information associated to the authenticated user,
- to remove a crypted file of information based on its date of recording.

The server has no clue about how to decipher the crypted files of
information. The server stores these crypted files with their date.
All the accesses to the server are logged. The server
will be ultimately deployed as a Docker container. 

The client will run in any modern browser. It will allow some user to
authenticate and get the associated file of information. It will then
ask for the key allowing to decipher that file. Information are made
of a title, a username, a password, a site URL, some tags (simple
words) as well as some textual notes. Only the title is mandatory.

Once deciphered, the information titles are displayed and may be
filtered. The filter is a text that may appear in all the textual
fields of an information. When one information is clicked, it is fully
displayed (the password is rendered with stars), the site url when
clicked will display the site in another tab. the username and the
password may be clicked and copied in order to be pasted.

Information may be individually managed that is, removed or edited and
finally saved on the server.

