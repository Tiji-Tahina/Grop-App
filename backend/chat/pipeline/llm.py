"""
Step 4 of the pipeline: calling the LLM hosted on Google Colab via HTTP (FastAPI + ngrok).
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

# HTTP timeout (the Colab model may be slow to respond)
REQUEST_TIMEOUT = 120  # seconds

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

EXEMPLE DE BONNE REPONSE (sujet illustratif — NE PAS RECOPIER) :

## Lutte contre la pyriculariose du riz

La pyriculariose est une maladie fongique majeure causée par Magnaporthe oryzae.

### Symptômes

- Taches losangiques **gris-brun** sur les feuilles
- Cou de panicule noirci entrainant la chute des grains
- Apparition favorisée par l'humidité élevée (> **85 %**) et l'azote excédentaire

### Stratégies de contrôle

1. Choisir des variétés résistantes (ex : Sebota 281)
2. Réduire la fumure azotée à **80 kg/ha** maximum
3. Traitement préventif au tricyclazole en cas de pression élevée

> **Note :** La rotation rizicole avec une légumineuse réduit l'inoculum résiduel. (Source : FOFIFA 2021)

═══════════════════════════════════════
INTERDITS — sous peine de réponse rejetée
═══════════════════════════════════════

- Ne JAMAIS recopier l'exemple ci-dessus mot pour mot, c'est juste une illustration de format.
- Ne JAMAIS produire de section nommée "Récapitulation", "Conclusion", "Notes supplémentaires",
  "Résumé", "Synthèse", "Pour aller plus loin". Une seule reponse directe, sans meta-commentaire.
- Ne JAMAIS dupliquer le contenu (réécrire la même section deux fois).
- Toujours mettre des sauts de ligne entre titres, paragraphes, listes et tableaux.
"""

_STOP_SEQUENCES = [
    "<|user|>", "<|end|>", "<|assistant|>",
    "\nHuman:", "\nUser:", "\nUtilisateur:",
    "\nMachine Learning Model:", "\nAssistant:",
    "Human:", "User :", "Machine Learning",
]

# Unicode box-drawing characters that Qwen2 sometimes uses for tables,
# instead of the ASCII pipe | that Markdown expects. Remapped on the fly.
_BOX_DRAWING_TO_ASCII = str.maketrans({
    "│": "|", "┃": "|", "║": "|",
    "─": "-", "━": "-", "═": "-",
    "┌": "+", "┐": "+", "└": "+", "┘": "+",
    "├": "+", "┤": "+", "┬": "+", "┴": "+", "┼": "+",
})


def _clean_token(text: str) -> str:
    """Normalizes stray characters during streaming (cheap, per token)."""
    if not text:
        return text
    return text.translate(_BOX_DRAWING_TO_ASCII)


# ─── HTTP call to Colab ────────────────────────────────────────────────────


def _parse_sse_line(line: str):
    """
    Parses an SSE line from Colab in pipe-delimited format.
    Possible formats:
      data: start|0|0
      data: token:TEXT|ELAPSED|PROGRESS
      data: thinking:TEXT|ELAPSED|PROGRESS
      data: end|ELAPSED|100
      data: offtopic:MESSAGE|ELAPSED|100
      data: error|0|0|MESSAGE
    Returns (type, text, progress) or None if line is ignorable.
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
        msg = parts[3] if len(parts) > 3 else "Unknown error"
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
            # Split TEXT|ELAPSED|PROGRESS — the text may contain |
            parts = rest.rsplit("|", 2)
            text = parts[0] if parts else rest
            progress = int(parts[2]) if len(parts) == 3 and parts[2].isdigit() else 0
            kind = "token" if prefix == "token:" else "thinking"
            return (kind, text, progress)

    return None


def _call_colab_blocking(payload: dict) -> str:
    """
    Calls /generate/rag_stream and collects all tokens → full text.
    Used by generate() for non-streaming calls.

    Expected payload (Option B1):
      {question, ontology_facts, ch_facts, context_tags, matched_keywords,
       max_new_tokens, temperature}
    RAG (embed + FAISS) is executed on the Colab side.
    """
    if not COLAB_LLM_URL:
        raise ValueError("COLAB_LLM_URL not defined. Add it to the .env file.")

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
    """Cleans the response: truncates at stop sequences and removes artifacts."""
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

    # Remove stray CJK character blocks
    text = re.sub(r'[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+', '', text)

    return text.strip()


# ─── Public interface ───────────────────────────────────────────────────────


def get_model_info() -> dict:
    """Returns info about the Colab model (calls GET /info if available)."""
    if not COLAB_LLM_URL:
        return {"error": "COLAB_LLM_URL not defined"}
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
    Generator that yields each token via /generate/rag_stream (SSE) from Colab.

    RAG (embed + FAISS) now runs inside Colab (Option B1).
    Render sends a structured payload, Colab builds the augmented prompt
    internally with its local vector_store.

    Expected payload:
      {question, ontology_facts, ch_facts, context_tags, matched_keywords,
       history?, max_new_tokens?, temperature?}

    Colab SSE format: data: token:TEXT|ELAPSED|PROGRESS

    Yields:
      {"token": str, "done": bool, "progress": int}  → normal token
      {"error": str, "done": True, "progress": 100}  → error (LLM offline, timeout, etc.)
    """
    if not COLAB_LLM_URL:
        yield {
            "error": (
                "The LLM model is not connected. "
                "The administrator must set COLAB_LLM_URL in the Render "
                "environment variables with the Colab notebook ngrok URL."
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
                    yield {"token": _clean_token(text), "done": False, "progress": progress}
                elif kind == "end":
                    yield {"token": "", "done": True, "progress": 100}
                    return
                elif kind == "error":
                    yield {"error": f"Colab error: {text}", "done": True, "progress": 100}
                    return
                # "start" and "thinking" ignored (Django frontend manages its own stages)

    except requests.exceptions.ConnectionError as e:
        logger.error("Colab connection failed: %s", e)
        yield {
            "error": (
                "Unable to reach the LLM model. "
                "Check that the Colab notebook is running and that "
                "the ngrok URL is up to date in Render."
            ),
            "done": True,
            "progress": 100,
        }
        return
    except requests.exceptions.Timeout as e:
        logger.error("Colab timeout: %s", e)
        yield {
            "error": "The LLM model is taking too long to respond (timeout). Please try again.",
            "done": True,
            "progress": 100,
        }
        return
    except Exception as e:
        logger.error("Colab stream error: %s", e)
        yield {
            "error": f"Model connection error: {e}",
            "done": True,
            "progress": 100,
        }
        return

    yield {"token": "", "done": True, "progress": 100}


def generate(pipeline_data: dict, history: list = None) -> dict:
    """
    Generates a response via the Colab LLM. Returns reply, tokens, latency.

    Option B1: RAG (embed + FAISS) runs in Colab.
    Render sends: question, ontology_facts, ch_facts, context_tags,
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
        logger.error("Colab LLM error: %s", e)
        return {
            "reply": "Sorry, the Colab model is unreachable. Check that the notebook is active and that the ngrok URL is up to date.",
            "thinking": "",
            "input_tokens": 0,
            "output_tokens": 0,
            "latency_ms": round((time.time() - t0) * 1000),
            "error": str(e),
        }


# ─── Payload builder for Colab (Option B1) ──────────────────────────────────


def build_colab_payload(
    pipeline_data: dict, history: list, system_prompt: str | None = None
) -> dict:
    """
    Builds the JSON payload sent to /generate/rag_stream.

    RAG (embed + FAISS) runs on the Colab side. Render provides:
    - the system prompt (source of truth for response format)
    - the normalized question + conversation history
    - ontological facts (relations between concepts from the rdflib graph)
    - factual ClickHouse figures (yields, prices, production)
    - context_tags + matched_keywords to help RAG re-ranking on Colab

    `system_prompt` override: passed by `intent.run_intent` in slow-path to
    inject <map_action> instructions. None → standard SYSTEM_PROMPT.
    """
    return {
        "system_prompt": system_prompt if system_prompt is not None else SYSTEM_PROMPT,
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
    DEPRECATED — kept for backward compatibility with older tests.
    The prompt is now built on the Colab side via build_colab_payload().
    """
    return user_message


# ─── Stubs (no longer needed, kept for compatibility) ──────────────────


def clear_cache():
    """No-op: the model runs on Colab, not locally."""
    pass


def reload_model():
    """No-op: the model runs on Colab, not locally."""
    return {"status": "Model hosted on Colab — local reload not possible."}
