"""
Pydantic schemas for the `map_action` contract (v1).

These models define what the LLM + rules produce and what the frontend
applies on the map. Validation is purely structural: it does NOT check
whether a region slug exists in the ontology, nor variety/crop
compatibility. These semantic validations are done in `pipeline/intent.py`.

Six supported operations:
    slice        — filters a single dimension ("regions favorable for rice")
    dice         — filters multiple dimensions ("Makalioka rice 2024")
    compare      — two side-by-side datasets ("rice vs cassava in 2024")
    drill_down   — visual focus on a region ("detail Alaotra-Mangoro")
    highlight    — highlights without filtering ("where is Itasy?")
    clear        — returns to default view ("national view")

V1 data warehouse scope (table `cropgpt.agri_stats`):
    Native metrics: yield, production, price, area (derived)
    Filterable dimensions in SQL: crop, year, regions
    Accepted but IGNORED dimensions (V1.5): variety, season
        → user receives a warning in `explain.subtitle`
    REJECTED dimensions (V2 — require DB migration):
        climate.* filters, metric=climate_match, zoom data district/commune

Seven payload blocks:
    op / filters / metric / view / data / comparison / explain
    + map_action_version (always 1 for this version)
"""
from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# ─── Stable enumerations ──────────────────────────────────────────────────

Op = Literal["slice", "dice", "compare", "drill_down", "highlight", "clear"]

# V1: no climate_match (requires separate climate table — V2)
Metric = Literal["yield", "production", "area", "price"]

# The `view.zoom_level` may request district/commune (visual focus),
# but `data.level` can only be delivered at country/region in V1.
ZoomLevel = Literal["country", "region", "district", "commune"]
DataLevel = Literal["country", "region"]

ComparisonAxis = Literal["crop", "year", "variety", "region"]

# Level hierarchy for validating data ↔ view consistency
_LEVEL_RANK = {"country": 0, "region": 1, "district": 2, "commune": 3}


# ─── Temporal bounds ────────────────────────────────────────────────────

YEAR_MIN = 2000


def _year_max() -> int:
    """Current year + 1 (allows a forecast horizon)."""
    return date.today().year + 1


# ─── Internal models (order: leaves before roots) ─────────────────────


class MapActionFilters(BaseModel):
    """OLAP cube constraints. Always present, all fields may be null.

    `variety` and `season` are accepted but ignored by the warehouse in V1
    (the `cropgpt.agri_stats` table does not have these columns). `intent.py` adds
    a warning in `explain.subtitle` when one of them is used.
    """

    model_config = ConfigDict(extra="forbid")

    crop: str | None = None
    variety: str | None = None
    year: int | None = Field(default=None, ge=YEAR_MIN)
    season: str | None = None
    regions: list[str] | None = None

    @field_validator("year")
    @classmethod
    def _year_upper_bound(cls, v: int | None) -> int | None:
        if v is not None and v > _year_max():
            raise ValueError(f"year ({v}) > {_year_max()}")
        return v

    @model_validator(mode="after")
    def _variety_implies_crop(self) -> "MapActionFilters":
        if self.variety is not None and self.crop is None:
            raise ValueError("variety defined without crop")
        return self


class MapActionView(BaseModel):
    """Zoom level and geographic focus. Always present."""

    model_config = ConfigDict(extra="forbid")

    zoom_level: ZoomLevel = "country"
    scope_region: str | None = None
    highlighted_areas: list[str] | None = None

    @model_validator(mode="after")
    def _scope_required_when_zoomed(self) -> "MapActionView":
        if self.zoom_level != "country" and not self.scope_region:
            raise ValueError(f"zoom_level={self.zoom_level} requires scope_region")
        return self


class AreaData(BaseModel):
    """An area (region, district, commune) with its value."""

    model_config = ConfigDict(extra="forbid")

    slug: str
    name: str
    value: float | None = None
    rank: int | None = Field(default=None, ge=1)
    tooltip: dict[str, Any] = Field(default_factory=dict)


class DataPayload(BaseModel):
    """Values to paint on the map — produced by the warehouse, never by the LLM.

    In V1, `level` is limited to country/region (the `agri_stats` table has
    no district or commune column). The `view.zoom_level` may be
    finer (visual drill_down); consistency is checked at the root
    level of MapAction.
    """

    model_config = ConfigDict(extra="forbid")

    level: DataLevel
    metric: Metric
    unit: str
    areas: list[AreaData]


class ComparisonSide(BaseModel):
    """One side of a comparison (left or right)."""

    model_config = ConfigDict(extra="forbid")

    label: str
    filters: dict[str, Any]


class ComparisonAreaData(BaseModel):
    """Lightweight version of AreaData for comparison payloads."""

    model_config = ConfigDict(extra="forbid")

    slug: str
    value: float | None = None
    rank: int | None = Field(default=None, ge=1)


class ComparisonData(BaseModel):
    """Parallel data for both sides to compare."""

    model_config = ConfigDict(extra="forbid")

    metric: Metric
    unit: str
    left: list[ComparisonAreaData]
    right: list[ComparisonAreaData]


class Comparison(BaseModel):
    """Special block for op=compare only."""

    model_config = ConfigDict(extra="forbid")

    axis: ComparisonAxis
    left: ComparisonSide
    right: ComparisonSide
    data: ComparisonData | None = None


class Explain(BaseModel):
    """Short text for the map legend and header."""

    model_config = ConfigDict(extra="forbid")

    title: str
    subtitle: str | None = None


# ─── Root model ─────────────────────────────────────────────────────────


class MapAction(BaseModel):
    """Full contract between the intent pipeline and the map (v1)."""

    model_config = ConfigDict(extra="forbid")

    map_action_version: Literal[1] = 1
    op: Op
    filters: MapActionFilters = Field(default_factory=MapActionFilters)
    metric: Metric | None = None
    view: MapActionView = Field(default_factory=MapActionView)
    data: DataPayload | None = None
    comparison: Comparison | None = None
    explain: Explain | None = None

    @model_validator(mode="after")
    def _compare_consistency(self) -> "MapAction":
        if self.op == "compare":
            if self.comparison is None:
                raise ValueError("op=compare requires the comparison block")
            if self.data is not None:
                raise ValueError("op=compare forbids the data block (data is in comparison.data)")
        else:
            if self.comparison is not None:
                raise ValueError(f"op={self.op} forbids the comparison block")
        return self

    @model_validator(mode="after")
    def _data_level_matches_view(self) -> "MapAction":
        # data.level must be at most as fine as view.zoom_level
        # (data can be coarser — V1 serves region for view=district: visual drill_down)
        if self.data is not None and _LEVEL_RANK[self.data.level] > _LEVEL_RANK[self.view.zoom_level]:
            raise ValueError(
                f"data.level ({self.data.level}) finer than view.zoom_level ({self.view.zoom_level})"
            )
        return self

    @model_validator(mode="after")
    def _data_metric_matches_root(self) -> "MapAction":
        if self.data is not None and self.metric is not None and self.data.metric != self.metric:
            raise ValueError(
                f"data.metric ({self.data.metric}) ≠ root metric ({self.metric})"
            )
        return self
