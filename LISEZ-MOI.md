# Le projet Passkeys

## Présentation

Un gestionnaire de mot de passe inspiré de KeyPass. Ce gestionnaire
repose sur un serveur alimentant tous les navigateurs possibles
(ordinateur, tablette ou téléphone) de toutes les plates-formes
(MacOS, Linux, Windows, Android, iOS, etc.). Le serveur stocke les
coffres-forts où sont archivés les mots de passe sous forme chiffrée
mais n'a aucune connaissance des clés utilisées pour ces chiffrements.
Les coffres-forts ne sont déchiffrés (temporairement dans un
navigateur) que pour en extraire un nom d'utilisateur ou son mot de
passe associé. 

## Mise en œuvre rapide

Lancez un serveur et notez les informations de connexion qui
seront imprimées. 

```bash
git clone git@github.com:ChristianQueinnec/passkeys.git
cd passkeys/
make run
```

Puis lancez un navigateur sur l'URL suggérée (normalement
`http://localhost:3000/`), connectez vous avec les informations de
connexion enoncées plus haut (nom de connexion et mot de passe).
Inventez un mot de passe pour le coffre-fort initial qui a été
engendré en guise d'exemple.

## Export depuis KeePass

Exportez vos informations sous la forme d'un CSV, disons `pass.csv`,
puis convertissez ce fichier en JSON avec

```bash
cd KeePass2Passkeys/ 
ts-node csv-to-json.ts ../pass.csv ../data/${USER}/init.vault
```

Et demandez, dans votre navigateur, à vous synchroniser avec le
serveur: le coffre-fort `init.vault` sera alors importé et chiffré.
Vous n'aurez plus qu'à le sauvegarder puis, en demandant l'historique,
à supprimer le fichier `init.vault` pour ne pas laisser une copie de
vos informations sensibles non chiffrées.
