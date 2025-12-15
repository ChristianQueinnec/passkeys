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

Add, in the user menu, a `synchronize` menu item to fetch again the most
recent vault to replace the current local vault.

Develop an independent script (in TypeScript) to process a csv file of
group, title, username, password, url, notes to fill the vault. The
`group` value will fill the `tags` field as follows
- suppress the `keepass` prefix
- use slashes to split the value
- use the remaining words as individual tags



unify button styles: adopt round corners and appropriate color.


