# MINITMAN Web

Recréation navigateur de MINIT MAN, avec une vue panoramique et un gameplay en cours de développement.

## Jouer

https://remisarrailh.github.io/minitman/

Hélico : ZQSD ou flèches. Clic gauche : tirer. C : déposer une pièce. E : sortir ou embarquer une fois posé.
Personnage : Q/D pour marcher, Z pour sauter ou monter dans un ascenseur, S pour descendre ou s’accroupir. Clic gauche pour tirer à l’arrêt. E près de l’ordinateur pour lancer un missile chargé.

## Développer et héberger

- `npm test` : tests de simulation.
- `npm run build` : copie le jeu et ses assets dans `dist`, sans outil de compilation ni dépendance externe.
- `npm run serve` puis ouvrir `http://localhost:8765/web/`.
- Hébergement statique : publier le contenu de `dist`.

Les assets éditables sont dans `web/assets/themes/original/`. Les éditeurs d’animations et de zones sont accessibles depuis le jeu. Les réglages et zones sont enregistrés localement dans le navigateur ; exporter le JSON pour les conserver.

GitHub Pages est publié automatiquement depuis `dist` sur chaque push de `main`.
Ce dépôt contient uniquement le portage web. Il n’inclut ni disquette, ni exécutable original, ni désassemblage, ni manuel.

Bouton « Plein écran » dans le jeu. Les contrôles tactiles sont superposés sur les appareils à écran tactile. Ajouter `?dev=true` à l’URL pour afficher les sliders de réglage.
