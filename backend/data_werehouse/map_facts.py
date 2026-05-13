"""
Récupération de données carte depuis ClickHouse pour `map_action.data`.

Pendant `ch_facts.py` produit du TEXTE plat injecté dans le prompt LLM, ce
module produit un `DataPayload` Pydantic structuré que le front consomme
pour peindre la carte.

Branchement : appelé par `chat/pipeline/intent.py` après validation Pydantic
du `MapAction` produit par les règles + LLM.

Stratégie V1 (table `cropgpt.agri_stats` actuelle) :
    Filtres SQL : crop, year, regions
    Filtres ignorés (warning) : variety, season
    Métriques : yield, production, price, area (dérivée production/rendement)
    Niveau de data : country ou region (district/commune = V2)
"""

import logging
from typing import Any

from chat.pipeline.schemas import (
    AreaData,
    ComparisonAreaData,
    ComparisonData,
    DataLevel,
    DataPayload,
    MapAction,
    MapActionFilters,
    Metric,
)

from .ch_facts import CULTURE_NORMALIZE
from .olap_engine import engine

logger = logging.getLogger(__name__)


# ─── Mapping slugs URL-safe ↔ noms région DB ───────────────────────────────
# Slugs : kebab-case ASCII (utilisés dans `MapAction`, dans l'URL, dans le GeoJSON front)
# Noms DB : casse Title avec accents/apostrophes (utilisés dans `cropgpt.agri_stats`)

SLUG_TO_DB_REGION: dict[str, str] = {
    "diana": "Diana",
    "sava": "Sava",
    "analanjirofo": "Analanjirofo",
    "atsinanana": "Atsinanana",
    "vatovavy-fitovinany": "Vatovavy-Fitovinany",
    "atsimo-atsinanana": "Atsimo-Atsinanana",
    "anosy": "Anosy",
    "androy": "Androy",
    "atsimo-andrefana": "Atsimo-Andrefana",
    "menabe": "Menabe",
    "melaky": "Melaky",
    "boeny": "Boeny",
    "sofia": "Sofia",
    "betsiboka": "Betsiboka",
    "analamanga": "Analamanga",
    "itasy": "Itasy",
    "bongolava": "Bongolava",
    "vakinankaratra": "Vakinankaratra",
    "amoron-i-mania": "Amoron'i Mania",
    "haute-matsiatra": "Haute Matsiatra",
    "ihorombe": "Ihorombe",
    "alaotra-mangoro": "Alaotra-Mangoro",
}
DB_REGION_TO_SLUG: dict[str, str] = {v: k for k, v in SLUG_TO_DB_REGION.items()}


# ─── Mapping métrique map_action → SQL + unité ─────────────────────────────

METRIC_SQL: dict[Metric, tuple[str, str]] = {
    "yield":      ("avg(rendement_kg_ha)",                                          "kg/ha"),
    "production": ("sum(production_t)",                                              "tonnes"),
    "price":      ("avg(prix_ar_kg)",                                                "Ar/kg"),
    # area dérivée : production_t × 1000 / rendement_kg_ha = surface en hectares
    "area":       ("sum(production_t * 1000.0 / nullIf(rendement_kg_ha, 0))",       "ha"),
}

# Colonnes auxiliaires toujours retournées pour enrichir le tooltip front.
# Format : (cle_tooltip_exposee_au_front, alias_SQL_safe, expression_SQL).
# IMPORTANT : l'alias SQL ne DOIT PAS matcher un nom de colonne de la table,
# sinon ClickHouse interprete avg(col) AS col comme un avg(avg(...)) et
# leve "Aggregate function inside another aggregate function" (code 184).
TOOLTIP_AUX_COLS: list[tuple[str, str, str]] = [
    ("rendement_kg_ha", "tt_rendement",  "avg(rendement_kg_ha)"),
    ("production_t",    "tt_production", "sum(production_t)"),
    ("prix_ar_kg",      "tt_prix",       "avg(prix_ar_kg)"),
]


# ─── API publique ──────────────────────────────────────────────────────────


def fetch_map_data(map_action: MapAction) -> DataPayload | ComparisonData | None:
    """Calcule les données carte à partir d'un MapAction validé.

    Retourne :
        - `DataPayload`     pour les ops slice / dice / drill_down / clear
        - `ComparisonData`  pour op=compare
        - `None`            pour op=highlight (pas de data)
                            ou si la métrique manque

    Effet de bord : peut compléter `map_action.explain.subtitle` pour
    signaler à l'utilisateur les filtres ignorés (variety, season).
    """
    if map_action.op == "highlight":
        return None
    if map_action.metric is None:
        logger.warning("fetch_map_data appelé sans metric (op=%s)", map_action.op)
        return None

    if map_action.op == "compare":
        return _fetch_comparison(map_action)
    return _fetch_simple(map_action)


# ─── Implémentation : requête simple ───────────────────────────────────────


def _fetch_simple(map_action: MapAction) -> DataPayload:
    """Une seule requête SQL groupée par région."""
    metric: Metric = map_action.metric  # type: ignore[assignment]
    level: DataLevel = "region"  # V1 : toujours region (country agrégé serait 1 ligne)
    rows = _execute(map_action.filters, metric, group_by=["region"])
    areas = _rows_to_areas(rows, region_col_index=0, value_col_index=1)
    sql_formula, unit = METRIC_SQL[metric]
    _annotate_ignored_filters(map_action)
    return DataPayload(level=level, metric=metric, unit=unit, areas=areas)


def _fetch_comparison(map_action: MapAction) -> ComparisonData:
    """Deux requêtes parallèles selon l'axe de comparaison."""
    assert map_action.comparison is not None  # garanti par le validator
    assert map_action.metric is not None
    metric: Metric = map_action.metric

    left_filters = _filters_from_comparison_side(map_action.filters, map_action.comparison.left.filters)
    right_filters = _filters_from_comparison_side(map_action.filters, map_action.comparison.right.filters)

    left_rows = _execute(left_filters, metric, group_by=["region"])
    right_rows = _execute(right_filters, metric, group_by=["region"])

    _annotate_ignored_filters(map_action)
    _, unit = METRIC_SQL[metric]
    return ComparisonData(
        metric=metric,
        unit=unit,
        left=_rows_to_comparison_areas(left_rows),
        right=_rows_to_comparison_areas(right_rows),
    )


# ─── Construction et exécution de la requête SQL ──────────────────────────


def _execute(filters: MapActionFilters, metric: Metric, group_by: list[str]) -> list[list[Any]]:
    """Construit les params engine + exécute. Retourne les rows brutes."""
    sql_formula, _ = METRIC_SQL[metric]
    metrics_sql = [f"{sql_formula} as value"]
    metrics_sql.extend(f"{expr} as {alias}" for _, alias, expr in TOOLTIP_AUX_COLS)

    where = _build_where(filters)

    params = {
        "metrics": metrics_sql,
        "filters": where,
        "groupBy": group_by,
    }
    try:
        result = engine.execute_query(params)
    except Exception as exc:
        logger.warning("ClickHouse indisponible pour map_facts : %s", exc)
        return []
    return result.get("data", [])


def _build_where(filters: MapActionFilters) -> dict[str, Any]:
    """Traduit `MapActionFilters` en dict pour `engine.execute_query['filters']`.

    `variety` et `season` sont volontairement ignorés en V1 (la table
    `agri_stats` n'a pas ces colonnes). L'utilisateur est averti via
    `_annotate_ignored_filters`.
    """
    where: dict[str, Any] = {}

    if filters.crop:
        where["culture"] = _normalize_crop(filters.crop)

    if filters.year is not None:
        where["annee"] = filters.year

    if filters.regions:
        db_regions = [SLUG_TO_DB_REGION.get(s, s) for s in filters.regions]
        where["region"] = db_regions if len(db_regions) > 1 else db_regions[0]

    return where


def _normalize_crop(crop: str) -> str:
    """Aligne la casse/accent culture sur ce qui est dans la DB."""
    return CULTURE_NORMALIZE.get(crop.lower().strip(), crop)


# ─── Mapping rows → AreaData ──────────────────────────────────────────────


def _rows_to_areas(rows: list[list[Any]], region_col_index: int, value_col_index: int) -> list[AreaData]:
    """Transforme les rows ClickHouse en list[AreaData] avec rang calculé.

    Format des rows attendu : [region, value, rendement_kg_ha, production_t, prix_ar_kg]
    Les colonnes auxiliaires alimentent le `tooltip` pour le hover front.
    """
    areas: list[AreaData] = []
    for row in rows:
        db_region = row[region_col_index]
        slug = DB_REGION_TO_SLUG.get(db_region, _slugify_unknown(db_region))
        value = _safe_float(row[value_col_index])
        tooltip: dict[str, Any] = {}
        # Aux cols : indices 2, 3, 4 si présents (rendement, production, prix)
        for i, (key, _alias, _expr) in enumerate(TOOLTIP_AUX_COLS, start=value_col_index + 1):
            if i < len(row):
                tooltip[key] = _safe_float(row[i])
        areas.append(AreaData(slug=slug, name=db_region, value=value, tooltip=tooltip))

    # Tri décroissant + rang (None pour les valeurs manquantes)
    valued = [a for a in areas if a.value is not None]
    valued.sort(key=lambda a: a.value or 0, reverse=True)
    for rank, area in enumerate(valued, start=1):
        area.rank = rank
    # On garde l'ordre par valeur décroissante puis null à la fin
    nulls = [a for a in areas if a.value is None]
    return valued + nulls


def _rows_to_comparison_areas(rows: list[list[Any]]) -> list[ComparisonAreaData]:
    """Version allégée pour les payloads de comparaison (pas de tooltip ni de name)."""
    out: list[ComparisonAreaData] = []
    for row in rows:
        slug = DB_REGION_TO_SLUG.get(row[0], _slugify_unknown(row[0]))
        out.append(ComparisonAreaData(slug=slug, value=_safe_float(row[1])))

    valued = [a for a in out if a.value is not None]
    valued.sort(key=lambda a: a.value or 0, reverse=True)
    for rank, area in enumerate(valued, start=1):
        area.rank = rank
    nulls = [a for a in out if a.value is None]
    return valued + nulls


# ─── Helpers ───────────────────────────────────────────────────────────────


def _safe_float(v: Any) -> float | None:
    """Convertit en float, retourne None pour les valeurs manquantes ou non-numériques."""
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if f != f or f == float("inf") or f == float("-inf"):  # NaN/Inf
        return None
    return f


def _slugify_unknown(db_value: str) -> str:
    """Fallback : si une région DB n'est pas dans le mapping, on slugifie naïvement."""
    return (
        db_value.lower()
        .replace("'", "-")
        .replace(" ", "-")
        .strip("-")
    )


def _filters_from_comparison_side(
    base: MapActionFilters, side_overrides: dict[str, Any]
) -> MapActionFilters:
    """Fusionne les filtres communs du map_action racine avec les overrides du côté."""
    merged = base.model_dump()
    merged.update({k: v for k, v in side_overrides.items() if v is not None})
    return MapActionFilters.model_validate(merged)


def _annotate_ignored_filters(map_action: MapAction) -> None:
    """Ajoute un warning dans `explain.subtitle` si variety ou season sont utilisés.

    V1 : ces filtres sont acceptés à la validation mais ignorés par le SQL
    (la table n'a pas les colonnes). On le signale poliment à l'utilisateur.
    """
    notes: list[str] = []
    if map_action.filters.variety:
        notes.append(f"variété « {map_action.filters.variety} » non encore filtrable (résultats sur l'ensemble {map_action.filters.crop or 'cultures'})")
    if map_action.filters.season:
        notes.append(f"saison « {map_action.filters.season} » non encore filtrable")

    if not notes:
        return

    warning = " — ".join(notes)
    if map_action.explain is None:
        # On ne crée pas un Explain ex-nihilo : c'est au LLM de fournir le titre.
        # Le warning sera perdu mais c'est exceptionnel (LLM doit toujours produire explain).
        logger.info("Filtres ignorés sans explain pour rattacher le warning : %s", warning)
        return

    if map_action.explain.subtitle:
        map_action.explain.subtitle = f"{map_action.explain.subtitle} — Note : {warning}"
    else:
        map_action.explain.subtitle = f"Note : {warning}"
