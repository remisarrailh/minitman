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

## Intérieur FPS expérimental

Appuyer sur E à pied près de l’accès du toit ou de la porte de la plateforme extérieure bascule dans sept grandes pièces superposées en première personne, reliées par six escaliers alternant les extrémités gauche et droite. Le bouton « Essai FPS » permet de tester directement avec deux robots. Z/S avancent et reculent, Q/D déplacent latéralement, souris pour viser, clic gauche pour tirer, Espace pour sauter, Ctrl pour s’accroupir et E pour activer l’ordinateur ou sortir près des portes bleues : premier étage vers le toit, troisième étage vers la plateforme extérieure. E devant la porte extérieure permet d’entrer directement au troisième étage. Z/S ne déclenchent pas l’entrée FPS. Cliquer dans la vue capture la souris lorsque le navigateur le permet ; les flèches gauche/droite permettent aussi de tourner. Sur mobile, glisser sur la vue pour regarder.

Piliers, caisses et machines permettent de se mettre à couvert et arrêtent les tirs ennemis. Les tirs produisent une flamme de bouche, du recul et des étincelles ; les robots touchés clignotent et déclenchent un repère de touche, puis une explosion après trois impacts. Les robots gardent trois états, attaquent l’ordinateur et laissent une mine à leur destruction. L’ordinateur se trouve au septième niveau. Les escaliers se prennent en s’approchant, ou avec E ; un verrou à l’arrivée empêche de repartir immédiatement. Les robots parcourent les sept niveaux en contournant les objets. Les cartes FPS restent indépendantes des zones 2D dessinées dans l’éditeur.

### Synchronisation 2D / FPS

Les robots intérieurs utilisent une simulation commune et poursuivent leur route vers l’ordinateur même lorsque le joueur reste dehors. Leur identité, dégâts, états, mines et destruction sont partagés. Leur position 2D, ainsi que celle du personnage intérieur, est une projection normalisée de la distance à l’escalier suivant (ou à l’ordinateur au dernier niveau), sur la largeur de l’étage. Le bouton « Debug 2D + FPS » affiche simultanément le panoramique, la vue intérieure et les distances aux escaliers. Hors du bâtiment, la caméra de debug observe l’étage d’un robot intérieur ; elle ne prend pas le contrôle du personnage.
