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
OK CLAUDE

Add CSRF to forms

Add new tests to check the CSRF feature, add also missing tests 
related to the vault synchronization.

Fix the `npm run test:unit` 

For every entry in the dashboard, add a `copy username` and a 
`copy password` buttons using small icons rather than text. 
Also use a small icon for the View button.

