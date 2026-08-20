# Guide de l'Utilisateur Passkeys

Un guide complet pour utiliser l'application web sécurisée Passkeys pour gérer vos mots de passe et informations sensibles.

---

## 📋 Table des Matières

- [Aperçu](#aperçu)
- [Premiers Pas](#premiers-pas)
- [Interface Utilisateur](#interface-utilisateur)
- [Gestion du Coffre-Fort](#gestion-du-coffre-fort)
- [Organisation des Entrées](#organisation-des-entrées)
- [Sécurité et Confidentialité](#sécurité-et-confidentialité)
- [Mode Hors Ligne](#mode-hors-ligne)
- [Messages et Avertissements](#messages-et-avertissements)
- [Synchronisation Multi-Appareils](#synchronisation-multi-appareils)
- [Dépannage](#dépannage)
- [Questions Fréquentes](#questions-fréquentes)

---

## Aperçu

Passkeys est une application web moderne et sécurisée pour gérer vos mots de passe et informations sensibles. Inspiré par KeePass mais conçu comme une application web progressive (PWA), Passkeys offre une expérience cohérente sur toutes les plateformes.

### Pourquoi choisir Passkeys ?

- **Indépendance de Plateforme** : Fonctionne identiquement sur tout navigateur moderne
- **Chiffrement de Bout en Bout** : Vos données sont chiffrées côté client ; le serveur ne voit jamais vos informations
- **Fonctionnalité Hors Ligne** : Accédez à vos mots de passe même sans connexion internet
- **Application Web Progressive** : Installez-la comme une application native sur n'importe quel appareil
- **Open Source** : Construit avec des technologies modernes et maintenables

---

## Premiers Pas

### Installation

1. **Accéder à l'application** : Ouvrez votre navigateur et allez sur l'URL de Passkeys
2. **Créer un compte** : Cliquez sur "S'inscrire" et suivez les instructions
3. **Se connecter** : Utilisez votre nom d'utilisateur et mot de passe

### Configuration Initiale

1. **Définir un mot de passe maître** : Ce sera utilisé pour chiffrer/déchiffrer votre coffre-fort
2. **Configurer la confiance de l'appareil** : Choisissez si cet appareil est "sûr" ou "non sûr"
   - **Appareil sûr** : Les données sont stockées localement pour un accès hors ligne
   - **Appareil non sûr** : Aucune donnée n'est stockée localement

---

## Interface Utilisateur

### Tableau de Bord

Le tableau de bord est votre centre de contrôle principal avec deux vues disponibles :

#### Vue Liste
- Affiche toutes vos entrées de mot de passe dans une liste plate
- Filtrez par titre, nom d'utilisateur, site, tags ou notes
- Triez par titre (ordre alphabétique)

#### Vue Dossiers
- Organise les entrées de manière hiérarchique
- Glissez-déposez les entrées entre les dossiers
- Navigation par arbre pour les grandes collections

### Barre de Recherche

- **Recherche instantanée** : Tapez pour filtrer toutes les entrées
- **Recherche globale** : Cherche dans tous les champs (titre, utilisateur, site, tags, notes)
- **Insensible à la casse** : "Gmail" et "gmail" donneront les mêmes résultats

### Contrôles du Coffre-Fort

- **Nouvelle Entrée** : Ajoutez un nouveau mot de passe
- **Enregistrer** : Enregistrez les modifications sur le serveur
- **Synchroniser** : Vérifiez les mises à jour du serveur
- **Historique** : Accédez aux versions précédentes
- **Basculer la Vue** : Passez entre les vues Liste et Dossiers

---

## Gestion du Coffre-Fort

### Créer une Nouvelle Entrée

1. Cliquez sur "Nouvelle Entrée"
2. Remplissez les détails :
   - **Titre** (obligatoire) : Nom du service (ex: "Gmail")
   - **Nom d'utilisateur** : Votre identifiant de connexion
   - **Mot de passe** : Votre mot de passe (peut être généré)
   - **Site** : URL du service (ex: "https://gmail.com")
   - **Groupe** : Catégorie (ex: "Réseaux Sociaux/Personnel")
   - **Tags** : Mots-clés pour la recherche (ex: ["email", "important"])
   - **Notes** : Informations supplémentaires
3. Cliquez sur "Enregistrer"

### Modifier une Entrée

1. Sélectionnez une entrée dans la liste
2. Cliquez sur "Modifier"
3. Mettez à jour les champs nécessaires
4. Cliquez sur "Enregistrer"

Le champ **Nom d’utilisateur** est une combo box modifiable. Elle suggère uniquement les adresses e-mail présentes dans au moins deux autres entrées, tout en permettant de saisir manuellement un autre nom d’utilisateur. Le champ **Mot de passe** propose le bouton **Générer un mot de passe**, qui produit un mot de passe au format `XXXX-XXXX.XXXX;XXXX=XXXX`. Les caractères ambigus comme `O`, `0`, `I`, `l`, `1` et `i` sont évités.

### Supprimer une Entrée

1. Sélectionnez une entrée
2. Cliquez sur "Supprimer"
3. Confirmez la suppression

### Générer des Mots de Passe Sécurisés

Lors de la création ou de la modification d’une entrée, cliquez sur **Générer un mot de passe**. Le mot de passe produit suit le format `XXXX-XXXX.XXXX;XXXX=XXXX`, avec des lettres et des chiffres choisis aléatoirement. Les caractères difficiles à distinguer selon les polices, notamment `O`, `0`, `I`, `l`, `1` et `i`, sont exclus.

---

## Organisation des Entrées

### Utilisation des Dossiers

1. **Créer un dossier** : Dans la vue Dossiers, cliquez sur "Nouveau Dossier"
2. **Renommer un dossier** : Cliquez avec le bouton droit sur un dossier et sélectionnez "Renommer"
3. **Déplacer des entrées** : Faites glisser les entrées vers les dossiers
4. **Dossiers imbriqués** : Créez des hiérarchies (ex: "Travail/Email", "Travail/Banque")

### Utilisation des Tags

- **Ajouter des tags** : Séparés par des virgules dans le champ Tags
- **Recherche par tags** : Tapez un tag dans la barre de recherche
- **Tags populaires** : Les tags fréquemment utilisés apparaissent en premier

### Tri et Filtrage

- **Tri** : Cliquez sur l'en-tête "Titre" pour trier alphabétiquement
- **Filtrage** : Utilisez la barre de recherche pour filtrer
- **Filtres avancés** : Combinez plusieurs termes de recherche

---

## Messages et Avertissements

Les messages toast, notamment les avertissements et les erreurs, disposent d’un bouton de fermeture et peuvent être masqués immédiatement. Les notifications persistantes, comme l indicateur du mode hors ligne, restent visibles tant que la situation correspondante est active.

## Sécurité et Confidentialité

### Chiffrement

- **Chiffrement AES-GCM 256 bits** : Standard de l'industrie pour la sécurité
- **Dérivation de clé PBKDF2** : 100 000 itérations pour une sécurité renforcée
- **Chiffrement côté client** : Votre mot de passe maître ne quitte jamais votre appareil

### Gestion des Mots de Passe

- **Visibilité du mot de passe** : Cliquez sur l'icône œil pour révéler temporairement
- **Copier dans le presse-papiers** : Les mots de passe sont automatiquement effacés après 10 secondes
- **Déconnexion automatique** : Après 2 minutes d'inactivité

### Appareils de Confiance

- **Appareil sûr** : Les données sont stockées localement pour un accès hors ligne
- **Appareil non sûr** : Aucune donnée n'est stockée localement
- **Changer la confiance** : Dans les paramètres de sécurité

---

### Paramètres des délais de sécurité

Depuis le menu utilisateur, vous pouvez modifier en minutes le délai de verrouillage après inactivité et la durée de disponibilité du déverrouillage rapide. Sur un appareil sûr, ces valeurs sont conservées localement ; sur un appareil non sûr, elles ne s appliquent qu à la session en cours.

## Mode Hors Ligne

### Travailler Hors Ligne

1. **Accès hors ligne** : Vos données chiffrées sont disponibles même sans internet
2. **Modifications locales** : Les changements sont enregistrés localement
3. **Synchronisation automatique** : Les modifications sont synchronisées lorsque vous êtes de nouveau en ligne

### Gestion des Conflits

- **Détection des conflits** : Passkeys détecte si le serveur a une version plus récente
- **Résolution des conflits** : Choisissez de conserver la version locale ou serveur
- **Historique des versions** : Accédez aux versions précédentes si nécessaire

---

## Synchronisation Multi-Appareils

### Configuration de la Synchronisation

1. **Connectez-vous** sur chaque appareil
2. **Marquez les appareils comme sûrs** pour la persistance locale
3. **Les modifications sont automatiquement synchronisées** entre les appareils

### Bonnes Pratiques

- **Évitez les modifications simultanées** sur plusieurs appareils
- **Enregistrez fréquemment** pour minimiser les conflits
- **Vérifiez l'indicateur de synchronisation** pour vous assurer que tout est à jour

---

## Dépannage

### Problèmes Courants

#### Je ne peux pas me connecter
- **Vérifiez votre nom d'utilisateur/mot de passe**
- **Réinitialisez votre mot de passe** si nécessaire
- **Effacez le cache du navigateur** si le problème persiste

#### Mon coffre-fort ne se déchiffre pas
- **Vérifiez votre mot de passe maître** (sensible à la casse)
- **Essayez sur un autre appareil** si disponible
- **Restaurez à partir de l'historique** si vous avez une sauvegarde

#### Les modifications ne sont pas enregistrées
- **Vérifiez votre connexion internet**
- **Actualisez la page** et réessayez
- **Vérifiez l'espace de stockage** sur votre appareil

#### L'application est lente
- **Effacez le cache** du navigateur
- **Fermez les onglets inutiles**
- **Utilisez un navigateur moderne** (Chrome, Firefox, Edge, Safari)

---

## Questions Fréquentes

### Q : Puis-je utiliser Passkeys sur mon téléphone ?
**R** : Oui ! Passkeys est une application web progressive qui fonctionne sur tous les appareils modernes, y compris les smartphones et tablettes.

### Q : Que se passe-t-il si j'oublie mon mot de passe maître ?
**R** : Malheureusement, sans votre mot de passe maître, vos données ne peuvent pas être récupérées. C'est une mesure de sécurité essentielle - même nous ne pouvons pas accéder à vos données.

### Q : Mes données sont-elles sécurisées sur vos serveurs ?
**R** : Oui ! Toutes vos données sont chiffrées côté client avant d'être envoyées à nos serveurs. Nous ne stockons que des données chiffrées et n'avons aucun moyen de les déchiffrer.

### Q : Puis-je importer des données depuis d'autres gestionnaires de mots de passe ?
**R** : Actuellement, Passkeys prend en charge l'importation depuis KeePass. D'autres formats seront ajoutés à l'avenir.

### Q : Combien d'appareils puis-je connecter ?
**R** : Il n'y a pas de limite au nombre d'appareils que vous pouvez connecter à votre compte Passkeys.

### Q : Que se passe-t-il si je perds mon appareil ?
**R** : Si vous avez marqué l'appareil comme "sûr", vous devriez révoquer son accès depuis un autre appareil sûr. Vos données restent sécurisées car elles sont chiffrées.

### Q : Puis-je partager des mots de passe avec d'autres personnes ?
**R** : Actuellement, Passkeys ne prend pas en charge le partage de mots de passe. Cette fonctionnalité est prévue pour les versions futures.

### Q : À quelle fréquence mes données sont-elles sauvegardées ?
**R** : Passkeys enregistre automatiquement vos modifications lorsque vous êtes en ligne. Vous pouvez également sauvegarder manuellement à tout moment.

### Q : Puis-je utiliser Passkeys sans connexion internet ?
**R** : Oui ! Une fois que vous avez chargé votre coffre-fort, vous pouvez y accéder et le modifier hors ligne. Les modifications seront synchronisées lorsque vous serez de nouveau en ligne.

### Q : Comment puis-je exporter mes données ?
**R** : Vous pouvez exporter votre coffre-fort depuis les paramètres. Vos données seront exportées sous forme chiffrée pour une sécurité maximale.

---

## Support

Si vous avez besoin d'aide supplémentaire :

- **Consultez notre documentation** : [Lien vers la documentation]
- **Signalez un problème** : [Lien vers le suivi des problèmes]
- **Contactez notre équipe** : [Adresse e-mail de support]

---

**Note** : Ce guide est mis à jour régulièrement. Pour les dernières fonctionnalités et instructions, consultez toujours la version en ligne la plus récente.

---

## Glossaire

- **Chiffrement de bout en bout** : Un système où seul vous pouvez déchiffrer vos données
- **Mot de passe maître** : Le mot de passe principal utilisé pour déchiffrer votre coffre-fort
- **Appareil sûr** : Un appareil où les données peuvent être stockées localement
- **Appareil non sûr** : Un appareil où aucune donnée n'est stockée localement
- **PWA (Application Web Progressive)** : Une application web qui peut être installée comme une application native
- **Synchronisation** : Le processus de mise à jour de vos données sur tous vos appareils