# Contribuer

## Environnement

- Python 3 pour servir les fichiers statiques en local.
- Node.js 18 ou ultérieur pour les tests ; npm est facultatif.
- Un navigateur récent prenant en charge les modules JavaScript et `<dialog>`.

Aucune installation de dépendances ni compilation n’est nécessaire.

```sh
python3 -m http.server 3000
```

Ouvrir http://localhost:3000.

## Modifier le code

La structure et les responsabilités des fichiers sont décrites dans [la documentation technique](docs/architecture.md). Conserver le traitement local des captures et utiliser `textContent` pour afficher les données importées.

Utiliser des captures fictives pour les tests ou démonstrations. Les fichiers `*.har` et le dossier `captures/` sont ignorés par Git. Placer également les captures personnelles au format JSON dans `captures/`.

## Vérifier une modification

Exécuter les tests du parseur :

```sh
node --test
```

Ou, si npm est disponible :

```sh
npm test
```

Pour une modification de l’interface, vérifier manuellement :

1. L’exemple intégré affiche 8 requêtes au total et 5 réponses profilées.
2. L’import fonctionne par sélection et par glisser-déposer.
3. La recherche filtre les résultats et le détail affiche tous les headers de réponse.
4. Un JSON invalide affiche une erreur ; un HAR sans correspondance affiche un état vide.
5. « Retirer » réinitialise les résultats et permet un nouvel import.
6. L’interface reste utilisable sur mobile et au clavier, notamment la fermeture du détail avec Échap.
7. L’exemple affiche « Exemple de profil : réponse générée en 42 ms ». La recherche « générée » retrouve les 5 réponses profilées ; le détail présente aussi le Base64 brut.
8. Un header Base64 ou gzip invalide affiche une erreur sur sa ligne, sans bloquer les valeurs valides du fichier.

Les tests automatisés couvrent le parseur ; ils ne remplacent pas une vérification de l’interface dans le navigateur.
