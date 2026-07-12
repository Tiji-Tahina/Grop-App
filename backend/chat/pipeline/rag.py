"""
Step 3 of the pipeline: document retrieval (RAG).

Handles 3 cases:
  - High score  (> 0.70): reliable data found
  - Medium score (0.40-0.70): partial data
  - Low score  (< 0.40): nothing relevant → fallback + disclaimer

Input  : enriched dict from ontology { enriched_text, context_tags, ... }
Output : dict { retrieved_docs, rag_context, confidence_level, has_data }
"""
import logging
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

# Confidence thresholds based on FAISS L2 distance
# Low L2 distance = close vectors = similar content
SCORE_HIGH   = 0.70   # Highly relevant data
SCORE_MEDIUM = 0.40   # Partially relevant data
# Below SCORE_MEDIUM → unreliable data


def _load_vector_store():
    """Loads the FAISS vector store if it exists, otherwise returns None."""
    try:
        import faiss
        import pickle

        store_path = Path(settings.RAG_VECTOR_STORE_PATH)
        if not store_path.exists():
            logger.warning("Vector store not found: %s", store_path)
            return None, None

        index = faiss.read_index(str(store_path / 'index.faiss'))
        with open(store_path / 'metadata.pkl', 'rb') as f:
            metadata = pickle.load(f)
        return index, metadata
    except ImportError:
        logger.warning("FAISS not installed — RAG disabled.")
        return None, None


def _distance_to_score(distance: float) -> float:
    """Converts an FAISS L2 distance to a similarity score [0-1]."""
    return float(1 / (1 + distance))


def retrieve(ontology_result: dict, top_k: int = None) -> dict:
    """
    Retrieves relevant documents and evaluates their confidence.

    Returns:
        dict with:
          retrieved_docs    : list of found documents
          rag_context       : text to inject into the LLM prompt
          confidence_level  : 'high' | 'medium' | 'low' | 'none'
          has_data          : bool — whether usable data was found
          disclaimer        : message to display to user if necessary
    """
    if top_k is None:
        top_k = settings.RAG_TOP_K

    # Question out of domain → already blocked by ontology
    if not ontology_result.get('is_valid'):
        return _empty_result()

    index, metadata = _load_vector_store()

    # Vector store unavailable (dev without index)
    if index is None:
        return _fallback_static(ontology_result.get('context_tags', []),
                                ontology_result.get('ontology_facts', ''))

    try:
        import numpy as np

        from rag.embeddings import embed_query

        # ── Query expansion via ontology ──────────────────────────────
        base_query = ontology_result['enriched_text']
        expanded_query = _expand_query(base_query, ontology_result.get('matched_keywords', []))

        # fastembed returns an np.ndarray per text; we batch it into [1, dim]
        query_vec = np.array([embed_query(expanded_query)], dtype='float32')

        # Retrieve more candidates to filter afterwards
        n_candidates = min(top_k * 3, index.ntotal)
        distances, indices = index.search(query_vec, n_candidates)

        docs = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0 or idx >= len(metadata):
                continue
            score = _distance_to_score(dist)
            doc = metadata[idx].copy()
            doc['score'] = score
            docs.append(doc)

        # Sort by descending score
        docs.sort(key=lambda d: d['score'], reverse=True)

        # Keep only top_k
        docs = docs[:top_k]

        return _build_result(docs, ontology_result.get('context_tags', []),
                             ontology_result.get('ontology_facts', ''))

    except Exception as e:
        logger.error("RAG retrieval error: %s", e)
        return _fallback_static(ontology_result.get('context_tags', []),
                                ontology_result.get('ontology_facts', ''))


def _expand_query(base_query: str, matched_keywords: list) -> str:
    """
    Enriches the FAISS query with related concepts found in the ontology.
    E.g., "Makalioka" → adds "Rice, Crop Variety, Hybrid, FOFIFA"
    Improves semantic recall without changing the original question.
    """
    if not matched_keywords:
        return base_query
    try:
        from rag.ontology_graph import get_related_concepts
        extra_terms = []
        seen = set()
        for kw in matched_keywords[:5]:  # limit for performance
            related = get_related_concepts(kw)
            for term in related[:3]:
                if term not in seen and term.lower() not in base_query.lower():
                    extra_terms.append(term)
                    seen.add(term)
        if extra_terms:
            expanded = base_query + ' ' + ' '.join(extra_terms)
            logger.debug("FAISS query expanded: +%d terms", len(extra_terms))
            return expanded
    except Exception as e:
        logger.debug("Ontology expansion failed: %s", e)
    return base_query


def _build_result(docs: list, context_tags: list, ontology_facts: str = '') -> dict:
    """
    Evaluates the quality of results and builds the appropriate response.
    This is where the "nothing found" or "insufficient data" cases are handled.
    """
    if not docs:
        return _no_data_result(context_tags, ontology_facts)

    best_score = docs[0]['score']

    # ── CASE 1: High-quality data ──────────────────────────────
    if best_score >= SCORE_HIGH:
        good_docs = [d for d in docs if d['score'] >= SCORE_MEDIUM]
        rag_context = _format_context(good_docs, ontology_facts)
        return {
            'retrieved_docs': good_docs,
            'rag_context': rag_context,
            'confidence_level': 'high',
            'has_data': True,
            'disclaimer': None,
        }

    # ── CASE 2: Partially relevant data ──────────────────────
    if best_score >= SCORE_MEDIUM:
        rag_context = _format_context(docs, ontology_facts)
        return {
            'retrieved_docs': docs,
            'rag_context': rag_context,
            'confidence_level': 'medium',
            'has_data': True,
            'disclaimer': (
                "⚠️ The information available in my database is "
                "partially related to your question. I'm answering to the best of my ability "
                "but I recommend verifying with a local MAEP technician."
            ),
        }

    # ── CASE 3: Low score — nothing relevant ──────────────────────
    return _no_data_result(context_tags, ontology_facts)


def _no_data_result(context_tags: list, ontology_facts: str = '') -> dict:
    """
    Handles the case where RAG finds nothing useful.
    Attempts fallback to the static knowledge base.
    """
    logger.info("RAG score too low — falling back to static knowledge base")
    fallback = _fallback_static(context_tags, ontology_facts)

    if fallback['has_data']:
        # If ontological facts are present → specific data found,
        # no misleading disclaimer
        if ontology_facts:
            fallback['confidence_level'] = 'high'
            fallback['disclaimer'] = None
        else:
            fallback['confidence_level'] = 'low'
            fallback['disclaimer'] = (
                "ℹ️ I didn't find specific data for your question in my database. "
                "I'll answer with general information about Malagasy rice cultivation. "
                "For advice specific to your situation, consult MAEP or a FOFIFA technician."
            )
        return fallback

    # Truly nothing — return an empty result with instructions to the LLM
    return {
        'retrieved_docs': [],
        'rag_context': '',
        'confidence_level': 'none',
        'has_data': False,
        'disclaimer': (
            "⚠️ I don't have specific data on this topic in my knowledge base. "
            "I'll answer with my general knowledge, but this response "
            "should be verified with local experts (MAEP, FOFIFA, agricultural technicians)."
        ),
    }


def _empty_result() -> dict:
    return {
        'retrieved_docs': [],
        'rag_context': '',
        'confidence_level': 'none',
        'has_data': False,
        'disclaimer': None,
    }


def _format_context(docs: list, ontology_facts: str = '') -> str:
    """Formats retrieved documents + ontological facts for the LLM."""
    parts = []

    # Ontological facts first (pedigree, category) if available
    if ontology_facts:
        parts.append(ontology_facts)

    for doc in docs:
        source_label = doc.get('title', 'Unknown source')
        score_pct = int(doc.get('score', 0) * 100)
        parts.append(
            f"[Source: {source_label} — relevance {score_pct}%]\n"
            f"{doc.get('content', '')}"
        )
    return '\n\n---\n\n'.join(parts)


def _fallback_static(context_tags: list, ontology_facts: str = '') -> dict:
    """
    Static fallback context based on ontological tags.
    Used when FAISS is not available or the score is too low.
    These data come from the knowledge base embedded in the code
    (last line of defense before "I don't know").
    """
    fallbacks = {
        'yield_prediction': (
            "Rendements moyens du riz à Madagascar (données MAEP/FAO 2022) : "
            "2,5 t/ha en moyenne nationale. Culture irriguée : 3,0-4,5 t/ha selon la région. "
            "Culture pluviale : 1,5-2,5 t/ha. Avec méthode SRI : jusqu'à 6-8 t/ha possible. "
            "Meilleures régions : Alaotra-Mangoro (4,0-5,0 t/ha), Boeny (3,0-4,0 t/ha)."
        ),
        'varieties': (
            "Variétés recommandées par le FOFIFA : FOFIFA 154 (hautes terres, résistante pyriculariose), "
            "FOFIFA 161 (haut rendement, bas-fonds), FOFIFA 3069 (côtes, cycle court 105j), "
            "Makalioka (traditionnelle, qualité gustative), NERICA 4 (pluviale, tanety)."
        ),
        'soil_health': (
            "Sols de Madagascar : majoritairement latéritiques (ferralitiques) avec pH 4,5-6,0. "
            "Bas-fonds : sols alluviaux plus fertiles, idéaux pour le riz irrigué. "
            "Apport recommandé : compost 5-10 t/ha + NPK 11-22-16 à 200 kg/ha. "
            "Carence en zinc fréquente sur hautes terres : apporter ZnSO4 à 20 kg/ha."
        ),
        'water_management': (
            "Riziculture irriguée : 40% des superficies malgaches. "
            "Méthode SRI : irrigation alternée (mouillage-séchage), économie d'eau de 30-50%. "
            "Plaines irrigables principales : Alaotra, Marovoay (Boeny), Dabara (Menabe). "
            "Besoin en eau : 900-1200mm/cycle pour riz irrigué."
        ),
        'pest_disease': (
            "Principale maladie : pyriculariose (blast), favorisée par temps frais et humide. "
            "Traitement : fongicides triazoles. Prévention : variétés résistantes FOFIFA 154/161. "
            "Ravageurs : foreur des tiges (Scirpophaga), rats des rizières (Alaotra). "
            "Surveillance critique : épiaison = période la plus vulnérable."
        ),
        'climate': (
            "Saison des pluies (Novembre-Avril) : période principale de riziculture pluviale. "
            "Saison sèche (Mai-Octobre) : riziculture irriguée possible dans l'ouest et le nord. "
            "Risques climatiques : cyclones (côte est, Jan-Mars), sécheresse (sud et ouest). "
            "Température optimale pour le riz : 25-30°C le jour, >15°C la nuit."
        ),
        'market': (
            "Prix du riz paddy à Madagascar (2023) : 500-800 Ar/kg selon la région et la saison. "
            "Prix pic : soudure (Oct-Nov). Prix bas : post-récolte (Avril-Mai). "
            "Marchés principaux : Analakely (Tana), Toamasina, Mahajanga. "
            "Filière exportation : quasi inexistante, Madagascar importe du riz en soudure."
        ),
    }

    context_parts = []

    # Ontological facts first if available
    if ontology_facts:
        context_parts.append(ontology_facts)

    context_parts += [fallbacks[tag] for tag in context_tags if tag in fallbacks]

    if not context_parts:
        context_parts = [
            "Madagascar est le pays africain avec la plus grande consommation de riz par habitant "
            "(~130 kg/an). La riziculture emploie plus de 70% de la population rurale. "
            "Superficie rizicole totale : ~1,3 million d'hectares. "
            "Production annuelle : ~3,5 millions de tonnes de paddy."
        ]
        return {
            'retrieved_docs': [],
            'rag_context': '\n\n'.join(context_parts),
            'confidence_level': 'low',
            'has_data': True,
            'disclaimer': None,
            'source': 'static_general',
        }

    return {
        'retrieved_docs': [],
        'rag_context': '\n\n'.join(context_parts),
        'confidence_level': 'medium' if not ontology_facts else 'high',
        'has_data': True,
        'disclaimer': None,
        'source': 'ontology_fallback' if ontology_facts else 'static_fallback',
    }
