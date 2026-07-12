"""Pytest tests for the RDF ontology — CI version of test_ontology.py.

These tests verify the RDF graph, domain keywords, class→tag mapping,
and the rice variety pedigree system.
"""
import pytest


class TestOntologyGraph:
    def test_graph_loads(self):
        """The RDF graph must load and contain more than 1000 triples."""
        from rag.ontology_graph import get_graph
        g = get_graph()
        assert g is not None
        assert len(g) > 1000, f"Only {len(g)} triples — incomplete graph?"

    def test_domain_keywords_french_present(self):
        """French keywords must be present and sufficiently numerous."""
        from rag.ontology_graph import get_domain_keywords
        kw = get_domain_keywords()
        assert 'fr' in kw
        assert len(kw['fr']) > 50, f"Only {len(kw['fr'])} FR keywords"

    def test_domain_keywords_malagasy_present(self):
        """Malagasy keywords must be present."""
        from rag.ontology_graph import get_domain_keywords
        kw = get_domain_keywords()
        assert 'mg' in kw
        assert len(kw['mg']) > 20, f"Only {len(kw['mg'])} MG keywords"

    def test_domain_keywords_english_present(self):
        """English keywords must be present."""
        from rag.ontology_graph import get_domain_keywords
        kw = get_domain_keywords()
        assert 'en' in kw
        assert len(kw['en']) > 50, f"Only {len(kw['en'])} EN keywords"

    @pytest.mark.parametrize("word", ["riz", "irrigation", "sol", "variété"])
    def test_expected_french_keywords(self, word):
        """Fundamental agricultural words must appear in FR keywords."""
        from rag.ontology_graph import get_domain_keywords
        kw = get_domain_keywords()
        found = any(word in label for label in kw.get('fr', []))
        assert found, f"Word '{word}' missing from FR keywords"

    @pytest.mark.parametrize("label,expected_tag", [
        ("Bemasoha Rice Hybrid", "varieties"),
        ("Fiaramanitra Rice Hybrid", "varieties"),
        ("Makalioka Rice Variety", "varieties"),
    ])
    def test_class_tag_mapping(self, label, expected_tag):
        """Varietal classes must be mapped to the 'varieties' tag."""
        from rag.ontology_graph import get_class_tag
        tag = get_class_tag(label)
        assert tag == expected_tag, f"'{label}' → tag={tag}, expected {expected_tag}"

    def test_pedigree_makalioka_found(self):
        """The Makalioka variety must be found in the graph."""
        from rag.ontology_graph import get_pedigree
        p = get_pedigree("Makalioka Rice Variety")
        assert p['found'] is True
        assert bool(p['pedigree_code'])

    def test_pedigree_bemasoha_is_hybrid_f1(self):
        """Bemasoha must be an F1 hybrid with 2 parents bred by FOFIFA."""
        from rag.ontology_graph import get_pedigree
        p = get_pedigree("Bemasoha Rice Hybrid")
        assert p['is_hybrid'] is True
        assert len(p['parents']) == 2, f"Expected 2 parents, got {len(p['parents'])}"
        assert p['generation'] == 1, f"Expected F1, got F{p['generation']}"
        assert p['bred_by'] == 'FOFIFA'

    def test_pedigree_fiaramanitra_is_f2(self):
        """Fiaramanitra must be an F2 hybrid."""
        from rag.ontology_graph import get_pedigree
        p = get_pedigree("Fiaramanitra Rice Hybrid")
        assert p['generation'] == 2, f"Expected F2, got F{p['generation']}"

    def test_pedigree_unknown_entity_returns_not_found(self):
        """An unknown entity must return found=False without raising an exception."""
        from rag.ontology_graph import get_pedigree
        p = get_pedigree("VariétéInexistante123")
        assert p['found'] is False

    def test_related_concepts_not_empty(self):
        """get_related_concepts must return concepts for a known variety."""
        from rag.ontology_graph import get_related_concepts
        related = get_related_concepts("Makalioka Rice Variety")
        assert len(related) > 0, "No related concepts found for Makalioka"

    def test_facts_block_contains_fofifa(self):
        """The facts block for Bemasoha must mention FOFIFA and the parents."""
        from rag.ontology_graph import get_facts_block
        facts = get_facts_block("Bemasoha Rice Hybrid")
        assert len(facts) > 50
        assert 'Parents' in facts
        assert 'FOFIFA' in facts
        assert 'pedigree' in facts.lower() or 'Pedigree' in facts
