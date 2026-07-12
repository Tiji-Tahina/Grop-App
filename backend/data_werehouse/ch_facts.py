"""
Factual data retrieval from ClickHouse to enrich the LLM prompt.

Wired in chat/views.py between the RAG step and the LLM call.
When the ontology detects that a question concerns yield, price,
or agricultural production, this module fetches real numbers from
the data warehouse instead of letting the LLM hallucinate or fall back
on hardcoded `_fallback_static` values.

Security: CH credentials stay server-side (Render). The returned
result is plain text, ready to be injected into the prompt sent to Colab.
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

# context_tag → relevant SQL metrics mapping
TAG_TO_METRICS = {
    'yield_prediction': ['avg(rendement_kg_ha) as rendement_moyen',
                         'max(rendement_kg_ha) as rendement_max'],
    'market':           ['avg(prix_ar_kg) as prix_moyen',
                         'min(prix_ar_kg) as prix_min',
                         'max(prix_ar_kg) as prix_max'],
}
# Tags that justify a CH lookup (others = no relevant figures)
CH_RELEVANT_TAGS = set(TAG_TO_METRICS.keys())

# Safety limits (CH free tier, and to avoid blowing up the prompt)
MAX_ROWS = 8
DEFAULT_YEARS = 3  # Last 3 years to stay relevant


def _detect_entities(matched_keywords: Iterable[str]) -> tuple[list, list]:
    """Separate keywords into known (crops, regions) from the data warehouse."""
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
    Query ClickHouse based on detected tags and entities.
    Returns a text block ready to inject into the LLM prompt,
    or an empty string if no relevant facts are found.

    Defensive behavior:
    - CH not configured or unreachable → returns '' (RAG takes over)
    - No relevant tags (yield_prediction / market) → returns ''
    - No recognized entities → aggregated all-country query
    """
    relevant_tags = [t for t in (context_tags or []) if t in CH_RELEVANT_TAGS]
    if not relevant_tags:
        return ''

    cultures, regions = _detect_entities(matched_keywords)

    metrics = []
    for tag in relevant_tags:
        metrics.extend(TAG_TO_METRICS[tag])
    metrics = list(dict.fromkeys(metrics))  # dedup while preserving order

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
        logger.warning("ClickHouse unavailable for ch_facts: %s", e)
        return ''

    rows = result.get('data', [])[:MAX_ROWS]
    if not rows:
        return ''

    cols = result.get('columns', [])
    return _format_facts(cols, rows, cultures, regions)


def _format_facts(cols: list, rows: list, cultures: list, regions: list) -> str:
    """Format CH figures into a text block readable by the LLM."""
    header_parts = []
    if cultures:
        header_parts.append(f"crop(s): {', '.join(cultures)}")
    if regions:
        header_parts.append(f"region(s): {', '.join(regions)}")
    header = ' — '.join(header_parts) if header_parts else 'all crops, all regions'

    lines = [f"OFFICIAL DATA (Madagascar Data Warehouse — {header}):"]
    for row in rows:
        cells = []
        for col, val in zip(cols, row):
            if isinstance(val, float):
                cells.append(f"{col}={val:.1f}")
            else:
                cells.append(f"{col}={val}")
        lines.append('  • ' + ' | '.join(cells))
    return '\n'.join(lines)
