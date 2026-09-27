# Documentation technique

## Organisation

```text
.
├── index.html          # Structure de l’interface en français
├── styles.css          # Présentation et adaptation aux petits écrans
├── app.js              # Import, état, recherche et rendu de l’interface
├── har.js              # Lecture et filtrage des données HAR
├── har.test.js         # Tests du parseur avec node:test
├── profiler.js         # Décodage Base64, décompression gzip et lecture UTF-8
├── profiler.test.js    # Tests du décodage et des données invalides
├── profiler-view.js    # Explorateur dépliable et sections de texte brut
├── request-sort.js     # Tri des requêtes sans mutation des données
├── request-sort.test.js # Tests des cinq critères de tri
├── package.json        # Commandes pratiques, sans dépendances
├── README.md           # Installation et utilisation
├── CONTRIBUTING.md     # Développement et vérifications
└── docs/
    └── architecture.md
```

## Flux de données

1. L’utilisateur sélectionne ou dépose un fichier ; `File.text()` en lit le contenu.
2. `parseHar()` analyse le JSON et vérifie que `log.entries` est un tableau.
3. Pour chaque entrée, seuls les éléments de `response.headers` sont examinés. Le nom doit être exactement `x-cat-profiler`, sans tenir compte de la casse.
4. Le parseur retourne le nombre total d’entrées et les requêtes correspondantes.
5. Chaque valeur est décodée avec `atob`, décompressée via `DecompressionStream('gzip')`, puis lue avec `TextDecoder` en UTF-8 strict. L’interface ajoute `decodedProfiler` à chaque correspondance : une liste de résultats `{ text, error }`, dans l’ordre des valeurs brutes. Une erreur reste propre à la valeur concernée.
6. L’interface affiche le texte décompressé, les statistiques et les résultats de recherche. Le détail conserve aussi les valeurs Base64 originales.

Un header présent uniquement dans la requête n’est pas une correspondance. Un header de réponse avec une valeur vide est une correspondance. Si le header est répété, toutes ses valeurs sont conservées.

## Contrat du parseur

`parseHar(text)` est une fonction exportée indépendante du DOM. Elle retourne `{ total, matches }`.

Chaque correspondance contient :

| Champ | Contenu |
| --- | --- |
| `id` | Index de l’entrée dans le HAR |
| `method` | Méthode HTTP ou `—` si absente |
| `url` | URL ou chaîne vide si absente |
| `status` | Statut HTTP fourni par le HAR |
| `time` | Durée en millisecondes ; `null` si absente ou négative |
| `headers` | Liste originale des headers de réponse |
| `profiler` | Liste des valeurs du header recherché |
| `started` | Date fournie par `startedDateTime`, si présente |

Le parseur lève une erreur pour un JSON invalide ou une structure sans tableau `log.entries`. Il ignore les entrées sans tableau de headers de réponse exploitable. Il ne valide pas l’intégralité du schéma HAR.

## État et affichage

`parseProfiler(text)` dans `profiler.js` retourne `{ roots, count, unparsed }`. Chaque étape contient `name`, `level`, `time` (millisecondes) et `children`. Une pile rattache chaque ligne au dernier ancêtre de niveau inférieur, en préservant les doublons, l’ordre et les niveaux sautés. Le séparateur final ` == durée ms` permet de conserver les espaces et signes `=` dans les noms. Les durées décimales (point ou virgule) sont acceptées ; les lignes non reconnues sont conservées avec leur numéro.

`profiler-view.js` construit l’explorateur à l’ouverture du détail, avec des éléments natifs `details` / `summary` utilisables au clavier. Les deux premières profondeurs sont ouvertes initialement. Les boutons globaux n’affectent que les étapes du profil concerné. Les barres comparent chaque durée à celle de sa racine ; elles ne représentent pas une chronologie. Les durées ne sont ni recalculées ni cumulées, car les temps des parents incluent déjà leurs sous-étapes. Une racine à zéro ne produit pas de division par zéro. Le texte brut reste consultable, notamment pour les lignes non reconnues.

L’analyse courante reste en mémoire. Un import valide remplace l’analyse précédente et réinitialise la recherche. Un import invalide affiche une erreur et conserve les résultats précédents. Un compteur de génération évite qu’une lecture de fichier ancienne remplace une action plus récente.

La recherche compare sans tenir compte de la casse l’URL, la méthode, le statut et les valeurs brutes et décompressées de `x-cat-profiler`. Les statistiques portent sur l’intégralité du fichier, même lorsqu’une recherche réduit la liste affichée. La décompression est asynchrone ; le compteur de génération empêche également un résultat de décompression ancien de remplacer une analyse plus récente.

Le détail est une boîte de dialogue native. Les chaînes provenant du HAR sont insérées avec `textContent`, sans interprétation HTML. Aucune URL importée n’est automatiquement ouverte ou appelée.

`sortRequests()` applique le tri après la recherche, sur une copie de la liste. Méthode, URL complète et texte décompressé sont comparés avec une collation française insensible à la casse et tenant compte des nombres dans les chaînes. Statuts et durées sont comparés numériquement ; les valeurs numériques absentes restent en dernier dans les deux sens. Les égalités sont départagées par l’index original dans le HAR. Les boutons d’en-tête exposent le sens du tri via `aria-sort`. Le choix reste actif pendant les recherches et imports.

## Confidentialité et limites

- Aucun fichier n’est envoyé à un serveur ; le serveur local sert uniquement les ressources de l’application.
- Aucun cookie, stockage persistant, outil de suivi ou ressource distante n’est utilisé par l’application.
- Le fichier entier est lu en mémoire et le JSON est analysé dans le thread principal.
- Toutes les correspondances sont rendues dans le tableau : les gros fichiers peuvent ralentir l’interface. Il n’y a ni pagination, ni Web Worker, ni limite de taille imposée.
- Les tests automatisés portent sur le parseur ; aucune suite de tests navigateur n’est fournie.

## Hébergement

L’application peut être servie par un hébergement statique, sans compilation ni backend. Les ressources utilisent des chemins relatifs, ce qui permet un hébergement dans un sous-répertoire.

Les fichiers nécessaires à la publication sont `index.html`, `styles.css`, `app.js`, `har.js`, `profiler.js`, `profiler-view.js` et `request-sort.js`. Servir les fichiers JavaScript avec un type MIME compatible, par exemple `text/javascript`. Ne pas publier les captures locales ni les métadonnées Git.
