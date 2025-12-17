# The Passkeys project

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
