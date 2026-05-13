"""
Pipeline d'intention : transforme une question utilisateur en `MapAction`.

Trois étages :
    1. extract_rules()  → règles + ontologie produisent un MapAction partiel (sans data)
    2. enrich_with_llm() → le LLM Colab complète/corrige (technique Y, balise <map_action>)  [TODO 2b–2d]
    3. fetch_map_data() → le warehouse calcule les data (délégué à data_werehouse/map_facts.py)

Sous-tâche 2a : seule la couche `extract_rules` est implémentée ici.
Les autres fonctions sont en TODO et seront ajoutées dans les sous-tâches suivantes.
"""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from typing import Literal

from pydantic import ValidationError

from .schemas import (
    Explain,
    MapAction,
    MapActionFilters,
    MapActionView,
    Metric,
    Op,
)

logger = logging.getLogger(__name__)

ConfidenceLevel = Literal["high", "low", "none"]


# ─── Vocabulaires de détection ─────────────────────────────────────────────
# Multilingue FR/MG/EN. Tous en minuscules, accents pré-strippés via _norm.

_OP_TRIGGERS: dict[Op, list[str]] = {
    "compare":    ["compare", "comparer", "compares", "comparaison", "vs", "versus", "ampitahao"],
    "highlight":  ["ou est", "ou se trouve", "ou sont", "localiser", "localise", "situer",
                   "aiza", "where is", "show me", "montre moi"],
    "drill_down": ["detaille", "detailler", "detail", "zoome", "zoom sur", "approfondi",
                   "mizoom", "drill", "in detail", "par district", "districts de"],
    "clear":      ["vue nationale", "reinitialise", "reinitialiser", "reset", "carte de base",
                   "remettre a zero", "efface tout", "efface", "vue par defaut", "tout"],
    # slice et dice sont déduits du nombre de dimensions extraites
}

_METRIC_TRIGGERS: dict[Metric, list[str]] = {
    "yield":      ["rendement", "rendements", "productivite", "yield", "famokarana", "kg/ha", "t/ha"],
    "production": ["production", "volume", "tonnage", "tonnes", "produit", "famokarana an-tany"],
    "price":      ["prix", "cout", "couts", "marche", "vidiny", "tarif", "price"],
    "area":       ["surface", "surfaces", "superficie", "hectare", "hectares", "ha", "velarana"],
}

# Cultures connues (synchronisé avec data_werehouse/dw_madagascar.py)
_CULTURE_TO_DB: dict[str, str] = {
    "riz":          "Riz",
    "manioc":       "Manioc",
    "mais":         "Maïs",
    "vanille":      "Vanille",
    "girofle":      "Girofle",
    "cafe":         "Café",
    "haricot":      "Haricot",
    "patate douce": "Patate douce",
    "patate":       "Patate douce",
    "arachide":     "Arachide",
}

# Régions connues — slug ASCII-safe ↔ noms DB (synchronisé avec map_facts.SLUG_TO_DB_REGION)
# On déduplique la source côté map_facts par import différé pour éviter les imports circulaires.
_REGION_VARIANTS: dict[str, str] = {
    # variantes textuelles libres → slug canonique
    "diana": "diana",
    "sava": "sava",
    "analanjirofo": "analanjirofo",
    "atsinanana": "atsinanana",
    "vatovavy": "vatovavy-fitovinany",
    "vatovavy-fitovinany": "vatovavy-fitovinany",
    "vatovavy fitovinany": "vatovavy-fitovinany",
    "atsimo-atsinanana": "atsimo-atsinanana",
    "atsimo atsinanana": "atsimo-atsinanana",
    "anosy": "anosy",
    "androy": "androy",
    "atsimo-andrefana": "atsimo-andrefana",
    "atsimo andrefana": "atsimo-andrefana",
    "menabe": "menabe",
    "melaky": "melaky",
    "boeny": "boeny",
    "sofia": "sofia",
    "betsiboka": "betsiboka",
    "analamanga": "analamanga",
    "tana": "analamanga",
    "antananarivo": "analamanga",
    "itasy": "itasy",
    "bongolava": "bongolava",
    "vakinankaratra": "vakinankaratra",
    "amoron'i mania": "amoron-i-mania",
    "amoron i mania": "amoron-i-mania",
    "amoron-i-mania": "amoron-i-mania",
    "haute matsiatra": "haute-matsiatra",
    "haute-matsiatra": "haute-matsiatra",
    "ihorombe": "ihorombe",
    "alaotra-mangoro": "alaotra-mangoro",
    "alaotra mangoro": "alaotra-mangoro",
    "alaotra": "alaotra-mangoro",
}

# Variétés courantes (allowlist V1, sera enrichie par l'ontologie en V1.5)
# Mappage variety → crop : permet d'inférer le crop quand seule la variété est mentionnée.
_VARIETY_TO_CROP: dict[str, str] = {
    "Makalioka":    "Riz",
    "FOFIFA 154":   "Riz",
    "FOFIFA 161":   "Riz",
    "FOFIFA 3069":  "Riz",
    "NERICA 4":     "Riz",
    "NERICA":       "Riz",
    "X265":         "Riz",
    "Sebota":       "Riz",
    "MM89":         "Manioc",
}
_KNOWN_VARIETIES: list[str] = list(_VARIETY_TO_CROP.keys())

# Hints spatiaux : mots qui indiquent que l'utilisateur veut une vue carte
# même sans déclencheur explicite (« régions favorables », « adapté à »...).
_SPATIAL_HINTS: list[str] = [
    "regions", "region", "carte", "cartes", "map", "carte de",
    "favorable", "favorables", "adapte", "adaptes",
    "convient", "conviennent", "mety", "tsara",
]


# ─── Helpers de normalisation ──────────────────────────────────────────────


def _norm(text: str) -> str:
    """Passe en minuscules + retire accents pour matching case/accent-insensitive."""
    if not text:
        return ""
    t = unicodedata.normalize("NFKD", text)
    t = "".join(c for c in t if not unicodedata.combining(c))
    return t.lower()


def _phrase_in(needle: str, haystack: str) -> bool:
    """Vrai si `needle` (déjà normalisé) apparaît avec frontières de mots dans haystack."""
    pattern = r"(?<![a-z0-9])" + re.escape(needle) + r"(?![a-z0-9])"
    return bool(re.search(pattern, haystack))


# ─── Détecteurs unitaires ──────────────────────────────────────────────────


def _detect_op_from_triggers(text_norm: str) -> Op | None:
    """Cherche les déclencheurs explicites d'opération (priorité aux mots-clés rares)."""
    # Ordre important : "compare" et "vs" gagnent même si d'autres triggers présents
    for op, triggers in _OP_TRIGGERS.items():
        for t in triggers:
            if _phrase_in(t, text_norm):
                return op
    return None


def _detect_crop(text_norm: str) -> str | None:
    """Retourne le nom DB de la PREMIÈRE culture détectée (ex: 'Riz')."""
    for keyword, db_name in _CULTURE_TO_DB.items():
        if _phrase_in(keyword, text_norm):
            return db_name
    return None


def _detect_all_crops(text_norm: str) -> list[str]:
    """Retourne TOUTES les cultures détectées dans l'ordre d'apparition (utile pour compare)."""
    found: list[str] = []
    seen: set[str] = set()
    for keyword, db_name in _CULTURE_TO_DB.items():
        if _phrase_in(keyword, text_norm) and db_name not in seen:
            found.append(db_name)
            seen.add(db_name)
    return found


def _detect_year(text_norm: str) -> int | None:
    """Extrait une année 2000-2029 du texte."""
    m = re.search(r"\b(20[0-2]\d)\b", text_norm)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            return None
    return None


def _detect_regions(text_norm: str) -> list[str]:
    """Retourne la liste des slugs régionaux détectés (peut être vide)."""
    found: list[str] = []
    seen: set[str] = set()
    # On itère sur les clés triées par longueur décroissante pour matcher
    # « alaotra-mangoro » avant « alaotra » (alias court).
    for variant in sorted(_REGION_VARIANTS, key=len, reverse=True):
        if _phrase_in(_norm(variant), text_norm):
            slug = _REGION_VARIANTS[variant]
            if slug not in seen:
                found.append(slug)
                seen.add(slug)
    return found


def _detect_variety(original_text: str) -> str | None:
    """Détecte une variété connue (matching case-sensitive sur le texte original)."""
    for v in _KNOWN_VARIETIES:
        if re.search(r"\b" + re.escape(v) + r"\b", original_text, flags=re.IGNORECASE):
            return v
    return None


def _detect_metric(text_norm: str, context_tags: list[str], op: Op | None) -> Metric | None:
    """Infère la métrique à afficher.

    Priorité : mots explicites > tags ontologiques > défaut selon op.
    """
    # 1. Mots explicites dans la question
    for metric, triggers in _METRIC_TRIGGERS.items():
        for t in triggers:
            if _phrase_in(t, text_norm):
                return metric

    # 2. Tags ontologiques (enrichis en amont par ontology.validate_and_enrich)
    if "yield_prediction" in context_tags:
        return "yield"
    if "market" in context_tags:
        return "price"

    # 3. Défaut selon op
    if op == "clear":
        return "production"
    if op in ("highlight",):
        return None  # highlight peut se passer de métrique
    return None  # le LLM devra trancher en slow-path


def _has_metric_word(text_norm: str) -> bool:
    """Vrai si le texte contient un mot évoquant une métrique numérique."""
    for triggers in _METRIC_TRIGGERS.values():
        for t in triggers:
            if _phrase_in(t, text_norm):
                return True
    return False


def _has_spatial_hint(text_norm: str) -> bool:
    """Vrai si la question parle de régions / cartes / aptitude — signe d'intention carte."""
    for h in _SPATIAL_HINTS:
        if _phrase_in(h, text_norm):
            return True
    return False


def _build_default_title(
    op: Op, crop: str | None, year: int | None, regions: list[str]
) -> str:
    """Construit un titre court par défaut (le LLM peut l'améliorer en slow-path)."""
    parts: list[str] = []
    if op == "clear":
        return "Vue nationale"
    if op == "highlight":
        if regions:
            return f"Région {regions[0].replace('-', ' ').title()}"
        return "Localisation"
    if op == "compare":
        return f"Comparaison{' ' + crop if crop else ''}"
    if op == "drill_down" and regions:
        return f"Détail {regions[0].replace('-', ' ').title()}"

    # slice / dice
    if crop:
        parts.append(crop)
    if year:
        parts.append(str(year))
    if regions and len(regions) <= 3:
        parts.append("(" + ", ".join(r.replace("-", " ").title() for r in regions) + ")")
    return " ".join(parts) or "Carte"


# ─── API publique ──────────────────────────────────────────────────────────


def extract_rules(onto_result: dict, original_question: str = "") -> MapAction | None:
    """Extraction d'intention par règles depuis un onto_result + texte original.

    Retourne :
        - `MapAction` partiel (sans `data`) si la question est géospatiale
        - `None` sinon (le pipeline retombe sur le chat texte classique)

    Ne fait AUCUN appel LLM ni warehouse — pure extraction syntaxique.
    """
    text_orig = onto_result.get("enriched_text") or original_question or ""
    text_norm = _norm(text_orig)
    if not text_norm.strip():
        return None

    context_tags: list[str] = onto_result.get("context_tags", [])

    # 1. Détection des éléments
    triggered_op = _detect_op_from_triggers(text_norm)
    crops_all = _detect_all_crops(text_norm)
    crop = crops_all[0] if crops_all else None
    year = _detect_year(text_norm)
    regions = _detect_regions(text_norm)
    variety = _detect_variety(text_orig)

    # Inférence : si on a une variété mais pas de crop, on déduit le crop.
    if variety and not crop:
        inferred = _VARIETY_TO_CROP.get(variety)
        if inferred:
            crop = inferred

    # 2. Décide si la question est géospatiale (heuristique stricte — pas de faux positif)
    has_trigger = triggered_op is not None
    has_region = bool(regions)
    has_metric_word = _has_metric_word(text_norm)
    has_spatial_hint = _has_spatial_hint(text_norm)

    is_geospatial = (
        has_trigger
        or has_region
        or (has_metric_word and crop)
        or (has_spatial_hint and (crop or year))
        or (year is not None and crop is not None)  # « Riz 2024 » = requête data
    )
    if not is_geospatial:
        return None

    # 3. Détermine l'opération finale
    if triggered_op is not None:
        op: Op = triggered_op
    else:
        dim_count = sum(1 for x in (crop, year, regions, variety) if x)
        if dim_count >= 2:
            op = "dice"
        elif dim_count >= 1:
            op = "slice"
        else:
            return None  # aucune dimension → rien à montrer

    # 4. Métrique (peut rester None pour highlight)
    metric = _detect_metric(text_norm, context_tags, op)

    # 5. View selon l'op
    view_kwargs: dict = {"zoom_level": "country"}
    if op == "drill_down" and regions:
        view_kwargs = {"zoom_level": "district", "scope_region": regions[0]}
    elif op == "highlight" and regions:
        view_kwargs = {"zoom_level": "country", "highlighted_areas": regions}

    # 6. Compare exige un bloc comparison cohérent. On essaie axis=crop puis axis=region.
    # Si pas assez d'info, on dégrade en dice/slice (le LLM en slow-path peut tjs réinterpréter).
    comparison_kwargs: dict | None = None
    if op == "compare":
        if len(crops_all) >= 2:
            comparison_kwargs = {
                "axis": "crop",
                "left":  {"label": crops_all[0], "filters": {"crop": crops_all[0]}},
                "right": {"label": crops_all[1], "filters": {"crop": crops_all[1]}},
            }
        elif len(regions) >= 2:
            comparison_kwargs = {
                "axis": "region",
                "left":  {"label": regions[0].replace("-", " ").title(),
                          "filters": {"regions": [regions[0]]}},
                "right": {"label": regions[1].replace("-", " ").title(),
                          "filters": {"regions": [regions[1]]}},
            }
        else:
            # Compare détecté mais pas assez d'info → on dégrade
            dim_count = sum(1 for x in (crop, year, regions, variety) if x)
            op = "dice" if dim_count >= 2 else "slice"

    # 7. Filters root (highlight et compare ne posent PAS regions ici — visuel pour l'un,
    # délégué à comparison.left/right pour l'autre)
    filters_kwargs: dict = {}
    if crop:
        filters_kwargs["crop"] = crop
    if variety:
        filters_kwargs["variety"] = variety
    if year is not None:
        filters_kwargs["year"] = year
    if regions and op not in ("highlight", "compare"):
        filters_kwargs["regions"] = regions

    # 8. Explain par défaut
    title = _build_default_title(op, crop, year, regions)

    # 9. Pour op=compare, le `data` est interdit et `comparison` est requis.
    # Pour les autres ops, on pose `data=None` (le warehouse remplira plus tard).
    try:
        kwargs: dict = {
            "op": op,
            "filters": MapActionFilters(**filters_kwargs),
            "metric": metric,
            "view": MapActionView(**view_kwargs),
            "explain": Explain(title=title) if title else None,
        }
        if comparison_kwargs is not None:
            from .schemas import Comparison
            kwargs["comparison"] = Comparison(**comparison_kwargs)
        return MapAction(**kwargs)
    except ValidationError as e:
        logger.warning("extract_rules : MapAction invalide rejeté (%s)", e.errors()[0]["msg"])
        return None


def confidence_level(map_action: MapAction | None) -> ConfidenceLevel:
    """Classifie la confiance du fast-path.

    HIGH = on peut envoyer le map_action immédiatement (~100ms) sans attendre le LLM.
    LOW  = on doit laisser le LLM enrichir (slow-path, ~2-3s).
    NONE = pas géospatial, on bypass tout le pipeline map_action.
    """
    if map_action is None:
        return "none"
    op = map_action.op
    f = map_action.filters

    # Cas évidents : cleared, highlight avec région, slice/drill_down avec dimensions
    if op == "clear":
        return "high"
    if op == "highlight" and (map_action.view.highlighted_areas or f.regions):
        return "high"
    if op == "slice" and f.crop:
        return "high"
    if op == "drill_down" and f.regions:
        return "high"

    return "low"


# ─── Slow-path : prompt étendu pour le LLM ────────────────────────────────


MAP_ACTION_INSTRUCTIONS = """\
═══════════════════════════════════════
PROTOCOLE INTERNE — BALISE INVISIBLE
═══════════════════════════════════════

Cette question est geospatiale. Le backend a deja prepare ce plan carte :

{PARTIAL_BLOCK}

TON ROLE :
1) Repete ce JSON tel quel, encadre par <map_action>...</map_action>, sur UNE seule ligne.
2) IMMEDIATEMENT apres la balise fermante, ecris ta reponse markdown utilisateur.

REGLES ABSOLUES — sous peine de reponse rejetee :

- La balise <map_action>...</map_action> est INVISIBLE pour l'utilisateur final.
- N'ecris JAMAIS dans le markdown les mots : map_action, filters, view, comparison,
  zoom_level, scope_region, axis, op, metric. Ces mots sont du jargon backend.
- N'EXPLIQUE PAS ce que tu fais. Pas de meta-phrase comme « Rédaction de la réponse »,
  « Voici le JSON », « D'abord la balise », « Notes supplémentaires ». Sois direct.
- N'inclus PAS de section « Resume », « Notes », « Contexte technique »,
  « Filters », « Data available ». Ces choses appartiennent a la balise, pas au markdown.
- Tableaux markdown : utilise UNIQUEMENT le caractere ASCII | (pipe vertical),
  JAMAIS │ ou ─ ou ┌┐└┘ (caracteres Unicode interdits).

EXEMPLE DE SORTIE CORRECTE :

<map_action>{"op":"slice","filters":{"crop":"Riz"},"metric":"yield","view":{"zoom_level":"country"},"explain":{"title":"Rendement riz"}}</map_action>
## Rendement du riz a Madagascar

Phrase d'introduction concise.

| Region | Rendement |
|--------|-----------|
| Diana  | 2.5 t/ha  |

EXEMPLE DE SORTIE INCORRECTE (a NE PAS faire) :

Rédaction de la réponse...
## Rendement du riz
...
- Filters crop : "Riz".
- View zoom level : "country".

Tu peux corriger un champ du JSON uniquement si la pre-analyse a manque une evidence
(ex. compare avec une seule culture). Sinon repete-la a l'identique.
"""


def build_extended_system_prompt(partial: MapAction | None) -> str:
    """[2b] Concatene SYSTEM_PROMPT + MAP_ACTION_INSTRUCTIONS + pre-analyse partial.

    Appele par run_intent (2d) UNIQUEMENT quand confidence_level != "none".
    Retourne la chaine a passer a build_colab_payload comme system_prompt.

    `partial` = MapAction issu de extract_rules (sans data). On le serialise en JSON
    compact que le LLM reutilisera presque tel quel dans sa balise de sortie.
    """
    from .llm import SYSTEM_PROMPT  # import local : evite le cycle intent ↔ llm

    if partial is None:
        partial_block = "(aucune pre-analyse — deduis op/filters/metric/view depuis la question)"
    else:
        partial_dict = partial.model_dump(exclude_none=True, exclude={"data"})
        partial_block = json.dumps(partial_dict, ensure_ascii=False, separators=(",", ":"))

    instructions = MAP_ACTION_INSTRUCTIONS.replace("{PARTIAL_BLOCK}", partial_block)
    return f"{SYSTEM_PROMPT}\n\n{instructions}"


# ─── Parsing du stream LLM : extraction de la balise <map_action> ─────────


_OPEN_TAG = "<map_action>"
_CLOSE_TAG = "</map_action>"
_SCAN_BUFFER_KEEP = len(_OPEN_TAG)  # nb de chars à retenir en SCAN pour ne pas émettre un préfixe d'open tag


def _try_parse_map_action(raw_json: str) -> MapAction | None:
    """Tente de valider le JSON brut entre <map_action>...</map_action>. Retourne None si invalide."""
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError as e:
        logger.warning("parse_stream : JSON map_action invalide (%s) — payload=%r", e, raw_json[:200])
        return None
    try:
        return MapAction.model_validate(data)
    except ValidationError as e:
        logger.warning("parse_stream : MapAction rejeté par Pydantic (%s)", e.errors()[0]["msg"])
        return None


def parse_stream_with_map_action(stream):
    """[2c] Wrappe `llm.stream_generate`, isole la balise <map_action> du texte markdown.

    Le LLM produit, sous slow-path, une balise `<map_action>{...JSON...}</map_action>`
    suivie du markdown habituel. Cette balise ne doit JAMAIS atteindre l'utilisateur :
    on la consomme côté backend pour rafraîchir la carte.

    Yields :
        {"token": str, "done": False, "progress": int}     — texte markdown user-visible
        {"map_action": MapAction | None, "done": False}    — émis 1 fois quand la balise se ferme
                                                             (None = tag trouvé mais JSON/Pydantic KO)
        {"error": str, "done": True, "progress": 100}      — passthrough erreur LLM
        {"done": True, "progress": int}                    — fin de stream

    Garanties :
        - La balise <map_action>...</map_action> n'apparaît jamais dans `token`.
        - Aucun event "map_action" si la balise est absente du flux (caller fallback sur partial).
        - Si la balise s'ouvre mais ne se ferme pas (LLM tronqué), on jette le contenu et on log.

    Machine à états :
        SCAN   — on cherche <map_action>, on émet le texte précédant
        INSIDE — entre les balises, on accumule le JSON sans émettre
        AFTER  — balise consommée, tout token devient texte
    """
    state = "SCAN"
    buffer = ""

    for chunk in stream:
        # Erreur LLM : flush le buffer (texte safe) puis passthrough
        if chunk.get("error"):
            if state == "SCAN" and buffer:
                yield {"token": buffer, "done": False, "progress": chunk.get("progress", 0)}
                buffer = ""
            yield chunk
            return

        if chunk.get("done"):
            # Fin propre : flush ce qui reste selon l'état
            if state == "SCAN" and buffer:
                yield {"token": buffer, "done": False, "progress": chunk.get("progress", 99)}
            elif state == "INSIDE":
                logger.warning("parse_stream : <map_action> non fermé (LLM tronqué) — %d chars perdus", len(buffer))
            elif state == "AFTER" and buffer:
                yield {"token": buffer, "done": False, "progress": chunk.get("progress", 99)}
            yield chunk
            return

        token = chunk.get("token", "")
        if not token:
            continue
        buffer += token
        progress = chunk.get("progress", 0)

        # ─── SCAN : on cherche l'open tag ─────────────────────────────────
        if state == "SCAN":
            idx = buffer.find(_OPEN_TAG)
            if idx != -1:
                if idx > 0:
                    yield {"token": buffer[:idx], "done": False, "progress": progress}
                buffer = buffer[idx + len(_OPEN_TAG):]
                state = "INSIDE"
                # → tombe dans le bloc INSIDE ci-dessous pour traiter le reste du chunk
            else:
                # Pas de tag : on émet ce qui est sûr de ne pas être un préfixe (« <ma », « <map_act »...)
                if len(buffer) > _SCAN_BUFFER_KEEP:
                    safe = buffer[:-_SCAN_BUFFER_KEEP]
                    yield {"token": safe, "done": False, "progress": progress}
                    buffer = buffer[-_SCAN_BUFFER_KEEP:]
                continue

        # ─── INSIDE : on accumule jusqu'au close tag ──────────────────────
        if state == "INSIDE":
            idx = buffer.find(_CLOSE_TAG)
            if idx != -1:
                raw_json = buffer[:idx]
                yield {"map_action": _try_parse_map_action(raw_json), "done": False}
                buffer = buffer[idx + len(_CLOSE_TAG):]
                state = "AFTER"
                # → tombe dans AFTER pour yield le reste du chunk
            else:
                # Tag pas encore fermé, on continue d'accumuler sans rien émettre
                continue

        # ─── AFTER : tout devient texte ───────────────────────────────────
        if state == "AFTER" and buffer:
            yield {"token": buffer, "done": False, "progress": progress}
            buffer = ""

    # Stream épuisé sans `done` explicite (cas dégradé) : on flush ce qu'on a
    if state == "SCAN" and buffer:
        yield {"token": buffer, "done": False, "progress": 99}
    elif state == "INSIDE":
        logger.warning("parse_stream : flux interrompu dans <map_action> (%d chars perdus)", len(buffer))
    elif state == "AFTER" and buffer:
        yield {"token": buffer, "done": False, "progress": 99}


# ─── Orchestrateur : fast-path / slow-path / bypass ───────────────────────


def _attach_data_to_action(action: MapAction, data) -> None:
    """Greffe le résultat warehouse dans le bon slot du MapAction (mutation in-place).

    - DataPayload    → action.data           (ops slice/dice/drill_down/clear)
    - ComparisonData → action.comparison.data (op=compare)
    - None           → no-op (highlight, ou warehouse indisponible)
    """
    if data is None:
        return
    from .schemas import ComparisonData, DataPayload

    if isinstance(data, ComparisonData) and action.comparison is not None:
        action.comparison.data = data
    elif isinstance(data, DataPayload):
        action.data = data


def _enrich_and_emit(action: MapAction):
    """Appelle `fetch_map_data` (warehouse) puis yield l'event map_action sérialisé.

    Tolère un warehouse en panne : on log et on emit le map_action sans data
    (le front doit savoir afficher une carte sans valeurs colorées).
    """
    from data_werehouse import map_facts  # import local : data_werehouse hors module chat

    try:
        data = map_facts.fetch_map_data(action)
        _attach_data_to_action(action, data)
    except Exception as exc:  # noqa: BLE001 — on absorbe TOUTE panne warehouse
        logger.warning("run_intent : fetch_map_data a échoué (%s) — payload sans data", exc)

    yield {
        "event": "map_action",
        "payload": action.model_dump(mode="json", exclude_none=True),
    }


def _stream_plain_llm(onto_result: dict, history: list):
    """Stream LLM avec `SYSTEM_PROMPT` standard (pas d'instructions map_action).

    Utilisé pour la branche `none` (question non-géospatiale) et après l'envoi
    du map_action en fast-path : on a déjà le plan carte, on demande juste la
    réponse markdown au LLM sans le distraire avec des instructions de balise.
    """
    from .llm import build_colab_payload, stream_generate

    payload = build_colab_payload(onto_result, history=history)
    for result in stream_generate(payload):
        if result.get("error"):
            yield {"event": "error", "message": result["error"]}
            return
        token = result.get("token", "")
        if token:
            yield {"event": "token", "text": token, "progress": result.get("progress", 0)}
        if result.get("done"):
            return


def run_intent(onto_result: dict, question: str, history: list):
    """[2d] Orchestrateur principal map_action.

    Yield des events structurés que `views.stream_chat` convertit en SSE :
        {"event": "thinking", "stage": str}             — étape pour la UI
        {"event": "map_action", "payload": dict}        — MapAction validé + data, prêt front
        {"event": "token", "text": str, "progress": int} — fragment markdown
        {"event": "error", "message": str}              — erreur fatale
        (le caller emet `end` lui-même après le dernier yield)

    Trois branches selon `confidence_level(partial)` :

    - **none**  → question non géospatiale. Stream LLM standard, aucun map_action.
    - **high**  → fast-path : `fetch_map_data(partial)` + emit map_action AVANT
                  le LLM. Carte affichée en ~100 ms. LLM appelé pour le markdown.
    - **low**   → slow-path : LLM appelé avec prompt étendu (instructions
                  <map_action>). `parse_stream_with_map_action` extrait la balise.
                  Si le LLM en émet une valide → on l'utilise, sinon → fallback partial.
                  Dans tous les cas on enrichit avec `fetch_map_data` puis on emit.
    """
    from .llm import build_colab_payload, stream_generate

    # ─── Étape 1 : extraction règles + classification confiance ────────
    partial = extract_rules(onto_result, question)
    confidence = confidence_level(partial)
    logger.info("run_intent : confidence=%s op=%s", confidence,
                partial.op if partial else None)

    # ─── Branche NONE : pas géospatial → LLM standard ──────────────────
    if confidence == "none":
        yield from _stream_plain_llm(onto_result, history)
        return

    # À ce stade `partial` est garanti non-None (sinon confidence == "none")
    assert partial is not None

    # ─── Branche HIGH : fast-path ──────────────────────────────────────
    if confidence == "high":
        yield {"event": "thinking", "stage": "Préparation de la carte..."}
        yield from _enrich_and_emit(partial)
        # Le map_action est déjà parti vers le front ; on demande maintenant
        # le markdown au LLM avec le prompt standard (pas d'instructions tag).
        yield from _stream_plain_llm(onto_result, history)
        return

    # ─── Branche LOW : slow-path ──────────────────────────────────────
    yield {"event": "thinking", "stage": "Construction du plan carte..."}

    extended_prompt = build_extended_system_prompt(partial)
    payload = build_colab_payload(
        onto_result, history=history, system_prompt=extended_prompt
    )

    map_action_emitted = False
    for ev in parse_stream_with_map_action(stream_generate(payload)):
        if ev.get("error"):
            # Si le LLM tombe avant d'émettre la balise, on sauve la session
            # avec le partial règles (dégradation gracieuse).
            if not map_action_emitted:
                yield from _enrich_and_emit(partial)
                map_action_emitted = True
            yield {"event": "error", "message": ev["error"]}
            return

        if "map_action" in ev:
            # Le LLM a émis sa balise. None → JSON ou Pydantic KO → fallback partial.
            resolved = ev["map_action"] or partial
            yield from _enrich_and_emit(resolved)
            map_action_emitted = True
            continue

        token = ev.get("token", "")
        if token:
            yield {"event": "token", "text": token, "progress": ev.get("progress", 0)}

        if ev.get("done"):
            break

    # Stream terminé sans balise ? → fallback : on enrichit le partial
    if not map_action_emitted:
        yield from _enrich_and_emit(partial)
