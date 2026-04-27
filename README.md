<p align="center">
  <img src="public/logo.png" alt="CropGPT" width="120" />
</p>

<h1 align="center">CropGPT — Assistant agricole intelligent pour Madagascar</h1>

<p align="center">
  <a href="https://cropmg.netlify.app">
    <img src="https://img.shields.io/badge/d%C3%A9mo-cropmg.netlify.app-2ecc71?style=for-the-badge" alt="Démo en ligne" />
  </a>
  <a href="https://github.com/njakaniavo4789/Grop-App/actions/workflows/cd.yml">
    <img src="https://github.com/njakaniavo4789/Grop-App/actions/workflows/cd.yml/badge.svg?branch=main" alt="CD status" />
  </a>
  <a href="https://github.com/njakaniavo4789/Grop-App/actions/workflows/ci.yml">
    <img src="https://github.com/njakaniavo4789/Grop-App/actions/workflows/ci.yml/badge.svg" alt="CI status" />
  </a>
  <img src="https://img.shields.io/badge/python-3.11-blue" alt="Python 3.11" />
  <img src="https://img.shields.io/badge/node-20-green" alt="Node 20" />
  <img src="https://img.shields.io/badge/django-5.2-092E20" alt="Django 5" />
  <img src="https://img.shields.io/badge/react-19-61DAFB" alt="React 19" />
</p>

> **Démo en ligne :** https://cropmg.netlify.app

CropGPT est une plateforme d'aide à la décision agricole qui combine un **LLM spécialisé**, un **moteur RAG** alimenté par des sources institutionnelles malgaches (FOFIFA, MAEP, FAO, CIRAD) et une **cartographie interactive** des 22 régions de Madagascar. Le tout exposé à travers une interface web grand public.

---

## Pourquoi ce projet

Madagascar a la plus forte consommation de riz par habitant d'Afrique (~130 kg/an) et plus de 70 % de sa population rurale vit de l'agriculture. Pourtant, l'accès aux **données techniques fiables** — variétés, maladies, calendriers culturaux, rendements régionaux — reste fragmenté entre des PDF FAO, des rapports FOFIFA difficiles à trouver et des connaissances orales non capitalisées.

CropGPT vise à condenser ce savoir dispersé dans un assistant conversationnel **ancré sur des sources vérifiables**, pour que poser une question agricole en français ou en malgache donne une réponse sourcée et contextualisée à la région concernée.

---

## Aperçu

| Page | Capture |
|---|---|
| Accueil & chat agricole | ![Chat](docs/screenshots/chat.png) |
| Carte 3D des 22 régions | ![Carte](docs/screenshots/map3d.png) |
| Dashboard force-graph thématique | ![Dashboard](docs/screenshots/dashboard.png) |
| Réponse streaming + sources | ![Streaming](docs/screenshots/streaming.png) |

> Les captures ci-dessus sont à déposer dans `docs/screenshots/`. La démo live reste la référence à jour : https://cropmg.netlify.app

---

## Cible utilisateurs

| Public | Cas d'usage |
|---|---|
| **Agriculteurs et coopératives** | Choisir une variété adaptée à sa région, identifier une maladie, anticiper un risque climatique |
| **Agronomes et techniciens FOFIFA / MAEP** | Comparer rendements interrégionaux, croiser ontologie + données terrain |
| **Bailleurs et ONG (FAO, BM, CIRAD)** | Vue macro de l'état rizicole national, suivi de programmes (KERE, SRI…) |
| **Étudiants et chercheurs** | Exploration documentaire des filières agricoles malgaches |

---

## Fonctionnalités principales

### Chat agricole avec garde-fou ontologique
- Pipeline en 4 étapes : `normalizer` (langue, accents, malgache) → `ontology` (validation domaine + enrichissement de requête) → `rag` (récupération FAISS) → `llm` (génération streaming SSE)
- Refus explicite des questions hors-sujet (ex : sport, politique) avec message clair
- Affichage des sources documentaires utilisées dans la réponse, avec score de confiance

### Cartographie Madagascar
- Carte 3D Three.js des 22 régions administratives
- Force-graph thématique reliant chaque région à ses spécificités (filières dominantes, infrastructures, écosystèmes)
- Fiches région : population, superficie, climat, cultures principales, tendances

### Prédictions et analyses
- Module `predictions/` avec modèles scikit-learn / xgboost pour estimation de rendement
- Knowledge base intégrée : variétés FOFIFA, maladies, rendements régionaux

### Authentification et conversations
- JWT (access + refresh) via SimpleJWT
- Historique de conversations multi-sessions par utilisateur

---

## Architecture

```
┌─────────────────────┐    HTTPS    ┌───────────────────────┐    HTTPS     ┌──────────────────────┐
│  Netlify CDN        │ ─────────►  │  Render Web Service   │ ──────────►  │  Google Colab        │
│  React 19 · Vite    │   /api/*    │  Django 5 · Gunicorn  │   /generate  │  FastAPI · Qwen2.5   │
│  TS · Three.js      │             │  PostgreSQL           │  /stream     │  + ngrok tunnel      │
│                     │ ◄─────────  │  RAG (fastembed+FAISS)│ ◄─────────   │  GPU T4 (free)       │
└─────────────────────┘    JSON     └───────────────────────┘  SSE stream  └──────────────────────┘
```

**Pipeline backend (`backend/chat/pipeline/`) :**

```
question utilisateur
      │
      ▼
normalizer.py     → langue, accents, malgache
      │
      ▼
ontology.py       → guardrail hors-domaine + enrichissement
      │
      ▼
rag.py            → embedding fastembed (ONNX) + FAISS top-k
      │
      ▼
llm.py            → POST /generate/stream vers Colab (SSE)
      │
      ▼
réponse streaming token-par-token au frontend
```

---

## Stack technique

| Couche | Technologies |
|---|---|
| **Frontend** | React 19 · Vite · TypeScript · Tailwind CSS · Radix UI · Framer Motion |
| **Cartographie 3D** | Three.js · @react-three/fiber · @react-three/drei · maplibre-gl |
| **Visualisation** | react-force-graph-2d · d3 · recharts · react-globe.gl |
| **Backend** | Django 5 · Django REST Framework · SimpleJWT · django-cors-headers |
| **Base de données** | PostgreSQL (production) · SQLite (build) |
| **RAG / Embeddings** | fastembed (ONNX Runtime) · FAISS · sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 |
| **LLM** | Qwen/Qwen2.5-3B-Instruct via FastAPI · Streaming SSE |
| **ML prédictions** | scikit-learn · xgboost · pandas · numpy |
| **Tunnel LLM** | ngrok (domaine statique gratuit) |
| **Déploiement** | Netlify (front) · Render (back + Postgres) · Google Colab T4 (LLM) |

---

## Démarrage rapide en local

### Prérequis
- Node.js 20+
- Python 3.11
- PostgreSQL 14+ (ou SQLite pour le dev)
- Un token ngrok et un notebook Colab pour le LLM (optionnel — le chat affiche un message d'erreur clair sans LLM)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements/production.txt

# Variables d'environnement (.env à la racine de backend/)
export DJANGO_SETTINGS_MODULE=config.settings.development
export DATABASE_URL=postgres://user:pass@localhost:5432/cropgpt
export COLAB_LLM_URL=https://votre-tunnel.ngrok-free.app   # optionnel

python manage.py migrate
python manage.py createsuperuser
python -m rag.embeddings --build      # construit l'index FAISS
python manage.py runserver 8000
```

### Frontend

```bash
npm ci --legacy-peer-deps
echo "VITE_API_BASE_URL=http://127.0.0.1:8000" > .env.local
npm run dev
```

L'application est disponible sur http://localhost:5173.

### LLM sur Google Colab

Le notebook charge un modèle Qwen2.5-3B-Instruct sur GPU T4, l'expose via FastAPI et ouvre un tunnel ngrok. Endpoints attendus par le backend :

- `POST /generate/stream` — réception de `{prompt, max_new_tokens, temperature}`, réponse SSE format `data: token:TEXT|ELAPSED|PROGRESS`
- `GET /health` — vérification que le serveur tourne

---

## Déploiement

| Composant | Plateforme | Configuration |
|---|---|---|
| Frontend | Netlify | `netlify.toml` à la racine — build `npm ci --legacy-peer-deps && npm run build`, publish `build/` |
| Backend | Render | `render.yaml` — Docker Web Service, plan free, Postgres free |
| LLM | Google Colab | Notebook FastAPI + pyngrok, lancé manuellement avant chaque démo |

Les variables d'environnement sensibles (`COLAB_LLM_URL`, `CORS_ALLOWED_ORIGINS`, `SECRET_KEY`, `DATABASE_URL`) sont gérées dans le dashboard Render. Les détails sont dans les fichiers `render.yaml` et `netlify.toml`.

---

## Sources documentaires

Le moteur RAG s'appuie sur des sources institutionnelles publiques :

- **FAO** — Country Brief Madagascar, statistiques rizicoles
- **FOFIFA** — Centre national de recherche appliquée au développement rural (variétés, SRI)
- **MAEP** — Ministère de l'Agriculture, statistiques officielles
- **CIRAD** — Recherche agronomique Sud, fertilité des sols
- **Wikipedia** — Agriculture in Madagascar (cross-référence)

La knowledge base locale (`backend/rag/data/knowledge_base/`) contient des fiches techniques structurées sur les variétés FOFIFA, les maladies et ravageurs du riz, et les rendements régionaux.

---

## Structure du dépôt

```
.
├── backend/                  Django backend
│   ├── config/               Settings + URLs racine
│   ├── chat/                 Pipeline conversationnel + SSE
│   │   └── pipeline/         normalizer · ontology · rag · llm
│   ├── crops/                Catalogue cultures et variétés
│   ├── predictions/          ML rendements (sklearn/xgboost)
│   ├── users/                JWT auth
│   ├── rag/                  Indexation FAISS + ontologie
│   └── requirements/         base.txt + production.txt
├── src/                      Frontend React
│   ├── api/                  Clients axios (auth, chat, crops, predictions)
│   ├── components/
│   │   ├── chat/             UI chat + streaming SSE
│   │   ├── dashboard/        Force-graph régions
│   │   └── madagascar3d/     Carte 3D Three.js
│   ├── data/                 GeoJSON + data régions
│   └── pages/
├── render.yaml               Blueprint Render
├── netlify.toml              Build + redirects + headers
├── Dockerfile.backend        Image production Django
├── docker-compose.yml        Dev local (front + back + Postgres + Redis)
└── .github/workflows/cd.yml  CI build validation
```

---

## Roadmap

État au 2026-04-27.

### Réalisé
- [x] Pipeline conversationnel 4-étapes (normalizer → ontology → RAG → LLM)
- [x] Streaming SSE token-par-token avec garde-fou hors-domaine
- [x] Indexation FAISS via fastembed (ONNX, sans torch) — image Docker légère pour Render free tier
- [x] Cartographie 3D Three.js des 22 régions
- [x] Dashboard force-graph thématique (22 régions + ~50 sous-thèmes)
- [x] Authentification JWT (access + refresh)
- [x] Affichage clair des erreurs LLM (hors-ligne, timeout) côté UI
- [x] Déploiement Netlify (front) + Render (back) + Colab (LLM)

### En cours
- [ ] Refonte du dashboard : KPIs en haut, carte chloropleth Madagascar, panneau régional cliquable
- [ ] Lisibilité du force-graph : focus au clic + couleurs par catégorie + arêtes fines
- [ ] Domaine ngrok statique pour stabiliser `COLAB_LLM_URL` entre démos
- [ ] Smoke tests CI contre l'environnement déployé

### Prévu
- [ ] Alertes climatiques temps réel (intégration API météo Madagascar)
- [ ] Calendrier agricole interactif par culture / par région
- [ ] Mode hors-ligne pour utilisateurs ruraux (PWA + cache RAG local)
- [ ] Support malgache complet (UI + tokenizer ontologique)
- [ ] Module prédictions de rendement par parcelle (entrées : sol, climat, variété)
- [ ] Comparateur interrégional côte-à-côte
- [ ] Export PDF des fiches techniques
- [ ] Tests e2e Playwright sur les parcours critiques (login, chat, prédiction)

---

## Auteurs

| | Rôle |
|---|---|
| **Toby Rabetahafina** ([@toby7431](https://github.com/toby7431) · [@njakaniavo4789](https://github.com/njakaniavo4789)) | Conception produit, backend Django, pipeline RAG, intégration LLM, déploiement |
| **Tatum Ln** ([@zafinii](https://github.com/zafinii)) | Frontend React, cartographie 3D Three.js, dashboard force-graph |

Pour toute question : ouvrir une issue sur le dépôt ou contacter directement les auteurs via leurs profils GitHub.

---

## Licence

Projet académique / démonstration — le code source est privé. Tous droits réservés aux auteurs.
