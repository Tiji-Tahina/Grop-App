<p align="center">
  <img src="public/logo.png" alt="CropGPT" width="120" />
</p>

<h1 align="center">CropGPT — Intelligent Agricultural Assistant for Madagascar</h1>

<p align="center">
  <a href="https://cropmg.netlify.app">
    <img src="https://img.shields.io/badge/demo-cropmg.netlify.app-2ecc71?style=for-the-badge" alt="Live Demo" />
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

> **Live Demo:** https://cropmg.netlify.app

CropGPT is an agricultural decision-support platform that combines a **specialized LLM**, a **RAG engine** powered by Malagasy institutional sources (FOFIFA, MAEP, FAO, CIRAD), and an **interactive map** of Madagascar's 22 regions. All exposed through a consumer-facing web interface.

---

## Why This Project

Madagascar has the highest per-capita rice consumption in Africa (~130 kg/year) and over 70% of its rural population depends on agriculture. Yet access to **reliable technical data** — varieties, diseases, crop calendars, regional yields — remains fragmented across FAO PDFs, hard-to-find FOFIFA reports, and uncaptured oral knowledge.

CropGPT aims to condense this scattered knowledge into a conversational assistant **anchored to verifiable sources**, so that asking an agricultural question in French or Malagasy yields a sourced, region-contextualized answer.

---

## Overview

| Page | Screenshot |
|---|---|
| Home & agricultural chat | ![Chat](docs/screenshots/chat.png) |
| 3D map of 22 regions | ![Map](docs/screenshots/map3d.png) |
| Thematic force-graph dashboard | ![Dashboard](docs/screenshots/dashboard.png) |
| Streaming response + sources | ![Streaming](docs/screenshots/streaming.png) |

> Screenshots above should be placed in `docs/screenshots/`. The live demo remains the up-to-date reference: https://cropmg.netlify.app

---

## Target Users

| Audience | Use Cases |
|---|---|
| **Farmers and cooperatives** | Choose a variety suited to their region, identify a disease, anticipate climate risks |
| **Agronomists and FOFIFA/MAEP technicians** | Compare inter-regional yields, cross-reference ontology + field data |
| **Donors and NGOs (FAO, World Bank, CIRAD)** | Macro view of national rice status, program monitoring (KERE, SRI, etc.) |
| **Students and researchers** | Documentary exploration of Malagasy agricultural value chains |

---

## Key Features

### Agricultural chat with ontological guardrail
- 4-step pipeline: `normalizer` (language, accents, Malagasy) → `ontology` (domain validation + query enrichment) → `rag` (FAISS retrieval) → `llm` (SSE streaming generation)
- Explicit refusal of off-topic questions (e.g., sports, politics) with a clear message
- Display of document sources used in the response, with confidence score

### Madagascar mapping
- 3D Three.js map of the 22 administrative regions
- Thematic force-graph linking each region to its specialties (dominant value chains, infrastructure, ecosystems)
- Region fact sheets: population, area, climate, main crops, trends

### Predictions and analytics
- `predictions/` module with scikit-learn / xgboost models for yield estimation
- Integrated knowledge base: FOFIFA varieties, diseases, regional yields

### Authentication and conversations
- JWT (access + refresh) via SimpleJWT
- Multi-session conversation history per user

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

**Backend pipeline (`backend/chat/pipeline/`):**

```
user question
      │
      ▼
normalizer.py     → language, accents, Malagasy
      │
      ▼
ontology.py       → off-domain guardrail + enrichment
      │
      ▼
rag.py            → fastembed embedding (ONNX) + FAISS top-k
      │
      ▼
llm.py            → POST /generate/stream to Colab (SSE)
      │
      ▼
streaming response token-by-token to frontend


---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19 · Vite · TypeScript · Tailwind CSS · Radix UI · Framer Motion |
| **3D Mapping** | Three.js · @react-three/fiber · @react-three/drei · maplibre-gl |
| **Visualization** | react-force-graph-2d · d3 · recharts · react-globe.gl |
| **Backend** | Django 5 · Django REST Framework · SimpleJWT · django-cors-headers |
| **Database** | PostgreSQL (production) · SQLite (dev) |
| **RAG / Embeddings** | fastembed (ONNX Runtime) · FAISS · sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 |
| **LLM** | Qwen/Qwen2.5-3B-Instruct via FastAPI · SSE Streaming |
| **ML Predictions** | scikit-learn · xgboost · pandas · numpy |
| **LLM Tunnel** | ngrok (static free domain) |
| **Deployment** | Netlify (front) · Render (back + Postgres) · Google Colab T4 (LLM) |

---

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11
- PostgreSQL 14+ (or SQLite for dev)
- An ngrok token and a Colab notebook for the LLM (optional — the chat displays a clear error message without LLM)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements/production.txt

# Environment variables (.env at backend/ root)
export DJANGO_SETTINGS_MODULE=config.settings.development
export DATABASE_URL=postgres://user:pass@localhost:5432/cropgpt
export COLAB_LLM_URL=https://your-tunnel.ngrok-free.app   # optional

python manage.py migrate
python manage.py createsuperuser
python -m rag.embeddings --build      # build the FAISS index
python manage.py runserver 8000
```

### Frontend

```bash
npm ci --legacy-peer-deps
echo "VITE_API_BASE_URL=http://127.0.0.1:8000" > .env.local
npm run dev
```

The application is available at http://localhost:5173.

### LLM on Google Colab

The notebook loads a Qwen2.5-3B-Instruct model on GPU T4, exposes it via FastAPI, and opens an ngrok tunnel. Endpoints expected by the backend:

- `POST /generate/stream` — receives `{prompt, max_new_tokens, temperature}`, SSE response format `data: token:TEXT|ELAPSED|PROGRESS`
- `GET /health` — check that the server is running

---

## Deployment

| Component | Platform | Configuration |
|---|---|---|
| Frontend | Netlify | `netlify.toml` at root — build `npm ci --legacy-peer-deps && npm run build`, publish `build/` |
| Backend | Render | `render.yaml` — Docker Web Service, free plan, free Postgres |
| LLM | Google Colab | FastAPI + pyngrok notebook, launched manually before each demo |

Sensitive environment variables (`COLAB_LLM_URL`, `CORS_ALLOWED_ORIGINS`, `SECRET_KEY`, `DATABASE_URL`) are managed in the Render dashboard. Details are in `render.yaml` and `netlify.toml`.

---

## Document Sources

The RAG engine relies on public institutional sources:

- **FAO** — Country Brief Madagascar, rice statistics
- **FOFIFA** — National center for applied rural development research (varieties, SRI)
- **MAEP** — Ministry of Agriculture, official statistics
- **CIRAD** — Southern agronomic research, soil fertility
- **Wikipedia** — Agriculture in Madagascar (cross-reference)

The local knowledge base (`backend/rag/data/knowledge_base/`) contains structured fact sheets on FOFIFA rice varieties, rice diseases and pests, and regional yields.

---

## Repository Structure

```
.
├── backend/                  Django backend
│   ├── config/               Settings + root URLs
│   ├── chat/                 Conversational pipeline + SSE
│   │   └── pipeline/         normalizer · ontology · rag · llm
│   ├── crops/                Crop and variety catalog
│   ├── predictions/          ML yield predictions (sklearn/xgboost)
│   ├── users/                JWT auth
│   ├── rag/                  FAISS indexing + ontology
│   └── requirements/         base.txt + production.txt
├── src/                      React frontend
│   ├── api/                  Axios clients (auth, chat, crops, predictions)
│   ├── components/
│   │   ├── chat/             Chat UI + SSE streaming
│   │   ├── dashboard/        Force-graph regions
│   │   └── madagascar3d/     3D Three.js map
│   ├── data/                 GeoJSON + region data
│   └── pages/
├── render.yaml               Render blueprint
├── netlify.toml              Build + redirects + headers
├── Dockerfile.backend        Production Django image
├── docker-compose.yml        Local dev (front + back + Postgres + Redis)
└── .github/workflows/cd.yml  CI build validation
```

---

## Roadmap

Status as of 2026-04-27.

### Completed
- [x] 4-step conversational pipeline (normalizer → ontology → RAG → LLM)
- [x] Token-by-token SSE streaming with off-domain guardrail
- [x] FAISS indexing via fastembed (ONNX, no torch) — lightweight Docker image for Render free tier
- [x] 3D Three.js mapping of 22 regions
- [x] Thematic force-graph dashboard (22 regions + ~50 sub-themes)
- [x] JWT authentication (access + refresh)
- [x] Clear LLM error display (offline, timeout) on the UI
- [x] Netlify (front) + Render (back) + Colab (LLM) deployment

### In Progress
- [ ] Dashboard redesign: KPIs at top, Madagascar choropleth map, clickable regional panel
- [ ] Force-graph readability: click-to-focus + category colors + thin edges
- [ ] Static ngrok domain to stabilize `COLAB_LLM_URL` between demos
- [ ] CI smoke tests against the deployed environment

### Planned
- [ ] Real-time weather alerts (Madagascar weather API integration)
- [ ] Interactive crop calendar by crop / by region
- [ ] Offline mode for rural users (PWA + local RAG cache)
- [ ] Full Malagasy support (UI + ontological tokenizer)
- [ ] Per-field yield prediction module (inputs: soil, climate, variety)
- [ ] Side-by-side inter-regional comparison
- [ ] PDF export of technical fact sheets
- [ ] Playwright e2e tests on critical flows (login, chat, prediction)

---

## Authors

| | Role |
|---|---|
| **Toby Rabetahafina** ([@toby7431](https://github.com/toby7431) · [@njakaniavo4789](https://github.com/njakaniavo4789)) | Product design, Django backend, RAG pipeline, LLM integration, deployment |
| **Tatum Ln** ([@zafinii](https://github.com/zafinii)) | React frontend, 3D Three.js mapping, force-graph dashboard |

For any questions: open an issue on the repository or contact the authors directly via their GitHub profiles.

---

## License

Academic / demonstration project — source code is private. All rights reserved by the authors.
