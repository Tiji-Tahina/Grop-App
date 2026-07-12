"""Tests for the RAG pipeline (Retrieval-Augmented Generation).

These tests verify the behavior of retrieve() in nominal and edge cases,
independently of FAISS availability.
"""
import pytest


class TestRAGRetrieve:
    def test_returns_empty_for_invalid_domain(self):
        """An off-domain query must return an empty result."""
        from chat.pipeline import rag
        result = rag.retrieve({'is_valid': False})
        assert result['retrieved_docs'] == []
        assert result['rag_context'] == ''
        assert result['confidence_level'] == 'none'
        assert result['has_data'] is False

    def test_returns_data_for_valid_rice_query(self):
        """A valid rice query must return context."""
        from chat.pipeline import rag
        result = rag.retrieve({
            'is_valid': True,
            'enriched_text': 'Comment améliorer le rendement du riz à Madagascar ?',
            'context_tags': ['yield_prediction'],
            'matched_keywords': ['riz', 'rendement'],
            'ontology_facts': '',
        })
        assert result['has_data'] is True
        assert len(result['rag_context']) > 0
        assert result['confidence_level'] in ('high', 'medium', 'low')

    def test_confidence_level_values_are_valid(self):
        """Confidence level must always be one of the 4 accepted values."""
        from chat.pipeline import rag
        valid_levels = {'high', 'medium', 'low', 'none'}
        for tags in [[], ['yield_prediction'], ['varieties'], ['pest_disease']]:
            result = rag.retrieve({
                'is_valid': True,
                'enriched_text': 'riz sol culture',
                'context_tags': tags,
                'matched_keywords': [],
                'ontology_facts': '',
            })
            assert result['confidence_level'] in valid_levels

    def test_static_fallback_yields_prediction(self):
        """Tag yield_prediction → static yield data."""
        from chat.pipeline import rag
        result = rag.retrieve({
            'is_valid': True,
            'enriched_text': 'rendement riz',
            'context_tags': ['yield_prediction'],
            'matched_keywords': [],
            'ontology_facts': '',
        })
        assert result['has_data'] is True
        assert 't/ha' in result['rag_context'] or 'rendement' in result['rag_context'].lower()

    def test_static_fallback_varieties(self):
        """Tag varieties → FOFIFA variety data."""
        from chat.pipeline import rag
        result = rag.retrieve({
            'is_valid': True,
            'enriched_text': 'variétés riz Madagascar',
            'context_tags': ['varieties'],
            'matched_keywords': [],
            'ontology_facts': '',
        })
        assert result['has_data'] is True
        assert 'FOFIFA' in result['rag_context'] or 'Makalioka' in result['rag_context']

    def test_result_has_required_keys(self):
        """Result must always contain the keys expected by views.py."""
        from chat.pipeline import rag
        required_keys = {'retrieved_docs', 'rag_context', 'confidence_level', 'has_data'}
        result = rag.retrieve({
            'is_valid': True,
            'enriched_text': 'maladies riz',
            'context_tags': ['pest_disease'],
            'matched_keywords': [],
            'ontology_facts': '',
        })
        assert required_keys.issubset(result.keys())

    def test_empty_context_tags_returns_general_data(self):
        """Without specific tags → general Malagasy rice cultivation data."""
        from chat.pipeline import rag
        result = rag.retrieve({
            'is_valid': True,
            'enriched_text': 'agriculture Madagascar',
            'context_tags': [],
            'matched_keywords': [],
            'ontology_facts': '',
        })
        assert result['has_data'] is True

    def test_ontology_facts_elevate_confidence(self):
        """Presence of ontology facts must yield confidence=high."""
        from chat.pipeline import rag
        result = rag.retrieve({
            'is_valid': True,
            'enriched_text': 'Bemasoha Rice Hybrid rendement',
            'context_tags': ['varieties'],
            'matched_keywords': ['Bemasoha'],
            'ontology_facts': 'Pedigree : Bemasoha, parents : FOFIFA 154 × IR64, bred_by : FOFIFA',
        })
        assert result['has_data'] is True
        assert result['confidence_level'] == 'high'
