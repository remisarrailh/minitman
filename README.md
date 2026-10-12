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

### Réglages des ennemis

Avec `?dev=true`, la section Apparition et comportement des ennemis permet de régler la vitesse (200 % par défaut), la dispersion verticale dans le ciel (160 pixels), la part d’attaque du pont et la part de chasse du joueur. La part base complète le total à 100 % : par défaut 50 % base, 25 % pont, 25 % chasse. Les chasseurs poursuivent le joueur dehors et dans la base, où ils peuvent prendre les escaliers dans les deux sens. Les réglages sont conservés localement.

### Éditeur de niveau FPS

Le lien « Éditeur FPS » ouvre une grille en vue de dessus pour chacun des sept étages. Choisir Mur, Pilier, Caisse, Machine ou Gomme puis cliquer/glisser. Ctrl+Z annule. Les escaliers, portes, ordinateur et cases nécessaires à leur accès sont protégés. L’application et l’import vérifient que tous les accès restent reliés. « Appliquer au jeu » enregistre localement le niveau ; recharger le jeu pour le prendre en compte. « Tester cet étage » ouvre directement la vue FPS à l’étage sélectionné. Exporter/importer le JSON pour conserver ou partager une carte.

La structure FPS est également éditable : largeur/profondeur de chaque étage, position des escaliers (commune aux deux étages reliés), entrées/sorties et ordinateur. Les sept étages restent fixes pour la projection 2D. Choisir un accès puis « Déplacer cet accès » et cliquer sa nouvelle position. Le type « Entrée mur » ou « Entrée plafond » change sa surface : le jeu dessine une texture sur le mur le plus proche ou le plafond, au lieu d’un sprite flottant. Ctrl+Z annule aussi les changements de structure. Les anciens JSON sont migrés automatiquement.

Dans l’éditeur FPS, « Sélection / déplacer » permet de glisser les blocs sur la grille. Les cellules jointes de même type (piliers, caisses et machines) sont déplacées ensemble ; les murs se déplacent cellule par cellule. Le dépôt refuse les cases occupées, les bords et les dégagements des accès. Ctrl+Z annule un déplacement.

Les accès se déplacent aussi directement par glisser-déposer en mode Sélection. Un escalier met à jour les deux étages reliés ; déplacer une sortie déplace également son point d’entrée intérieur. Le dépôt refuse un dégagement occupé ou hors de la grille. Les escaliers sont exclusivement muraux, y compris lors du chargement des anciennes cartes ; les entrées/sorties conservent le choix mur/plafond.

Le redimensionnement manuel est remplacé par une grille extensible. Dessiner au-delà du plan agrandit automatiquement la carte, aussi vers la gauche et le haut, en conservant les positions relatives des accès. « Déplacer la vue » ou le bouton central déplace le plan ; la molette zoome autour du curseur et « Recentrer » retrouve les accès. Les anciens murs restent dessinés et peuvent être effacés pour agrandir les pièces. Les tracés continus et Ctrl+Z sont conservés.

Chaque passage extérieur est maintenant un seul accès « Entrée / sortie ». Le repère d’apparition séparé a été retiré : sa position est calculée automatiquement dans une case libre juste à côté du passage, y compris lors de la migration des anciennes cartes.
