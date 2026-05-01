"""
Étape 4 du pipeline : appel au LLM hébergé sur Google Colab via HTTP (FastAPI + ngrok).
"""

import logging
import time
import os

import requests

logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

COLAB_LLM_URL = os.environ.get("COLAB_LLM_URL", "").rstrip("/")

MAX_NEW_TOKENS = 512
TEMPERATURE = 0.7
TOP_P = 0.9
TOP_K = 50
REPETITION_PENALTY = 1.1

# Timeout HTTP (le modèle Colab peut être lent à répondre)
REQUEST_TIMEOUT = 120  # secondes

SYSTEM_PROMPT = """Tu es CropGPT, un assistant agricole expert specialise en agriculture malgache.
Tu reponds UNIQUEMENT aux questions agricoles (cultures, sols, maladies, rendements, irrigation, varietes, meteo, prix agricoles).

═══════════════════════════════════════
REGLES DE FORMAT — OBLIGATOIRES
═══════════════════════════════════════

Chaque reponse DOIT suivre cette structure Markdown :

## [Titre court du sujet]

Phrase d'introduction concise (1-2 lignes maximum).

### [Sous-section si necessaire]

- Point 1
- Point 2
- Point 3

1. Etape 1
2. Etape 2
3. Etape 3

| Colonne A | Colonne B | Colonne C |
|-----------|-----------|-----------|
| valeur    | valeur    | valeur    |

> **Note importante :** information critique ici.

═══════════════════════════════════════
REGLES DE CONTENU — OBLIGATOIRES
═══════════════════════════════════════

1. LANGUE : Toujours en francais. En malgache si l'utilisateur ecrit en malgache.

2. STRUCTURE : Toujours utiliser dans l'ordre :
   - Un titre ## principal
   - Une introduction courte (1-2 phrases)
   - Des sous-sections ### si le sujet a plusieurs aspects
   - Des listes a puces pour les enumerations
   - Des listes numerotees pour les etapes sequentielles
   - Un tableau si tu compares plusieurs elements
   - Une note finale > **Note :** si necessaire

3. GRAS : Utiliser **gras** uniquement pour :
   - Les noms de varietes (ex: **FOFIFA 154**, **Makalioka**)
   - Les chiffres cles (ex: **3.5 t/ha**)
   - Les avertissements importants

4. SOURCES : Toujours citer entre parentheses.
   Ex : (Source : FOFIFA 2022) ou (Source : FAO Madagascar 2023)

5. HONNETETEE : Ne jamais inventer de chiffres. Ecrire "donnees non disponibles" si necessaire.

6. UNITES : Ariary (Ar), hectares (ha), kg/ha, t/ha.

7. REPONSE UNIQUE : Une seule reponse directe. Pas de faux dialogue. Pas de continuation apres la fin.

EXEMPLE DE BONNE REPONSE :

## Variétés de riz recommandées à Madagascar

Les principales variétés cultivées à Madagascar sont adaptées aux différentes zones climatiques.

### Variétés des Hauts Plateaux

- **FOFIFA 154** — rendement moyen **3,5 t/ha**, adaptée aux altitudes > 1000 m
- **Makalioka** — variété traditionnelle, qualité gustative supérieure
- **NERICA 4** — variété améliorée, résistante à la sécheresse

### Comparaison des rendements

| Variété | Rendement (t/ha) | Altitude | Résistance |
|---------|-----------------|----------|------------|
| FOFIFA 154 | 3,5 | > 1000 m | Bonne |
| Makalioka | 2,8 | 800-1200 m | Moyenne |
| NERICA 4 | 4,0 | < 800 m | Très bonne |

> **Note :** Ces rendements sont obtenus avec la méthode SRI et une bonne gestion de l'eau. (Source : FOFIFA 2022)
"""

_STOP_SEQUENCES = [
    "<|user|>", "<|end|>", "<|assistant|>",
    "\nHuman:", "\nUser:", "\nUtilisateur:",
    "\nMachine Learning Model:", "\nAssistant:",
    "Human:", "User :", "Machine Learning",
]


# ─── Appel HTTP vers Colab ────────────────────────────────────────────────────


def _parse_sse_line(line: str):
    """
    Parse une ligne SSE du Colab au format pipe-délimité.
    Formats possibles :
      data: start|0|0
      data: token:TEXT|ELAPSED|PROGRESS
      data: thinking:TEXT|ELAPSED|PROGRESS
      data: end|ELAPSED|100
      data: offtopic:MESSAGE|ELAPSED|100
      data: error|0|0|MESSAGE
    Retourne (type, text, progress) ou None si ligne ignorable.
    """
    if not line.startswith("data:"):
        return None
    payload = line[5:].strip()

    # end
    if payload.startswith("end|"):
        return ("end", "", 100)

    # start
    if payload.startswith("start|"):
        return ("start", "", 0)

    # error
    if payload.startswith("error|"):
        parts = payload.split("|", 3)
        msg = parts[3] if len(parts) > 3 else "Erreur inconnue"
        return ("error", msg, 100)

    # offtopic
    if payload.startswith("offtopic:"):
        rest = payload[len("offtopic:"):]
        parts = rest.rsplit("|", 2)
        return ("offtopic", parts[0], 100)

    # token: ou thinking:
    for prefix in ("token:", "thinking:"):
        if payload.startswith(prefix):
            rest = payload[len(prefix):]
            # Séparer TEXT|ELAPSED|PROGRESS — le texte peut contenir des |
            parts = rest.rsplit("|", 2)
            text = parts[0] if parts else rest
            progress = int(parts[2]) if len(parts) == 3 and parts[2].isdigit() else 0
            kind = "token" if prefix == "token:" else "thinking"
            return (kind, text, progress)

    return None


def _call_colab_blocking(payload: dict) -> str:
    """
    Appelle /generate/rag_stream et collecte tous les tokens → texte complet.
    Utilisé par generate() pour un appel non-streaming.

    Payload attendu (Option B1) :
      {question, ontology_facts, ch_facts, context_tags, matched_keywords,
       max_new_tokens, temperature}
    Le RAG (embed + FAISS) est exécuté côté Colab.
    """
    if not COLAB_LLM_URL:
        raise ValueError("COLAB_LLM_URL non défini. Ajoutez-le dans le fichier .env.")

    full_text = []
    with requests.post(
        f"{COLAB_LLM_URL}/generate/rag_stream",
        json=payload,
        timeout=REQUEST_TIMEOUT,
        stream=True,
    ) as resp:
        resp.raise_for_status()
        for raw_line in resp.iter_lines():
            if not raw_line:
                continue
            line = raw_line.decode("utf-8") if isinstance(raw_line, bytes) else raw_line
            parsed = _parse_sse_line(line)
            if parsed is None:
                continue
            kind, text, progress = parsed
            if kind == "token" and text:
                full_text.append(text)
            elif kind in ("end", "error"):
                break

    return "".join(full_text)



def _post_process(text: str) -> str:
    """Nettoie la réponse : coupe aux stop sequences et retire les artefacts."""
    import re

    for seq in _STOP_SEQUENCES:
        idx = text.find(seq)
        if idx > 0:
            text = text[:idx]

    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        skip = any(
            stripped.startswith(m) for m in [
                "Human:", "User:", "Utilisateur:", "Machine Learning",
                "Assistant:", "<|", "Human :", "User :",
            ]
        )
        if not skip:
            lines.append(line)
    text = "\n".join(lines)

    # Supprimer les blocs de caractères CJK parasites
    text = re.sub(r'[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+', '', text)

    return text.strip()


# ─── Interface publique ───────────────────────────────────────────────────────


def get_model_info() -> dict:
    """Retourne les infos sur le modèle Colab (appel GET /info si disponible)."""
    if not COLAB_LLM_URL:
        return {"error": "COLAB_LLM_URL non défini"}
    try:
        resp = requests.get(f"{COLAB_LLM_URL}/info", timeout=10)
        if resp.ok:
            return resp.json()
    except Exception:
        pass
    return {
        "provider": "colab-ngrok",
        "endpoint": COLAB_LLM_URL,
        "status": "remote",
    }


def stream_generate(payload: dict):
    """
    Generator qui yield chaque token via /generate/rag_stream (SSE) du Colab.

    Le RAG (embed + FAISS) tourne maintenant dans Colab (Option B1).
    Render envoie un payload structuré, Colab construit le prompt augmenté
    en interne avec son vector_store local.

    Payload attendu :
      {question, ontology_facts, ch_facts, context_tags, matched_keywords,
       history?, max_new_tokens?, temperature?}

    Format SSE Colab : data: token:TEXT|ELAPSED|PROGRESS

    Yields :
      {"token": str, "done": bool, "progress": int}  → token normal
      {"error": str, "done": True, "progress": 100}  → erreur (LLM offline, timeout, etc.)
    """
    if not COLAB_LLM_URL:
        yield {
            "error": (
                "Le modèle LLM n'est pas connecté. "
                "L'administrateur doit définir COLAB_LLM_URL dans les variables "
                "d'environnement Render avec l'URL ngrok du notebook Colab."
            ),
            "done": True,
            "progress": 100,
        }
        return

    payload = {
        **payload,
        "max_new_tokens": payload.get("max_new_tokens", MAX_NEW_TOKENS),
        "temperature": payload.get("temperature", TEMPERATURE),
    }

    try:
        with requests.post(
            f"{COLAB_LLM_URL}/generate/rag_stream",
            json=payload,
            timeout=REQUEST_TIMEOUT,
            stream=True,
        ) as resp:
            resp.raise_for_status()
            for raw_line in resp.iter_lines():
                if not raw_line:
                    continue
                line = raw_line.decode("utf-8") if isinstance(raw_line, bytes) else raw_line
                parsed = _parse_sse_line(line)
                if parsed is None:
                    continue
                kind, text, progress = parsed
                if kind == "token":
                    yield {"token": text, "done": False, "progress": progress}
                elif kind == "end":
                    yield {"token": "", "done": True, "progress": 100}
                    return
                elif kind == "error":
                    yield {"error": f"Erreur Colab : {text}", "done": True, "progress": 100}
                    return
                # "start" et "thinking" ignorés (le frontend Django gère ses propres étapes)

    except requests.exceptions.ConnectionError as e:
        logger.error("Connexion Colab impossible: %s", e)
        yield {
            "error": (
                "Impossible de joindre le modèle LLM. "
                "Vérifiez que le notebook Colab est en cours d'exécution et que "
                "l'URL ngrok est à jour dans Render."
            ),
            "done": True,
            "progress": 100,
        }
        return
    except requests.exceptions.Timeout as e:
        logger.error("Timeout Colab: %s", e)
        yield {
            "error": "Le modèle LLM met trop de temps à répondre (timeout). Réessayez.",
            "done": True,
            "progress": 100,
        }
        return
    except Exception as e:
        logger.error("Erreur stream Colab: %s", e)
        yield {
            "error": f"Erreur de connexion au modèle : {e}",
            "done": True,
            "progress": 100,
        }
        return

    yield {"token": "", "done": True, "progress": 100}


def generate(pipeline_data: dict, history: list = None) -> dict:
    """
    Génère une réponse via le LLM Colab. Retourne reply, tokens, latence.

    Option B1 : le RAG (embed + FAISS) tourne dans Colab.
    Render envoie : question, ontology_facts, ch_facts, context_tags,
    matched_keywords, system_prompt, history.
    """
    if history is None:
        history = []

    t0 = time.time()

    try:
        payload = build_colab_payload(pipeline_data, history)
        raw_reply = _call_colab_blocking(payload)
        reply = _post_process(raw_reply)
        latency = round((time.time() - t0) * 1000)

        output_tokens = len(reply.split())

        return {
            "reply": reply,
            "thinking": "",
            "input_tokens": 0,
            "output_tokens": output_tokens,
            "latency_ms": latency,
            "tokens_per_second": round(output_tokens / (latency / 1000), 1) if latency > 0 else 0,
            "provider": "colab-ngrok",
            "model": "colab-llm",
            "max_tokens": MAX_NEW_TOKENS,
            "temperature": TEMPERATURE,
        }

    except Exception as e:
        logger.error("Erreur LLM Colab: %s", e)
        return {
            "reply": "Désolé, le modèle Colab est injoignable. Vérifiez que le notebook est actif et que l'URL ngrok est à jour.",
            "thinking": "",
            "input_tokens": 0,
            "output_tokens": 0,
            "latency_ms": round((time.time() - t0) * 1000),
            "error": str(e),
        }


# ─── Payload builder pour Colab (Option B1) ──────────────────────────────────


def build_colab_payload(pipeline_data: dict, history: list) -> dict:
    """
    Construit le payload JSON envoyé à /generate/rag_stream.

    Le RAG (embed + FAISS) tourne côté Colab. Render fournit :
    - le system prompt (source de vérité du format de réponse)
    - la question normalisée + l'historique conversation
    - les faits ontologiques (relations entre concepts du graphe rdflib)
    - les chiffres factuels ClickHouse (rendements, prix, production)
    - les context_tags + matched_keywords pour aider le re-ranking RAG côté Colab
    """
    return {
        "system_prompt": SYSTEM_PROMPT,
        "question": pipeline_data.get("enriched_text", ""),
        "history": [
            {"role": m["role"], "content": m["content"]}
            for m in (history or [])[-20:]
        ],
        "ontology_facts": pipeline_data.get("ontology_facts", ""),
        "ch_facts": pipeline_data.get("ch_facts", ""),
        "context_tags": pipeline_data.get("context_tags", []),
        "matched_keywords": pipeline_data.get("matched_keywords", []),
        "max_new_tokens": MAX_NEW_TOKENS,
        "temperature": TEMPERATURE,
    }


def build_prompt(
    user_message: str, rag_context: str, history: list, confidence_level: str = "high"
) -> str:
    """
    DEPRECATED — conservé pour compatibilité avec d'anciens tests.
    Le prompt est désormais construit côté Colab via build_colab_payload().
    """
    return user_message


# ─── Stubs (plus nécessaires, conservés pour compatibilité) ──────────────────


def clear_cache():
    """No-op : le modèle tourne sur Colab, pas en local."""
    pass


def reload_model():
    """No-op : le modèle tourne sur Colab, pas en local."""
    return {"status": "Modèle hébergé sur Colab — pas de rechargement local possible."}
