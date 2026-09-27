# Cat Profiler

Application web en français qui importe un fichier HAR et affiche les requêtes dont les **headers de réponse** contiennent `x-cat-profiler` (comparaison insensible à la casse).

## Prérequis et démarrage

Un navigateur récent et Python 3 suffisent pour lancer l’application. Node.js 18 ou ultérieur est nécessaire uniquement pour les tests. Il n’y a aucune dépendance à installer.

Depuis ce dossier :

```sh
python3 -m http.server 3000
```

Ouvrir http://localhost:3000. Aucun paquet à installer. L’application utilise les modules JavaScript : la servir par HTTP plutôt que d’ouvrir directement `index.html`.

Si npm est installé, `npm start` lance le même serveur Python.

## Utilisation

- Sélectionner ou déposer un fichier `.har` ou `.json`.
- Consulter le nombre total de requêtes et les réponses avec le header recherché.
- Filtrer par URL, méthode, statut ou valeur du header.
- Ouvrir le détail d’une ligne pour voir la valeur complète et tous les headers de réponse.
- Le header est décodé depuis Base64, puis décompressé avec gzip et lu en UTF-8. Le tableau affiche ce texte et la recherche porte aussi sur son contenu. Le détail conserve la valeur brute. Une valeur invalide affiche une erreur sans masquer les autres requêtes.
- « Explorer un exemple » charge des données fictives pour essayer l’interface.

Le filtre ne tient compte que des headers de **réponse**. Les valeurs vides et les headers répétés sont conservés. Le détail présente les valeurs complètes. Le raccourci `/` place le curseur dans la recherche et Échap ferme le détail.

Pour créer un HAR, ouvrir les outils de développement du navigateur, accéder à **Réseau / Network**, recharger la page puis exporter les requêtes au format HAR.

L’analyse reste en mémoire dans le navigateur : aucun téléversement, service externe, stockage persistant ou dépendance distante. Les valeurs du HAR sont affichées comme du texte. Un nouveau fichier remplace l’analyse précédente ; « Retirer » la réinitialise. Les fichiers volumineux peuvent ralentir le navigateur, car l’analyse JSON et le rendu sont réalisés dans le thread principal.

## Tests

Avec Node.js 18 ou ultérieur :

```sh
npm test
```

Tests du filtre sur les headers de réponse, de la casse, des valeurs vides et dupliquées, et des fichiers invalides.

Les tests vérifient également le décodage Base64/gzip, le texte Unicode et les données invalides ou tronquées. La décompression utilise l’API native `DecompressionStream` : un navigateur qui ne la prend pas en charge affiche un message dans le détail.

Sans npm, utiliser directement `node --test`.

## Documentation

- [Architecture, fonctionnement et hébergement](docs/architecture.md)
- [Guide de contribution et vérifications](CONTRIBUTING.md)

## Gestion du dépôt Git

Les captures `*.har`, les fichiers de configuration locale et les dossiers des outils sont exclus via `.gitignore`. Pour les captures au format JSON, utiliser le dossier local `captures/`, également ignoré.

Si le répertoire n’est pas encore initialisé :

```sh
git init -b main
```

Vérifier les fichiers avant de créer le premier commit :

```sh
git status --short
git add .
git diff --cached --stat
git commit -m "Initialise Cat Profiler et sa documentation"
```

Après avoir créé un dépôt distant vide, remplacer `URL_DU_DEPOT` par son URL :

```sh
git remote add origin URL_DU_DEPOT
git push -u origin main
```
