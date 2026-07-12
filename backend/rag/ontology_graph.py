"""
CropGPT ontology loader — rdflib singleton.

Provides:
  - get_domain_keywords()      → dict {lang: [labels]}  for domain validation
  - get_class_tag(label)       → context_tag  (varieties, water_management, …)
  - get_related_concepts(label)→ list of related labels  (for FAISS expansion)
  - get_pedigree(label)        → dict pedigree  (parents, generation, code)
  - get_facts_block(label)     → str  ready to inject into the LLM context
"""

import logging
from pathlib import Path
from functools import lru_cache

logger = logging.getLogger(__name__)

# ── Namespaces ─────────────────────────────────────────────────────────────────
AGRI = "http://example.org/agri/"
GEN  = "http://example.org/gen/"
RDFS = "http://www.w3.org/2000/01/rdf-schema#"
SKOS = "http://www.w3.org/2004/02/skos/core#"

# ── OWL class → RAG context_tag mapping ───────────────────────────────────────
_CLASS_TO_TAG = {
    f"{AGRI}Rice":            "varieties",
    f"{AGRI}CropVariety":     "varieties",
    f"{AGRI}Cereal":          "varieties",
    f"{AGRI}Legume":          "varieties",
    f"{AGRI}Fruit":           "varieties",
    f"{AGRI}RootCrop":        "varieties",
    f"{AGRI}CashCrop":        "varieties",
    f"{AGRI}Irrigation":      "water_management",
    f"{AGRI}WaterManagement": "water_management",
    f"{AGRI}SoilManagement":  "soil_health",
    f"{AGRI}Fertilization":   "soil_health",
    f"{AGRI}SoilType":        "soil_health",
    f"{AGRI}PestManagement":  "pest_disease",
    f"{AGRI}Disease":         "pest_disease",
    f"{AGRI}Pest":            "pest_disease",
    f"{AGRI}Yield":           "yield_prediction",
    f"{AGRI}Production":      "yield_prediction",
    f"{AGRI}Harvesting":      "yield_prediction",
    f"{AGRI}Climate":         "climate",
    f"{AGRI}Season":          "climate",
    f"{AGRI}Market":          "market",
    f"{AGRI}Price":           "market",
    f"{GEN}Hybrid":           "varieties",
    f"{GEN}Cultivar":         "varieties",
    f"{GEN}Variety":          "varieties",
}


# ── Singleton ──────────────────────────────────────────────────────────────────

_graph = None

def _load_graph():
    """Load all .ttl files from the ontology/ directory into a single rdflib Graph."""
    global _graph
    if _graph is not None:
        return _graph

    try:
        from rdflib import Graph, Namespace
        g = Graph()

        ontology_dir = Path(__file__).resolve().parent.parent / "ontology"
        ttl_files = sorted(ontology_dir.glob("*.ttl"))

        if not ttl_files:
            logger.warning("No .ttl files found in %s", ontology_dir)
            _graph = g
            return _graph

        for ttl in ttl_files:
            try:
                g.parse(str(ttl), format="turtle")
                logger.debug("Ontology loaded: %s", ttl.name)
            except Exception as e:
                logger.warning("Error loading %s: %s", ttl.name, e)

        logger.info("Ontology graph: %d triples from %d files", len(g), len(ttl_files))
        _graph = g

    except ImportError:
        logger.error("rdflib not installed — pip install rdflib")
        _graph = None

    return _graph


def get_graph():
    return _load_graph()


# ── Utility queries ───────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_domain_keywords() -> dict:
    """
    Return all agricultural labels from the graph, by language.
    Format: {"fr": [...], "en": [...], "mg": [...]}
    Replaces the hardcoded AGRICULTURAL_KEYWORDS dict in ontology.py.
    """
    g = get_graph()
    result = {"fr": [], "en": [], "mg": []}

    if g is None:
        return result

    from rdflib import URIRef, Literal
    from rdflib.namespace import RDFS as RDFS_NS, SKOS as SKOS_NS

    for s, p, o in g:
        if p in (RDFS_NS.label, SKOS_NS.prefLabel, SKOS_NS.altLabel):
            if isinstance(o, Literal) and o.language in result:
                txt = str(o).strip().lower()
                if txt and txt not in result[o.language]:
                    result[o.language].append(txt)

    logger.debug(
        "Ontology keywords: fr=%d en=%d mg=%d",
        len(result["fr"]), len(result["en"]), len(result["mg"])
    )
    return result


def _find_individual(label: str):
    """
    Find an individual (URI) in the graph whose label matches
    the given string. Two passes:
    1. Exact match (case-insensitive)
    2. Partial match: graph label starts with the search term
    """
    g = get_graph()
    if g is None:
        return None

    from rdflib.namespace import RDFS as RDFS_NS, SKOS as SKOS_NS
    from rdflib import Literal

    label_lower = label.strip().lower()
    partial_match = None

    for s, p, o in g:
        if p in (RDFS_NS.label, SKOS_NS.prefLabel) and isinstance(o, Literal):
            graph_label = str(o).strip().lower()
            # Pass 1: exact
            if graph_label == label_lower:
                return s
            # Pass 2: graph label starts with the search term
            if partial_match is None and graph_label.startswith(label_lower + ' '):
                partial_match = s

    return partial_match


def get_class_tag(label: str) -> str | None:
    """
    Return the RAG context_tag for the named entity `label`.
    E.g.: "Makalioka" → "varieties", "irrigation" → "water_management"
    """
    g = get_graph()
    if g is None:
        return None

    from rdflib.namespace import RDF as RDF_NS

    uri = _find_individual(label)
    if uri is None:
        return None

    for _, _, cls in g.triples((uri, RDF_NS.type, None)):
        tag = _CLASS_TO_TAG.get(str(cls))
        if tag:
            return tag
    return None


def get_related_concepts(label: str) -> list[str]:
    """
    Return labels of concepts related to `label` in the graph:
    - parent classes (rdfs:subClassOf)
    - individuals of the same type
    - associated practices (gen:isHybridOf siblings)
    Used to enrich the FAISS query.
    """
    g = get_graph()
    if g is None:
        return []

    from rdflib.namespace import RDF as RDF_NS, RDFS as RDFS_NS, SKOS as SKOS_NS
    from rdflib import Literal, URIRef

    uri = _find_individual(label)
    if uri is None:
        return []

    related_uris = set()

    # Direct types of the individual (not super-classes to avoid climbing up)
    direct_types = set()
    for _, _, cls in g.triples((uri, RDF_NS.type, None)):
        # Skip very generic classes (owl:Thing, owl:NamedIndividual)
        cls_str = str(cls)
        if 'owl#' in cls_str or 'rdf-syntax' in cls_str:
            continue
        direct_types.add(cls)
        related_uris.add(cls)

    # Hybrid parents
    is_hybrid_of = URIRef(f"{GEN}isHybridOf")
    for _, _, parent in g.triples((uri, is_hybrid_of, None)):
        related_uris.add(parent)

    # Individuals of the same direct type only (not super-classes)
    for cls in direct_types:
        for sibling, _, _ in g.triples((None, RDF_NS.type, cls)):
            if sibling != uri:
                related_uris.add(sibling)

    # Collect labels
    labels = []
    for u in related_uris:
        for _, p, o in g.triples((u, None, None)):
            if p in (RDFS_NS.label, SKOS_NS.prefLabel) and isinstance(o, Literal):
                txt = str(o).strip()
                if txt and txt.lower() != label.lower() and txt not in labels:
                    labels.append(txt)

    return labels[:20]  # reasonable limit


def get_pedigree(label: str) -> dict:
    """
    Return pedigree information for a variety or breed.
    {
      "found": bool,
      "label": str,
      "parents": [str],
      "generation": int | None,
      "pedigree_code": str | None,
      "registration_date": str | None,
      "bred_by": str | None,
      "is_hybrid": bool,
    }
    """
    g = get_graph()
    empty = {"found": False, "label": label, "parents": [], "generation": None,
             "pedigree_code": None, "registration_date": None, "bred_by": None, "is_hybrid": False}

    if g is None:
        return empty

    from rdflib.namespace import RDFS as RDFS_NS, SKOS as SKOS_NS
    from rdflib import Literal, URIRef

    uri = _find_individual(label)
    if uri is None:
        return empty

    GEN_NS = f"{GEN}"

    result = {**empty, "found": True}

    # Parents (gen:isHybridOf)
    is_hybrid_prop = URIRef(f"{GEN}isHybridOf")
    for _, _, parent_uri in g.triples((uri, is_hybrid_prop, None)):
        for _, _, parent_label in g.triples((parent_uri, RDFS_NS.label, None)):
            if isinstance(parent_label, Literal):
                result["parents"].append(str(parent_label))
                break

    result["is_hybrid"] = len(result["parents"]) > 0

    # Generation
    gen_prop = URIRef(f"{GEN}hasGenerationNumber")
    for _, _, val in g.triples((uri, gen_prop, None)):
        try:
            result["generation"] = int(val)
        except (ValueError, TypeError):
            pass

    # Pedigree code
    code_prop = URIRef(f"{GEN}hasPedigreeCode")
    for _, _, val in g.triples((uri, code_prop, None)):
        result["pedigree_code"] = str(val)

    # Registration date
    date_prop = URIRef(f"{GEN}hasRegistrationDate")
    for _, _, val in g.triples((uri, date_prop, None)):
        result["registration_date"] = str(val)

    # Bred by
    bred_prop = URIRef(f"{GEN}bredBy")
    for _, _, agent_uri in g.triples((uri, bred_prop, None)):
        # Extract name from URI, e.g.: .../agents/FOFIFA → FOFIFA
        result["bred_by"] = str(agent_uri).split("/")[-1]

    return result


def get_facts_block(label: str) -> str:
    """
    Return a structured text block ready to be injected into the LLM context.
    Combines pedigree + class + definition.
    Returns "" if nothing found.
    """
    g = get_graph()
    if g is None:
        return ""

    from rdflib.namespace import RDFS as RDFS_NS, SKOS as SKOS_NS, RDF as RDF_NS
    from rdflib import Literal

    uri = _find_individual(label)
    if uri is None:
        return ""

    lines = [f"[Ontological facts — {label}]"]

    # Definition
    for _, p, o in g.triples((uri, SKOS_NS.definition, None)):
        if isinstance(o, Literal) and o.language == "fr":
            lines.append(f"Definition: {o}")
            break

    # Classes
    class_labels = []
    for _, _, cls in g.triples((uri, RDF_NS.type, None)):
        for _, _, cl in g.triples((cls, RDFS_NS.label, None)):
            if isinstance(cl, Literal) and cl.language == "fr":
                class_labels.append(str(cl))
    if class_labels:
        lines.append(f"Category: {', '.join(class_labels)}")

    # Pedigree
    pedigree = get_pedigree(label)
    if pedigree["found"]:
        if pedigree["parents"]:
            lines.append(f"Parents: {', '.join(pedigree['parents'])}")
        if pedigree["generation"] is not None:
            lines.append(f"Generation: F{pedigree['generation']}")
        if pedigree["pedigree_code"]:
            lines.append(f"Pedigree code: {pedigree['pedigree_code']}")
        if pedigree["registration_date"]:
            lines.append(f"Registration: {pedigree['registration_date']}")
        if pedigree["bred_by"]:
            lines.append(f"Bred by: {pedigree['bred_by']}")

    # Related concepts
    related = get_related_concepts(label)
    if related:
        lines.append(f"Related concepts: {', '.join(related[:5])}")

    return "\n".join(lines) if len(lines) > 1 else ""
