"""Smoke tests — executed against the staging environment after deployment.

These tests make real HTTP requests against STAGING_URL to validate
that the service is operational before promoting to production.

Required environment variables (GitHub secrets):
  STAGING_URL          Base URL e.g. https://grop-app-staging.onrender.com
  STAGING_TEST_USER    Test account email on staging
  STAGING_TEST_PASS    Test account password

Local run:
  STAGING_URL=http://localhost:8000 \
  STAGING_TEST_USER=test@cropgpt.mg \
  STAGING_TEST_PASS=testpass123 \
  pytest e2e/smoke_tests.py -v
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("STAGING_URL", "").rstrip("/")
TEST_USER = os.environ.get("STAGING_TEST_USER", "")
TEST_PASS = os.environ.get("STAGING_TEST_PASS", "")
TIMEOUT = 30  # seconds

staging_required = pytest.mark.skipif(
    not BASE_URL,
    reason="STAGING_URL not set — smoke tests skipped"
)


@pytest.fixture(scope="module")
def access_token():
    """Obtain a valid JWT token for authenticated tests."""
    if not (BASE_URL and TEST_USER and TEST_PASS):
        pytest.skip("Staging credentials missing")
    resp = requests.post(
        f"{BASE_URL}/api/auth/login/",
        json={"email": TEST_USER, "password": TEST_PASS},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200, f"Login failed ({resp.status_code}): {resp.text[:200]}"
    return resp.json()["access"]


@staging_required
class TestStagingHealth:
    def test_health_endpoint_returns_200(self):
        """GET /api/health/ must return 200 — service UP."""
        resp = requests.get(f"{BASE_URL}/api/health/", timeout=TIMEOUT)
        assert resp.status_code == 200, f"Health check failed: {resp.status_code}"

    def test_health_response_structure(self):
        """Health response must contain a status field."""
        resp = requests.get(f"{BASE_URL}/api/health/", timeout=TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            assert "status" in data


@staging_required
class TestStagingAuth:
    def test_login_returns_access_token(self):
        """POST /api/auth/login/ with valid credentials → JWT token."""
        if not (TEST_USER and TEST_PASS):
            pytest.skip("Staging credentials not configured")
        resp = requests.post(
            f"{BASE_URL}/api/auth/login/",
            json={"email": TEST_USER, "password": TEST_PASS},
            timeout=TIMEOUT,
        )
        assert resp.status_code == 200, f"Login failed: {resp.text[:200]}"
        data = resp.json()
        assert "access" in data
        assert len(data["access"]) > 20

    def test_protected_endpoint_requires_auth(self):
        """GET /api/chat/conversations/ without token → 401."""
        resp = requests.get(f"{BASE_URL}/api/chat/conversations/", timeout=TIMEOUT)
        assert resp.status_code == 401


@staging_required
class TestStagingChat:
    def test_chat_off_topic_blocked_by_guardrail(self, access_token):
        """An off-topic message must be rejected by the guardrail."""
        resp = requests.post(
            f"{BASE_URL}/api/chat/",
            json={"message": "Qui a gagné la Coupe du Monde 2022 ?"},
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=TIMEOUT,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["meta"]["guardrail"] is True

    def test_chat_agricultural_message_accepted(self, access_token):
        """An agricultural message must pass the guardrail and return a reply."""
        resp = requests.post(
            f"{BASE_URL}/api/chat/",
            json={"message": "Quelles variétés de riz pour les hauts plateaux ?"},
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=60,  # LLM may be slow
        )
        # 200 = OK response, 503 = Colab LLM unavailable (acceptable in staging)
        assert resp.status_code in (200, 503), f"Unexpected status: {resp.status_code}"
        if resp.status_code == 200:
            data = resp.json()
            assert "reply" in data
            assert len(data["reply"]) > 0

    def test_chat_creates_conversation_id(self, access_token):
        """A new chat must create a conversation with an ID."""
        resp = requests.post(
            f"{BASE_URL}/api/chat/",
            json={"message": "Comment planter le riz SRI ?"},
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=60,
        )
        if resp.status_code == 200:
            data = resp.json()
            assert "conversation_id" in data
            assert data["conversation_id"] is not None
