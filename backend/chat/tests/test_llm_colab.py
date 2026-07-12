"""Tests for the LLM hosted on Google Colab.

These tests are automatically SKIPPED if COLAB_LLM_URL is not set
(e.g. in CI without a configured secret). They require that the Colab
notebook is active and the ngrok URL is up to date in .env.
"""
import os
import pytest

COLAB_URL = os.environ.get("COLAB_LLM_URL", "").rstrip("/")
colab_required = pytest.mark.skipif(
    not COLAB_URL,
    reason="COLAB_LLM_URL not set — Colab notebook inactive or secret missing"
)


@colab_required
class TestColabLLMHealth:
    def test_health_endpoint_returns_ok(self):
        """GET /health must return status=ok and the CUDA device."""
        import requests
        resp = requests.get(f"{COLAB_URL}/health", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get('status') == 'ok'
        assert 'device' in data

    def test_health_response_has_model_info(self):
        """The health check must report the model path."""
        import requests
        resp = requests.get(f"{COLAB_URL}/health", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert 'model_path' in data


@colab_required
class TestColabLLMGenerate:
    def test_blocking_generate_returns_text(self):
        """_call_colab_blocking must return non-empty text."""
        import django
        if not os.environ.get('DJANGO_SETTINGS_MODULE'):
            os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.development'
            django.setup()
        from chat.pipeline.llm import _call_colab_blocking
        result = _call_colab_blocking("Bonjour, donne-moi un conseil pour le riz.")
        assert isinstance(result, str)
        assert len(result) > 10, f"Response too short: '{result}'"

    def test_stream_yields_at_least_one_token(self):
        """stream_generate must yield at least one token before done=True."""
        import django
        if not os.environ.get('DJANGO_SETTINGS_MODULE'):
            os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.development'
            django.setup()
        from chat.pipeline.llm import stream_generate
        tokens = []
        for chunk in stream_generate("Quel est le meilleur engrais pour le riz ?"):
            if chunk.get('token'):
                tokens.append(chunk['token'])
            if chunk.get('done'):
                break
        assert len(tokens) > 0, "No token received from Colab stream"

    def test_generate_full_pipeline(self):
        """generate() must return a complete dict with non-empty reply."""
        import django
        if not os.environ.get('DJANGO_SETTINGS_MODULE'):
            os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.development'
            django.setup()
        from chat.pipeline.llm import generate
        result = generate({
            'enriched_text': 'Quelles variétés de riz pour les hauts plateaux ?',
            'rag_context': '',
            'confidence_level': 'none',
        })
        assert 'reply' in result
        assert len(result['reply']) > 10
        assert 'latency_ms' in result
        assert result['latency_ms'] > 0

    def test_generate_rejects_without_colab_url(self, monkeypatch):
        """Without COLAB_LLM_URL, generate() must return a clean error message."""
        import django
        if not os.environ.get('DJANGO_SETTINGS_MODULE'):
            os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.development'
            django.setup()
        import chat.pipeline.llm as llm_module
        monkeypatch.setattr(llm_module, 'COLAB_LLM_URL', '')
        result = llm_module.generate({
            'enriched_text': 'test',
            'rag_context': '',
            'confidence_level': 'none',
        })
        assert 'reply' in result
        assert 'error' in result or 'injoignable' in result['reply'].lower() or 'défini' in result['reply'].lower()
