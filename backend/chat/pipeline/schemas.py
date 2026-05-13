"""
Schémas Pydantic du contrat `map_action` (v1).

Ces modèles définissent ce que le LLM + règles produisent et ce que le front
applique sur la carte. La validation est purement structurelle : elle ne vérifie
PAS l'existence d'un slug région dans l'ontologie, ni la compatibilité variété/
culture. Ces validations sémantiques se font dans `pipeline/intent.py`.

Six opérations supportées :
    slice        — filtre une seule dimension (« régions favorables au riz »)
    dice         — filtre plusieurs dimensions (« riz Makalioka 2024 »)
    compare      — deux jeux côte à côte (« riz vs manioc en 2024 »)
    drill_down   — focus visuel sur une région (« détaille Alaotra-Mangoro »)
    highlight    — met en avant sans filtrer (« où est Itasy ? »)
    clear        — retour à la vue par défaut (« vue nationale »)

Périmètre V1 du data warehouse (table `cropgpt.agri_stats`) :
    Métriques natives : yield, production, price, area (dérivée)
    Dimensions filtrables en SQL : crop, year, regions
    Dimensions acceptées mais IGNORÉES (V1.5) : variety, season
        → l'utilisateur reçoit un warning dans `explain.subtitle`
    Dimensions REJETÉES (V2 — nécessitent migration DB) :
        climate.* filters, metric=climate_match, zoom data district/commune

Sept blocs de payload :
    op / filters / metric / view / data / comparison / explain
    + map_action_version (toujours 1 pour cette version)
"""
from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# ─── Énumérations stables ──────────────────────────────────────────────────

Op = Literal["slice", "dice", "compare", "drill_down", "highlight", "clear"]

# V1 : pas de climate_match (nécessite table climat séparée — V2)
Metric = Literal["yield", "production", "area", "price"]

# Le `view.zoom_level` peut demander district/commune (focus visuel),
# mais les `data.level` ne peuvent être délivrées qu'à country/region en V1.
ZoomLevel = Literal["country", "region", "district", "commune"]
DataLevel = Literal["country", "region"]

ComparisonAxis = Literal["crop", "year", "variety", "region"]

# Hiérarchie des niveaux pour valider la cohérence data ↔ view
_LEVEL_RANK = {"country": 0, "region": 1, "district": 2, "commune": 3}


# ─── Bornes temporelles ────────────────────────────────────────────────────

YEAR_MIN = 2000


def _year_max() -> int:
    """Année courante + 1 (autorise un horizon de forecast)."""
    return date.today().year + 1


# ─── Modèles internes (ordre : feuilles avant racines) ─────────────────────


class MapActionFilters(BaseModel):
    """Contraintes du cube OLAP. Toujours présent, peut avoir tous champs null.

    `variety` et `season` sont acceptés mais ignorés par le warehouse en V1
    (la table `cropgpt.agri_stats` n'a pas ces colonnes). `intent.py` ajoute
    un warning dans `explain.subtitle` quand l'un d'eux est utilisé.
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
            raise ValueError("variety défini sans crop")
        return self


class MapActionView(BaseModel):
    """Niveau de zoom et focus géographique. Toujours présent."""

    model_config = ConfigDict(extra="forbid")

    zoom_level: ZoomLevel = "country"
    scope_region: str | None = None
    highlighted_areas: list[str] | None = None

    @model_validator(mode="after")
    def _scope_required_when_zoomed(self) -> "MapActionView":
        if self.zoom_level != "country" and not self.scope_region:
            raise ValueError(f"zoom_level={self.zoom_level} requiert scope_region")
        return self


class AreaData(BaseModel):
    """Une zone (région, district, commune) avec sa valeur."""

    model_config = ConfigDict(extra="forbid")

    slug: str
    name: str
    value: float | None = None
    rank: int | None = Field(default=None, ge=1)
    tooltip: dict[str, Any] = Field(default_factory=dict)


class DataPayload(BaseModel):
    """Valeurs à peindre sur la carte — produites par le warehouse, jamais par le LLM.

    En V1, `level` est limité à country/region (la table `agri_stats` n'a
    pas de colonne district ou commune). Le `view.zoom_level` peut être
    plus fin (drill_down visuel) ; la cohérence est vérifiée au niveau
    racine de MapAction.
    """

    model_config = ConfigDict(extra="forbid")

    level: DataLevel
    metric: Metric
    unit: str
    areas: list[AreaData]


class ComparisonSide(BaseModel):
    """Un côté d'une comparaison (gauche ou droite)."""

    model_config = ConfigDict(extra="forbid")

    label: str
    filters: dict[str, Any]


class ComparisonAreaData(BaseModel):
    """Version allégée de AreaData pour les payloads de comparaison."""

    model_config = ConfigDict(extra="forbid")

    slug: str
    value: float | None = None
    rank: int | None = Field(default=None, ge=1)


class ComparisonData(BaseModel):
    """Données parallèles des deux côtés à comparer."""

    model_config = ConfigDict(extra="forbid")

    metric: Metric
    unit: str
    left: list[ComparisonAreaData]
    right: list[ComparisonAreaData]


class Comparison(BaseModel):
    """Bloc spécial pour op=compare uniquement."""

    model_config = ConfigDict(extra="forbid")

    axis: ComparisonAxis
    left: ComparisonSide
    right: ComparisonSide
    data: ComparisonData | None = None


class Explain(BaseModel):
    """Texte court pour la légende et l'en-tête de la carte."""

    model_config = ConfigDict(extra="forbid")

    title: str
    subtitle: str | None = None


# ─── Modèle racine ─────────────────────────────────────────────────────────


class MapAction(BaseModel):
    """Contrat complet entre le pipeline d'intention et la carte (v1)."""

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
                raise ValueError("op=compare exige le bloc comparison")
            if self.data is not None:
                raise ValueError("op=compare interdit le bloc data (les data sont dans comparison.data)")
        else:
            if self.comparison is not None:
                raise ValueError(f"op={self.op} interdit le bloc comparison")
        return self

    @model_validator(mode="after")
    def _data_level_matches_view(self) -> "MapAction":
        # data.level doit être au plus aussi fin que view.zoom_level
        # (data peut être plus grossier — V1 sert region pour un view=district : drill_down visuel)
        if self.data is not None and _LEVEL_RANK[self.data.level] > _LEVEL_RANK[self.view.zoom_level]:
            raise ValueError(
                f"data.level ({self.data.level}) plus fin que view.zoom_level ({self.view.zoom_level})"
            )
        return self

    @model_validator(mode="after")
    def _data_metric_matches_root(self) -> "MapAction":
        if self.data is not None and self.metric is not None and self.data.metric != self.metric:
            raise ValueError(
                f"data.metric ({self.data.metric}) ≠ metric racine ({self.metric})"
            )
        return self
