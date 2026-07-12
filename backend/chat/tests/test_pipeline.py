"""Unit tests for the chat pipeline (no DB required)."""
import pytest
from chat.pipeline import normalizer, ontology


class TestNormalizer:
    def test_removes_extra_spaces(self):
        result = normalizer.normalize('  bonjour   monde  ')
        assert result['text'] == 'bonjour monde'

    def test_detects_french(self):
        result = normalizer.normalize('Comment améliorer le rendement du riz ?')
        assert result['language'] == 'fr'

    def test_detects_malagasy(self):
        result = normalizer.normalize('Ahoana ny fomba fikarakarana ny tanimbary?')
        assert result['language'] == 'mg'

    def test_estimates_tokens(self):
        result = normalizer.normalize('riz culture sol engrais')
        assert result['tokens_estimate'] == 4


class TestOntology:
    def test_rejects_off_topic(self):
        normalized = {'text': 'Qui a gagné la Coupe du Monde 2022 ?', 'language': 'fr'}
        result = ontology.validate_and_enrich(normalized)
        assert result['is_valid'] is False
        assert result['rejection_reason'] is not None

    def test_accepts_rice_question(self):
        normalized = {'text': 'Comment améliorer le rendement du riz ?', 'language': 'fr'}
        result = ontology.validate_and_enrich(normalized)
        assert result['is_valid'] is True
        assert result['domain'] == 'agriculture'

    def test_enriches_yield_context(self):
        normalized = {'text': 'Quel est le rendement du riz à Madagascar ?', 'language': 'fr'}
        result = ontology.validate_and_enrich(normalized)
        assert result['is_valid'] is True
        assert 'yield_prediction' in result['context_tags']

    def test_accepts_malagasy_question(self):
        normalized = {'text': 'Ahoana ny karakarana ny vary?', 'language': 'mg'}
        result = ontology.validate_and_enrich(normalized)
        assert result['is_valid'] is True


class TestRAGFallback:
    def test_returns_empty_for_invalid(self):
        from chat.pipeline import rag
        result = rag.retrieve({'is_valid': False})
        assert result['retrieved_docs'] == []
        assert result['rag_context'] == ''

    def test_static_fallback_for_yield(self):
        from chat.pipeline import rag
        result = rag.retrieve({
            'is_valid': True,
            'enriched_text': 'rendement riz',
            'context_tags': ['yield_prediction'],
        })
        assert 'rag_context' in result
