"""
Récupération de faits factuels depuis ClickHouse pour enrichir le prompt LLM.

Branché par chat/views.py entre l'étape RAG et l'appel au LLM.
Quand l'ontologie a détecté qu'une question concerne un rendement, un prix
ou une production agricole, ce module va chercher les chiffres réels dans
le data warehouse au lieu de laisser le LLM halluciner ou se rabattre sur
les `_fallback_static` hardcodés.

Sécurité : credentials CH restent côté serveur (Render). Le résultat
retourné est du texte plat, prêt à être injecté dans le prompt envoyé à Colab.
"""

import logging
from typing import Iterable

from .olap_engine import engine

logger = logging.getLogger(__name__)

REGIONS = {
    'diana', 'sava', 'analanjirofo', 'atsinanana', 'vatovavy-fitovinany',
    'atsimo-atsinanana', 'anosy', 'androy', 'atsimo-andrefana', 'menabe',
    'melaky', 'boeny', 'sofia', 'betsiboka', 'analamanga',
    'itasy', 'bongolava', 'vakinankaratra', "amoron'i mania", 'haute matsiatra',
    'ihorombe', 'alaotra-mangoro',
}

CULTURES = {
    'riz', 'manioc', 'maïs', 'mais', 'vanille', 'girofle', 'café', 'cafe',
    'haricot', 'patate douce', 'arachide',
}

CULTURE_NORMALIZE = {
    'mais': 'Maïs', 'maïs': 'Maïs',
    'cafe': 'Café', 'café': 'Café',
    'riz': 'Riz', 'manioc': 'Manioc', 'vanille': 'Vanille',
    'girofle': 'Girofle', 'haricot': 'Haricot',
    'patate douce': 'Patate douce', 'arachide': 'Arachide',
}

REGION_NORMALIZE = {r: r.title().replace('-Mangoro', '-Mangoro') for r in REGIONS}
REGION_NORMALIZE.update({
    'alaotra-mangoro': 'Alaotra-Mangoro',
    'haute matsiatra': 'Haute Matsiatra',
    "amoron'i mania": "Amoron'i Mania",
    'atsimo-andrefana': 'Atsimo-Andrefana',
    'atsimo-atsinanana': 'Atsimo-Atsinanana',
    'vatovavy-fitovinany': 'Vatovavy-Fitovinany',
})

# Mapping context_tag → métriques SQL pertinentes
TAG_TO_METRICS = {
    'yield_prediction': ['avg(rendement_kg_ha) as rendement_moyen',
                         'max(rendement_kg_ha) as rendement_max'],
    'market':           ['avg(prix_ar_kg) as prix_moyen',
                         'min(prix_ar_kg) as prix_min',
                         'max(prix_ar_kg) as prix_max'],
}
# Tags qui justifient un lookup CH (les autres = pas de chiffres pertinents)
CH_RELEVANT_TAGS = set(TAG_TO_METRICS.keys())

# Limites de sécurité (CH free tier, et pour ne pas exploser le prompt)
MAX_ROWS = 8
DEFAULT_YEARS = 3  # 3 dernières années pour rester pertinent


def _detect_entities(matched_keywords: Iterable[str]) -> tuple[list, list]:
    """Sépare les keywords en (cultures, régions) connues du data warehouse."""
    cultures, regions = [], []
    for kw in matched_keywords or []:
        kl = kw.lower().strip()
        if kl in CULTURES:
            cultures.append(CULTURE_NORMALIZE.get(kl, kw))
        elif kl in REGIONS:
            regions.append(REGION_NORMALIZE.get(kl, kw))
    return cultures, regions


def fetch_facts(context_tags: list, matched_keywords: list) -> str:
    """
    Interroge ClickHouse selon les tags et entités détectés.
    Retourne un bloc de texte prêt à injecter dans le prompt LLM,
    ou une chaîne vide si aucun fait pertinent n'est trouvé.

    Comportement défensif :
    - Si CH non configuré ou injoignable → retourne '' (le RAG prend le relais)
    - Aucun tag pertinent (yield_prediction / market) → retourne ''
    - Aucune entité reconnue → query agrégée tous-pays
    """
    relevant_tags = [t for t in (context_tags or []) if t in CH_RELEVANT_TAGS]
    if not relevant_tags:
        return ''

    cultures, regions = _detect_entities(matched_keywords)

    metrics = []
    for tag in relevant_tags:
        metrics.extend(TAG_TO_METRICS[tag])
    metrics = list(dict.fromkeys(metrics))  # dédup en gardant l'ordre

    filters = {}
    if cultures:
        filters['culture'] = cultures if len(cultures) > 1 else cultures[0]
    if regions:
        filters['region'] = regions if len(regions) > 1 else regions[0]

    group_by = []
    if regions:
        group_by.append('region')
    if cultures:
        group_by.append('culture')
    group_by.append('annee')
    if not regions and not cultures:
        group_by = ['culture', 'annee']

    try:
        result = engine.execute_query({
            'metrics': metrics,
            'filters': filters,
            'groupBy': group_by,
        })
    except Exception as e:
        logger.warning("ClickHouse indisponible pour ch_facts : %s", e)
        return ''

    rows = result.get('data', [])[:MAX_ROWS]
    if not rows:
        return ''

    cols = result.get('columns', [])
    return _format_facts(cols, rows, cultures, regions)


def _format_facts(cols: list, rows: list, cultures: list, regions: list) -> str:
    """Formate les chiffres CH en bloc texte lisible par le LLM."""
    header_parts = []
    if cultures:
        header_parts.append(f"culture(s) : {', '.join(cultures)}")
    if regions:
        header_parts.append(f"région(s) : {', '.join(regions)}")
    header = ' — '.join(header_parts) if header_parts else 'toutes cultures, toutes régions'

    lines = [f"DONNÉES OFFICIELLES (Data Warehouse Madagascar — {header}) :"]
    for row in rows:
        cells = []
        for col, val in zip(cols, row):
            if isinstance(val, float):
                cells.append(f"{col}={val:.1f}")
            else:
                cells.append(f"{col}={val}")
        lines.append('  • ' + ' | '.join(cells))
    return '\n'.join(lines)
