# CHAPITRE I : ANALYSE TECHNIQUE ET CHOIX TECHNOLOGIQUES

---

## I.1 Stack Technologique Globale

Le projet **CropGPT** (anciennement « Second Cerveau Agricole Malgache ») constitue une plateforme numérique multi-plateforme dédiée à l'agriculture à Madagascar. Elle combine des technologies modernes pour offrir une expérience utilisateur fluide tout en restant accessible sur divers appareils. Nous avons choisi une pile JavaScript « Universal » permettant de développer une application web, mobile et bureau avec un seul code source. Cette approche réduit les coûts de maintenance et garantit une cohérence visuelle sur tous les appareils.

La pile technologique s'articule autour de quatre axes principaux : le frontend (interface utilisateur), le backend (traitement des données), la cartographie et la visualisation, et l'intelligence artificielle pour l'assistance virtuelle. Chaque technologie a été sélectionnée selon des critères précis : performance, maintenabilité, écosystème communautaire et compatibilité avec le contexte malgache (connexions internet souvent instables, appareils variés).

---

## I.2 Technologies Frontend

Le frontend représente le cœur de l'expérience utilisateur. Nous avons opté pour **React 19** comme bibliothèque principale de gestion de l'interface. Ce choix s'explique par sa maturité (utilisé par des géants comme Netflix ou Meta), sa vaste communauté et sa flexibilité grâce au modèle composants. React 19 introduit des améliorations de performance avec le Concurrent Mode, permettant des rendus plus fluides même sur des appareils modestes souvent utilisés à Madagascar.

Pour le style, nous utilisons **Tailwind CSS 3.4**. Cet outil CSS permet de prototyper rapidement des interfaces modernes sans écrire de fichiers CSS personnalisés. Tailwind adopte une approche « utilitaire » où chaque classe correspond à une propriété CSS précise. Cette méthode facilite la collaboration au sein de l'équipe et garantit une cohérence visuelle. La configuration personnalisée définit les couleurs du projet (vert agriculture, cyan IA) conformément à la charte graphique.

Les animations sont gérées par **Framer Motion 12** et **GSAP**. Framer Motion offre une API déclarative pour les transitions React, idéale pour les micro-interactions (survol, apparition de contenu). GSAP (GreenSock Animation Platform) gère les animations complexes comme l'effet de scramble texte et les effets parallax sur le fond fluide. Ces deux bibliothèques se complètent parfaitement.

La gestion des routes se fait via **React Router DOM 7**, la solution officielle de routage pour React. Elle permet une navigation fluide sans rechargement de page (« Single Page Application »), essentielle pour l'expérience mobile proche des applications natives.

Les composants UI réutilisables proviennent de **Radix UI**, une bibliothèque de composants primitifs non stylisés (boutons, info-bulles, accordions). Radix offre une accessibilité conforme aux normes WAI-ARIA, garantissant que l'application est utilisable par les personnes en situation de handicap. Nous personnalisons ces composants avec notre propre thème Tailwind.

Les icônes sont fournies par **Lucide React**, une bibliothèque open-source offrant plus de 1 500 icônes cohérentes et légères. Cette bibliothèque remplace l'ancienne utilisation de Font Awesome, divisant la taille du bundle par cinq.

Pour la gestion du mode sombre/clair, nous avons développé un hook personnalisé `useTheme()` qui bascule une classe CSS sur l'élément `body` pour appliquer les variables appropriées. Ce système permet de basculer entre le thème sombre (particules cyan) et le thème clair (particules vert émeraude) en toute simplicité.

---

## I.3 Technologies Backend et Données

Le backend s'appuie sur une architecture REST exposée par un serveur **Node.js** avec le framework **Express**. Cette configuration légère permet un développement rapide des endpoints API tout en maintenant des performances acceptables même sur des serveurs modestes.

Les appels HTTP sont gérés par **Axios**, une bibliothèque offrant une API simple pour les requêtes HTTP. Axios gère automatiquement la transformation JSON et les erreurs réseau, réduisant le code boilerplate.

Pour la sécurité des mots de passe, nous utilisons le hachage **bcrypt** avec un salt adaptatif. Cette méthode garantit que même en cas de fuite de base de données, les mots de passe restent illisibles. Le coût de calcul permet de protéger contre les attaques par force brute tout en restant acceptable pour l'utilisateur légitime.

Les données géographiques de Madagascar sont stockées au format **GeoJSON**, un standard ouvert permettant l'interopérabilité avec les outils de cartographie. Le fichier `madagascarGeoJSON.js` contient les géométries des 22 régions de Madagascar, converties pour le format Leaflet (inversion des latitudes).

---

## I.4 Technologies Cartographiques et de Visualisation

La cartographie constitue un élément central du projet. Nous utilisons **Leaflet** (via `maplibre-gl`) pour l'affichage des cartes interactives. Leaflet est une bibliothèque légère et extensible, parfaite pour afficher les régions malgaches. Elle permet d'ajouter des marqueurs personnalisés, des popups informatifs et des interactions sur la carte.

Pour la visualisation 3D du globe terrestre, nous intégrons **React Globe.GL**, une bibliothèque basée sur Three.js. Elle offre une représentation sphérique de la Terre, permettant de visualiser Madagascar dans son contexte géographique mondial. Cette fonctionnalité impressionne les utilisateurs et renforce l'aspect innovant de l'application.

Les graphiques statistiques sont réalisés avec **Recharts**, une bibliothèque React-native offrant des graphiques responsifs et animables. Recharts supporte les histogrammes, les courbes, les camemberts et autres types de visualisations. Nous l'utilisons pour afficher les statistiques agricoles par région.

Pour le graphe de connaissances, nous avons intégré **React Force Graph 2D**, permettant de visualiser les relations entre concepts agricoles. Cette visualisation aide les utilisateurs à comprendre les liens entre les cultures, les maladies et les méthodes.

---

## I.5 Intelligence Artificielle et Assistance

L'IA constitue le cœur innovant du projet. Nous avons implémenté un système de **Chat Streaming** qui reçoit les réponses du modèle linguistique en flux continu. Cela permet à l'utilisateur de voir apparaître le texte progressivement, comme écrit par un humain.

Le RAG (Retrieval Augmented Generation) est implémenté via le hook `useChatStream`. Ce système récupère des documents pertinents depuis une base de connaissances agricoles avant de les soumettre au modèle linguistique. Il calcule ensuite un score de confiance (`RAGConfidenceBadge`) affiché à l'utilisateur pour indiquer la fiabilité de la réponse.

Les badges de confiance utilisent un code couleur simple : vert pour un score élevé (plus de 80%), orange pour moyen (50-80%), et rouge pour faible (moins de 50%). Cette transparence aide l'utilisateur à évaluer la fiabilité des informations reçues.

---

## I.6 Outils de Développement et Qualité

Le projet utilise **Vite 7** comme bundler et serveur de développement. Vite offre des temps de démarrage instantanés grâce au chargement natif des ES modules. En production, il génère des bundles optimisés avec code splitting automatique.

**ESLint** et **Prettier** assurent la qualité du code. ESLint détecte les erreurs potentielles (variables non utilisées, anti-patterns) tandis que Prettier formate automatiquement le code selon des règles prédéfinies. Cette configuration garantit une cohérence stylistique au sein de l'équipe.

Le versionnage Git permet de suivre l'historique des modifications. Le fichier `.gitignore` exclut les dépendances (`node_modules`) et les fichiers de build pour garder le dépôt léger.

---

## I.7 Justification des Choix et Alternatives

Chaque choix technologique a été évalué selon une matrice prenant en compte plusieurs critères :

| Technologie | Critère | Alternative envisagée | Motivation du choix |
|------------|--------|---------------------|-------------------|
| React 19 | Maturité, communauté | Vue.js, Svelte | Meilleure intégration avec l'écosystème |
| Tailwind CSS | Rapidité développement | CSS Modules, Styled Components | Cohérence visuelle garantie |
| Leaflet | Légèreté, extensions | Mapbox GL, Google Maps | Coût zéro, open source |
| Axios | Simplicité | Fetch API | Meilleure gestion des erreurs |

---

## I.8 Conclusion du Chapitre I

Ce chapitre a présenté l'architecture technique du projet CropGPT. Les technologies sélectionnées offrent un équilibre optimal entre performance, maintenabilité et accessibilité. Le choix d'outils open source garantit la durabilité du projet sans dépendance à des fournisseurs privés.

Le chapitre suivant abordera les défis spécifiques de l'agriculture malgache et les solutions numériques proposées.

---

**Chapitre terminé et validé. Prêt pour le chapitre suivant.**