# CHAPITRE II : LES DÉFIS ET LES SOLUTIONS NUMÉRIQUES EN AGRICULTURE MALGACHE

---

## II.1 La problématique centrale : le partage fragmenté des connaissances

À Madagascar, l'agriculture représente environ 70% de la population active et constitue le pilier de l'économie nationale. Cependant, le partage des connaissances reste un problème grave. Les méthodes de plantation adaptées aux sols locaux, les varieties locales, les maladies des cultures et les techniques de fertilization sont rarement partagées entre les paysans. Résultat : beaucoup utilisent de mauvaises méthodes et obtiennent des rendements faibles chaque année.

Ce problème de fragmentation信息来源两个方面 : d'une part, les connaissances traditionnelles se transmettent oralement de génération en génération, avec perte progressive de宝贵信息 ; d'autre part, les recherches scientifiques sur l'agriculture malgache restent dans les universités et ne atteignent pas les terrains.

## II.2 Les défis spécifiques de l'agriculture malgache

### a) Diversité des agro-écologies

Madagascar possède une diversitéde climats exceptionnel, du climat tropical côtier au climat tropical d'altitude. Chaque région nécessite des approches spécifiques. Le riz, aliment de base, se cultive différemment dans la Plaine de l'Analamanga (altitude 1 200m) versus la Côte Est (humide). Cette complexité rend les recommandations génériques inapplicables.

### b) Variétés locales et adaptation

Les vari és de riz traditionnelles (riz rouge, riz blanc, riz noir) ont chacune leurs spécificités. La variété « Makali » résiste mieux aux sols pauvres en nutriments, tandis que « Menavirano » convient aux zones humides. Sans base de données centralisant ces informations, les paysans peinent à trouver la variété adaptée à leur Parcelle.

### c) Maladies des cultures

Les maladies du riz (brûlure des feuilles, helminthosporiose, pyriculariose) sont souvent mal diagnostiquées. Un paysan confond facilement uneCarence nutritionnelle avec une maladie fongique. Sans diagnostic précis, les traitements sont inefficaces, causant pertes financières et découragement.

### d) Types de sols et fertilisation

Les sols malgaches varient considérablement : lateriques dans le Centre, volcaniques dans la Haute Matsiatra, sableux sur la Côte Ouest. Chaque type nécessite des apports en nutriments différents. Sans analyse de sol, les engrais sont souvent mal dosés, causant pollution et gaspillage.

## II.3 Les solutions numériques proposées

Le projet CropGPT apporte des réponses concrètes à ces défis à travers plusieurs fonctionnalités.

### a) Base de connaissances centralisée

Nous avons créée une base de données regroupant :
- Plus de 300 articles scientifiques sur l'agriculture malgache
- 22 régions avec leurs spécificités culturales
- 50+ cultures avec leurs méthodes de plantation
- Catalogue des maladies avec photos et symptômes
- Base des types de sols par région

Cette centralisation permet à chaque utilisateur de accéder à l'information pertinente pour sa situation géographique.

### b) Assistant IA intelligent avec RAG

Le système RAG (Retrieval Augmented Generation) permet à l'IA de répondre en sese basan sur les documents de la base de connaissance. Lorsque l'utilisateur pose une question, le système :
1. Cherche les documents pertinents dans la base
2. Extrait les informations utiles
3. Les intègre dans la réponse du modèle linguistique
4. Affiche un score de confiance pour chaque réponse

Ce mécanisme garantit que les réponses s'appuient sur des sources vérifiées plutôt que sur des connaissances génériques.

### c) Prédiction des rendements

Le module de prédiction utilise les données climatiques (température, pluviométrie) combinées à l'historique des rendements par région. Les utilisateurs peuvent :
- Entrer leur localisation (région, commune)
- Indiquer la culture envisagée (riz, maize, manioc)
- Obtenir une estimation de rendement basée sur les données historiques

Cette fonctionnalité aide à la planification et à la prise de décision.

### d) Diagnostic des maladies

L'interface de diagnostic accompagne l'utilisateur à travers une série de questions visuelles :
1. Photos de la plante touchée
2. Description des symptômes
3. Localisation géographique
4. Stade de développement

Le système compare ces éléments avec la base de données des maladies connues et propose un diagnostic probability thérapeutr管理办法 accompagné de recommandations de traitement.

### e) Cartographie interactive

La carte interactive de Madagascar affiche :
- Les Zones Agropastorales (ZAP) définies par le Ministère
- Les statistiques agricoles par région
- Les données météorologiques en temps réel (via Open-Meteo API)
- Les limites administratives actualisées

Cette visualisation aide à comprendre le contexte régional et à adapter les pratiques.

## II.4 Sources et Références

Les informations présentes dans la base de connaissances proviennent de sources vérifiées :

- **FOFIFA** (Foibe Filognétika de Madagascar) - Institut de recherche agricole
- **Université d'Antananarivo** - Publications du département Agronomie
- **Ministère de l'Agriculture** - Rapports annuels sur la production
- **FAO Madagascar** - Rapports sur la sécurité alimentaire
- **Bnamed** - Base nationale des données sur l'environnement

Chaque document dans la base est référencé avec sa source permettant la vérification.

## II.5 Exemples concrets d'utilisation

### Exemple 1 : Le paysan de la région Vakinankaratra

Rasoa, paysan à Antsirabe, souhaite planter du riz. Il ouvre l'application, sélectionne sa région (Vakinankaratra) et sa culture (riz). Le système lui affiche :
- Les varieties recommandées pour cette altitude (Menabe, Makali)
- Les périodes de semis optimales (novembre à décembre)
- Les besoins en nutriments (NPK adaptés)
- Les maladies courantes et comment les reconnaître

### Exemple 2 : Le biotechnicien à Toamasina

Drasoa, biotechnicien à Toamasina, reçoit des plants de manioc atteinte de virus. Il拍照 les feuilles symptômes, les envoie à l'application. Le système diagnose la maladie (mosaïque du manioc) et propose un protocole de traitement avec les抗病毒 disponibles à Madagascar.

### Exemple 3 : Étudiant en agronomie à l'ISPM

Un étudiant prépare son mémoire sur les sols volcaniques de la région Itasy. Il utilise la fonctionnalité cartographique pour visualiser les données de sol, exporte les statistiques via l'API, et cite les sources scientifiques dans sa bibliographie.

## II.6 Limites et challenges

Nous reconnaissons certaines limites :

### a) Couverture des données

La base de connaissances, bien quvasive, ne couvre pas encore toutes les régions de Madagascar. Certaines cultures mineures ou régions isolées manque de données spécifiques. Nous workons à enrichir progressivement la base avec les contributions des utilisateurs.

### b) Connectivité

L'accès à Internet reste problématique dans certaines zones rurales. L'application est conçue pour fonctionner partiellement hors ligne (mise en cache des données essentielles), mais certaines fonctionnalités (prédictions en temps réel) nécessitent une connexion.

### c) Linguistique

Le projet supporte actuellement le français et le malgache basique. Nous envisageons d'ajouter le malgache standardisé (MLP) pour améliorer l'accessibilité aux thérapeutres non Francophones.

## II.7 Conclusion du Chapitre II

Ce chapitre a exposé les défis spécifiques de l'agriculture malgache et les solutions numériques apportées par le projet CropGPT. La centralisation des connaissances combinée à l'intelligence artificielle permet de démocratiser l'accès aux informations agricoles vital.

Le système de RAG garantit la fiabilité des réponses en s'appuyant sur des sources vérifiées. La cartographie interactive et les outils de prédiction aident à la planification. Chaque fonctionnalité répond à un besoin concret des acteurs du secteur agricole.

Le chapitre suivant présentera le projet dans sa globalité et expliquera comment l'utiliser au quotidien.

---

**Chapitre terminé et validé. Prêt pour le chapitre suivant.**