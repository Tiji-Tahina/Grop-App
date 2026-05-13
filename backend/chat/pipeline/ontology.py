"""
Étape 2 du pipeline : validation ontologique et enrichissement du contexte.

- Vérifie que la question est dans le domaine agricole (guardrail)
  → keywords issus du graphe rdflib (185 FR / 90 MG / 186 EN) au lieu d'un dict hardcodé
- Détecte les context_tags via les classes OWL des entités trouvées
- Enrichit le prompt avec les faits ontologiques (pedigree, catégorie, concepts liés)

Input  : dict normalisé { text, language, … }
Output : dict { is_valid, domain, context_tags, enriched_text, rejection_reason,
                matched_keywords, ontology_facts }
"""

import logging
logger = logging.getLogger(__name__)

# Tags de fallback si l'ontologie n'est pas disponible
_FALLBACK_KEYWORDS = {
    'fr': ['riz', 'rizière', 'culture', 'récolte', 'sol', 'semis', 'engrais', 'irrigation',
           'rendement', 'agriculture', 'plante', 'maladie', 'ravageur', 'variété', 'paddy',
           'fofifa', 'manioc', 'maïs', 'vanille', 'girofle', 'compost', 'eau', 'saison'],
    'mg': ['vary', 'tanimbary', 'fambolena', 'jinja', 'tany', 'orana', 'aretina', 'zezika'],
    'en': ['rice', 'paddy', 'crop', 'harvest', 'soil', 'seed', 'fertilizer', 'irrigation',
           'yield', 'agriculture', 'plant', 'disease', 'pest', 'variety', 'farming'],
}

# Mappage keyword → tag (fallback si ontologie indisponible)
_TOPIC_KEYWORDS = {
    'water_management': ['irrigation', 'rano', 'digue', 'eau', 'inondation', 'sécheresse', 'water'],
    'soil_health':      ['sol', 'tany', 'engrais', 'zezika', 'compost', 'ph', 'azote', 'soil', 'fertilizer'],
    'pest_disease':     ['maladie', 'ravageur', 'insecte', 'aretina', 'disease', 'pest', 'fungus'],
    'varieties':        ['variété', 'fofifa', 'semence', 'hybride', 'variety', 'cultivar', 'karazana'],
    'yield_prediction': ['rendement', 'production', 'famokarana', 'kg', 'tonne', 'yield'],
    'climate':          ['pluie', 'orana', 'température', 'saison', 'cyclone', 'climate', 'rain'],
    'market':           ['prix', 'vente', 'marché', 'exportation', 'price', 'market'],
}


def _get_ontology_keywords() -> dict:
    """Retourne les keywords du graphe rdflib, avec fallback sur le dict local."""
    try:
        from rag.ontology_graph import get_domain_keywords
        kw = get_domain_keywords()
        # Vérification minimale
        if kw and len(kw.get('fr', [])) > 20:
            return kw
    except Exception as e:
        logger.warning("ontology_graph indisponible, fallback keywords : %s", e)
    return _FALLBACK_KEYWORDS


def _detect_tags_from_ontology(text_lower: str, matched_keywords: list) -> list:
    """
    Détecte les context_tags en deux passes :
    1. Via les classes OWL des entités trouvées (get_class_tag)
    2. Via le matching de mots-clés de _TOPIC_KEYWORDS (fallback)
    """
    tags = set()

    # Passe 1 : tag via classe OWL
    try:
        from rag.ontology_graph import get_class_tag
        for kw in matched_keywords:
            tag = get_class_tag(kw)
            if tag:
                tags.add(tag)
    except Exception:
        pass

    # Passe 2 : topic keywords (toujours actif, complémentaire)
    for tag, kws in _TOPIC_KEYWORDS.items():
        if any(_word_match(kw, text_lower) for kw in kws):
            tags.add(tag)

    return list(tags)


def _get_ontology_facts(text_lower: str, matched_keywords: list, original_text: str = '') -> str:
    """
    Récupère les faits ontologiques pour les entités nommées trouvées dans le texte.
    Cherche en deux passes :
    1. Mots capitalisés dans le texte original (Bemasoha, Fiaramanitra, FOFIFA…)
    2. Keywords matchés qui ont un pedigree dans le graphe
    """
    try:
        from rag.ontology_graph import get_facts_block, get_pedigree
        blocks = []
        seen = set()

        # Passe 1 : mots capitalisés / noms propres dans le texte original
        candidates = []
        if original_text:
            import re
            # Mots commençant par une majuscule ou tout en majuscules (≥ 4 chars)
            proper_nouns = re.findall(r'\b([A-ZÀÁÂÉÈÊÎÏÔÙÛ][a-zàáâéèêîïôùû]+(?:\s[A-ZÀÁÂÉÈÊÎÏÔÙÛ][a-zàáâéèêîïôùû]+)*)\b', original_text)
            # Aussi les termes tout-caps comme FOFIFA, NERICA
            all_caps = re.findall(r'\b([A-Z]{3,}(?:\s\d+)?)\b', original_text)
            candidates = list(dict.fromkeys(proper_nouns + all_caps))  # déduplique, garde l'ordre

        # Passe 2 : keywords matchés
        candidates += matched_keywords

        for kw in candidates:
            kw_clean = kw.strip()
            if not kw_clean or kw_clean.lower() in seen:
                continue
            seen.add(kw_clean.lower())

            pedigree = get_pedigree(kw_clean)
            if pedigree["found"]:
                block = get_facts_block(kw_clean)
                if block:
                    blocks.append(block)

        return "\n\n".join(blocks)
    except Exception as e:
        logger.debug("Erreur get_ontology_facts : %s", e)
        return ""


def _word_match(keyword: str, text_lower: str) -> bool:
    """
    Verifie que `keyword` apparait comme mot entier dans `text_lower`.
    Evite les faux positifs : 'fruits' ne doit pas matcher 'fruits de mer'.
    Pour les mots courts (≤ 3 chars) on accepte le matching simple.
    """
    import re
    if len(keyword) <= 3:
        return keyword in text_lower
    # Matching mot entier (frontières de mots Unicode)
    pattern = r'(?<![a-zàáâéèêîïôùûüç])' + re.escape(keyword) + r'(?![a-zàáâéèêîïôùûüç])'
    return bool(re.search(pattern, text_lower, re.IGNORECASE))


def validate_and_enrich(normalized: dict) -> dict:
    text_lower = normalized['text'].lower()
    lang = normalized.get('language', 'fr')

    # ── 1. Chargement des keywords depuis l'ontologie ──────────────────────────
    all_keywords = _get_ontology_keywords()
    lang_keywords = all_keywords.get(lang, all_keywords.get('fr', []))

    # Matching par mot entier dans la langue détectée
    matched = [kw for kw in lang_keywords if _word_match(kw, text_lower)]

    # Fallback multilingue si aucun match
    if not matched:
        for kws in all_keywords.values():
            matched += [kw for kw in kws if _word_match(kw, text_lower)]

    is_valid = len(matched) > 0

    # ── Fallback géospatial : « où est Itasy ? », « zoome sur Alaotra-Mangoro »,
    # « vue nationale » contiennent peu/pas de keywords agricoles mais sont des
    # commandes carte légitimes. On considère valide si on détecte un nom de
    # région connu OU un déclencheur d'opération (compare/highlight/drill_down…).
    if not is_valid:
        try:
            from .intent import _detect_op_from_triggers, _detect_regions, _norm
            text_norm = _norm(normalized['text'])
            if _detect_op_from_triggers(text_norm) or _detect_regions(text_norm):
                is_valid = True
                matched = ['__geospatial__']  # marqueur pour traçabilité
        except Exception as e:
            logger.warning("fallback géospatial KO : %s", e)

    if not is_valid:
        return {
            'is_valid': False,
            'rejection_reason': (
                "Cette question semble hors du domaine agricole. "
                "Je suis CropGPT, spécialisé en agriculture malgache "
                "(riziculture, cultures, sol, maladies, rendements, etc.)."
            ),
            'domain': None,
            'context_tags': [],
            'enriched_text': normalized['text'],
            'matched_keywords': [],
            'ontology_facts': '',
        }

    # ── 2. Détection des context_tags ─────────────────────────────────────────
    context_tags = _detect_tags_from_ontology(text_lower, matched)
    if not context_tags:
        context_tags = ['varieties']  # tag par défaut si question agricole générale

    # ── 3. Faits ontologiques (pedigree / entités nommées) ─────────────────────
    ontology_facts = _get_ontology_facts(text_lower, matched, normalized['text'])

    # ── 4. Enrichissement du texte ────────────────────────────────────────────
    enrichment_parts = []

    if ontology_facts:
        enrichment_parts.append(ontology_facts)

    if 'yield_prediction' in context_tags:
        enrichment_parts.append(
            "Contexte rendement Madagascar : 2.5–4 t/ha en pluvial, "
            "jusqu'à 6–8 t/ha en irrigué avec SRI."
        )
    if 'varieties' in context_tags and not ontology_facts:
        enrichment_parts.append(
            "Contexte variétés : focus FOFIFA 154, 161, 3069, Makalioka, NERICA 4."
        )

    enriched_text = normalized['text']
    if enrichment_parts:
        enriched_text += '\n[Contexte ontologique]\n' + '\n'.join(enrichment_parts)

    logger.debug(
        "Ontologie → tags=%s matched=%d facts=%s",
        context_tags, len(matched), bool(ontology_facts)
    )

    return {
        'is_valid': True,
        'domain': 'agriculture',
        'context_tags': context_tags,
        'enriched_text': enriched_text,
        'matched_keywords': matched[:10],
        'ontology_facts': ontology_facts,
        'rejection_reason': None,
    }
