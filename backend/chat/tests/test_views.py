import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from unittest.mock import patch

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(email='test@cropgpt.mg', name='Tester', password='pass1234')


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestChatView:
    @patch('chat.pipeline.llm.generate', return_value={
        'reply': 'Rice grows well with SRI.',
        'thinking': '', 'input_tokens': 10, 'output_tokens': 20,
        'latency_ms': 500, 'provider': 'colab-ngrok', 'model': 'colab-llm',
    })
    def test_chat_creates_conversation(self, mock_llm, auth_client):
        response = auth_client.post('/api/chat/', {'message': 'Comment cultiver le riz ?'})
        assert response.status_code == 200
        data = response.json()
        assert 'conversation_id' in data
        assert 'reply' in data
        assert data['reply'] == 'Rice grows well with SRI.'

    def test_chat_requires_auth(self):
        client = APIClient()
        response = client.post('/api/chat/', {'message': 'Bonjour'})
        assert response.status_code == 401

    @patch('chat.pipeline.llm.generate', return_value={
        'reply': 'Response.', 'thinking': '', 'input_tokens': 5, 'output_tokens': 5,
        'latency_ms': 100, 'provider': 'colab-ngrok', 'model': 'colab-llm',
    })
    def test_off_topic_guardrail(self, mock_llm, auth_client):
        response = auth_client.post('/api/chat/', {'message': 'Qui est Lebron James ?'})
        assert response.status_code == 200
        data = response.json()
        assert data['meta']['guardrail'] is True
        mock_llm.assert_not_called()
