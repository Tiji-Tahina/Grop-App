"""
Map data retrieval from ClickHouse for `map_action.data`.

While `ch_facts.py` produces plain text injected into the LLM prompt, this
module produces a structured `DataPayload` Pydantic object consumed by the
frontend to render the map.

Wiring: called by `chat/pipeline/intent.py` after Pydantic validation
of the `MapAction` produced by the rules + LLM.

V1 strategy (current `cropgpt.agri_stats` table):
    SQL filters: crop, year, regions
    Ignored filters (warning): variety, season
    Metrics: yield, production, price, area (derived from production/yield)
    Data level: country or region (district/commune = V2)
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


# ─── URL-safe slug ↔ DB region name mapping ───────────────────────────────
# Slugs: kebab-case ASCII (used in `MapAction`, in URLs, in the frontend GeoJSON)
# DB names: Title case with accents/apostrophes (used in `cropgpt.agri_stats`)

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


# ─── map_action metric → SQL + unit mapping ─────────────────────────────

METRIC_SQL: dict[Metric, tuple[str, str]] = {
    "yield":      ("avg(rendement_kg_ha)",                                          "kg/ha"),
    "production": ("sum(production_t)",                                              "tonnes"),
    "price":      ("avg(prix_ar_kg)",                                                "Ar/kg"),
    # area derived: production_t × 1000 / rendement_kg_ha = area in hectares
    "area":       ("sum(production_t * 1000.0 / nullIf(rendement_kg_ha, 0))",       "ha"),
}

# Auxiliary columns always returned to enrich the frontend tooltip.
# Format: (tooltip_key_exposed_to_frontend, safe_SQL_alias, SQL_expression).
# IMPORTANT: the SQL alias MUST NOT match a table column name,
# otherwise ClickHouse interprets avg(col) AS col as avg(avg(...)) and
# raises "Aggregate function inside another aggregate function" (code 184).
TOOLTIP_AUX_COLS: list[tuple[str, str, str]] = [
    ("rendement_kg_ha", "tt_rendement",  "avg(rendement_kg_ha)"),
    ("production_t",    "tt_production", "sum(production_t)"),
    ("prix_ar_kg",      "tt_prix",       "avg(prix_ar_kg)"),
]


# ─── Public API ──────────────────────────────────────────────────────────


def fetch_map_data(map_action: MapAction) -> DataPayload | ComparisonData | None:
    """Compute map data from a validated MapAction.

    Returns:
        - `DataPayload`     for ops slice / dice / drill_down / clear
        - `ComparisonData`  for op=compare
        - `None`            for op=highlight (no data)
                            or if the metric is missing

    Side effect: may populate `map_action.explain.subtitle` to
    inform the user about ignored filters (variety, season).
    """
    if map_action.op == "highlight":
        return None
    if map_action.metric is None:
        logger.warning("fetch_map_data called without metric (op=%s)", map_action.op)
        return None

    if map_action.op == "compare":
        return _fetch_comparison(map_action)
    return _fetch_simple(map_action)


# ─── Implementation: simple query ───────────────────────────────────────


def _fetch_simple(map_action: MapAction) -> DataPayload:
    """Single SQL query grouped by region."""
    metric: Metric = map_action.metric  # type: ignore[assignment]
    level: DataLevel = "region"  # V1: always region (aggregated country would be 1 row)
    rows = _execute(map_action.filters, metric, group_by=["region"])
    areas = _rows_to_areas(rows, region_col_index=0, value_col_index=1)
    sql_formula, unit = METRIC_SQL[metric]
    _annotate_ignored_filters(map_action)
    return DataPayload(level=level, metric=metric, unit=unit, areas=areas)


def _fetch_comparison(map_action: MapAction) -> ComparisonData:
    """Two parallel queries based on the comparison axis."""
    assert map_action.comparison is not None  # guaranteed by the validator
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


# ─── SQL query building and execution ──────────────────────────────────


def _execute(filters: MapActionFilters, metric: Metric, group_by: list[str]) -> list[list[Any]]:
    """Build engine params and execute. Returns raw rows."""
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
        logger.warning("ClickHouse unavailable for map_facts: %s", exc)
        return []
    return result.get("data", [])


def _build_where(filters: MapActionFilters) -> dict[str, Any]:
    """Convert `MapActionFilters` into a dict for `engine.execute_query['filters']`.

    `variety` and `season` are intentionally ignored in V1 (the table
    `agri_stats` does not have these columns). The user is notified via
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
    """Match the crop case/accents to what is in the DB."""
    return CULTURE_NORMALIZE.get(crop.lower().strip(), crop)


# ─── rows → AreaData mapping ──────────────────────────────────────────────


def _rows_to_areas(rows: list[list[Any]], region_col_index: int, value_col_index: int) -> list[AreaData]:
    """Transform ClickHouse rows into list[AreaData] with computed rank.

    Expected row format: [region, value, rendement_kg_ha, production_t, prix_ar_kg]
    Auxiliary columns populate the `tooltip` for frontend hover.
    """
    areas: list[AreaData] = []
    for row in rows:
        db_region = row[region_col_index]
        slug = DB_REGION_TO_SLUG.get(db_region, _slugify_unknown(db_region))
        value = _safe_float(row[value_col_index])
        tooltip: dict[str, Any] = {}
        # Aux cols: indices 2, 3, 4 if present (yield, production, price)
        for i, (key, _alias, _expr) in enumerate(TOOLTIP_AUX_COLS, start=value_col_index + 1):
            if i < len(row):
                tooltip[key] = _safe_float(row[i])
        areas.append(AreaData(slug=slug, name=db_region, value=value, tooltip=tooltip))

    # Sort descending + rank (None for missing values)
    valued = [a for a in areas if a.value is not None]
    valued.sort(key=lambda a: a.value or 0, reverse=True)
    for rank, area in enumerate(valued, start=1):
        area.rank = rank
    # Keep order by descending value then nulls at the end
    nulls = [a for a in areas if a.value is None]
    return valued + nulls


def _rows_to_comparison_areas(rows: list[list[Any]]) -> list[ComparisonAreaData]:
    """Lightweight version for comparison payloads (no tooltip or name)."""
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
    """Convert to float, return None for missing or non-numeric values."""
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
    """Fallback: if a DB region is not in the mapping, naively slugify it."""
    return (
        db_value.lower()
        .replace("'", "-")
        .replace(" ", "-")
        .strip("-")
    )


def _filters_from_comparison_side(
    base: MapActionFilters, side_overrides: dict[str, Any]
) -> MapActionFilters:
    """Merge the base map_action common filters with the side overrides."""
    merged = base.model_dump()
    merged.update({k: v for k, v in side_overrides.items() if v is not None})
    return MapActionFilters.model_validate(merged)


def _annotate_ignored_filters(map_action: MapAction) -> None:
    """Add a warning to `explain.subtitle` if variety or season are used.

    V1: these filters are accepted at validation but ignored by SQL
    (the table does not have the columns). We politely inform the user.
    """
    notes: list[str] = []
    if map_action.filters.variety:
        notes.append(f"variety « {map_action.filters.variety} » not yet filterable (results cover all {map_action.filters.crop or 'crops'})")
    if map_action.filters.season:
        notes.append(f"season « {map_action.filters.season} » not yet filterable")

    if not notes:
        return

    warning = " — ".join(notes)
    if map_action.explain is None:
        # We don't create an Explain from scratch: it's up to the LLM to provide the title.
        # The warning will be lost but this is exceptional (LLM must always produce explain).
        logger.info("Ignored filters without explain to attach warning to: %s", warning)
        return

    if map_action.explain.subtitle:
        map_action.explain.subtitle = f"{map_action.explain.subtitle} — Note: {warning}"
    else:
        map_action.explain.subtitle = f"Note: {warning}"
